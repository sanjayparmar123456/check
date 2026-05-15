import { prisma } from "../lib/db.js";
import { safeDbQuery } from "../lib/safeDb.js";
import { pincodeFallback, type AreaStats } from "../data/pincodeFallback.js";
import {
  geocodePincode,
  placesAutocomplete,
  validateAddressStructured,
} from "../lib/googleMaps.js";
import { runAssistLlm } from "../lib/openaiAssist.js";

export type LiveAssistInput = {
  pincode: string;
  area: string;
  roadSociety: string;
  landmark: string;
  houseNumber: string;
  /** Optional: what the customer claimed as city (for mismatch alerts). */
  statedCity?: string;
  activeField: "pincode" | "area" | "road" | "landmark" | "house" | "none";
};

export type LiveAssistResult = {
  pincodeMatch: boolean | null;
  detectedCity: string | null;
  detectedState: string | null;
  serviceable: boolean;
  possibleAreas: string[];
  autocompleteSuggestions: string[];
  areaMatch: boolean | null;
  landmarkMatch: boolean | null;
  addressCompleteness: number;
  deliveryChance: number | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  suggestedNextQuestion: string;
  riskMessages: string[];
  googleValidation: {
    verdict: string;
    formattedAddress?: string;
    messages: string[];
  } | null;
};

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function areaKey(pincode: string, area: string) {
  return `${pincode}|${norm(area)}`;
}

function fuzzyPick(haystack: string[], needle: string, limit: number) {
  const n = norm(needle);
  if (!n) return haystack.slice(0, limit);
  const scored = haystack
    .map((h) => ({ h, s: norm(h) }))
    .filter(({ s }) => s.includes(n) || n.split(" ").every((w) => w.length > 1 && s.includes(w)))
    .map(({ h }) => h);
  return scored.slice(0, limit);
}

function defaultNextQuestion(input: LiveAssistInput): string {
  const p = input.pincode.replace(/\D/g, "");
  if (p.length !== 6) return "Sir pincode 6 digit me confirm kijiye.";
  if (!input.area.trim()) return "Sir area ya locality ka naam bataiye.";
  if (!input.roadSociety.trim()) return "Sir society ya road ka naam bataiye.";
  if (!input.landmark.trim()) return "Sir koi famous nearby landmark bataiye.";
  if (!input.houseNumber.trim()) return "Sir flat / house number bataiye.";
  return "Address almost complete — customer se ek baar poora repeat karwa lijiye.";
}

function blendDeliveryFromRate(rate: number | null): number {
  if (rate == null) return 88;
  return Math.round(rate * 0.85 + 12);
}

export async function buildLiveAssist(input: LiveAssistInput): Promise<LiveAssistResult> {
  const pin = input.pincode.replace(/\D/g, "");
  const pincodeOk = pin.length === 6;

  const fb = pincodeFallback[pin];
  const geo = pincodeOk ? await geocodePincode(pin) : null;

  const detectedCity = fb?.city ?? geo?.city ?? null;
  const detectedState = fb?.state ?? geo?.state ?? null;
  const serviceable = fb?.serviceable ?? true;

  const dbLocals = pincodeOk
    ? await safeDbQuery(
        () =>
          prisma.pincodeLocality.findMany({
            where: { pincode: pin },
            orderBy: { sortOrder: "asc" },
          }),
        []
      )
    : [];

  const baseAreas = Array.from(
    new Set([...(fb?.areas ?? []), ...dbLocals.map((l) => l.locality)])
  );

  let possibleAreas = baseAreas;
  if (input.activeField === "pincode" && pincodeOk) {
    possibleAreas = baseAreas;
  } else if (input.activeField === "area") {
    possibleAreas = fuzzyPick(baseAreas, input.area, 12);
  }

  let autocompleteSuggestions: string[] = [];
  if (input.activeField === "area" && input.area.trim().length >= 2) {
    const local = fuzzyPick(baseAreas, input.area, 8);
    const places = await placesAutocomplete(input.area, pin);
    autocompleteSuggestions = Array.from(new Set([...local, ...places])).slice(0, 10);
  } else if (input.activeField === "road" || input.activeField === "landmark") {
    const q =
      input.activeField === "road"
        ? input.roadSociety || input.area
        : input.landmark || input.roadSociety || input.area;
    if (q.trim().length >= 2) {
      autocompleteSuggestions = await placesAutocomplete(q, pin);
    }
  }

  const areaMatch =
    input.area.trim().length === 0
      ? null
      : baseAreas.some((a) => norm(a) === norm(input.area));

  const landmarkMatch =
    input.landmark.trim().length === 0
      ? null
      : autocompleteSuggestions.length > 0
        ? autocompleteSuggestions.some((s) => norm(s).includes(norm(input.landmark)))
        : null;

  let googleValidation: LiveAssistResult["googleValidation"] = null;
  if (
    pincodeOk &&
    input.area.trim() &&
    (input.roadSociety.trim() || input.landmark.trim())
  ) {
    const gv = await validateAddressStructured({
      regionCode: "IN",
      postalCode: pin,
      locality: input.area,
      addressLines: [
        [input.roadSociety, input.landmark, input.houseNumber].filter(Boolean).join(", "),
      ].filter((l) => l.length > 0),
    });
    if (gv) {
      googleValidation = {
        verdict: gv.verdict,
        formattedAddress: gv.formattedAddress,
        messages: gv.messages,
      };
    }
  }

  const analyticsRows =
    pincodeOk && input.area.trim()
      ? await safeDbQuery(
          () => prisma.deliveryAnalytics.findMany({ where: { pincode: pin } }),
          []
        )
      : [];

  const dbRow =
    analyticsRows.find((r) => r.areaKey === areaKey(pin, input.area)) ??
    analyticsRows.find((r) => norm(r.areaLabel).includes(norm(input.area)));

  let fallbackStats: AreaStats | undefined;
  if (!dbRow && fb?.areaStats && input.area.trim()) {
    const key = norm(input.area);
    fallbackStats =
      fb.areaStats[key] ??
      Object.entries(fb.areaStats).find(([k]) => key.includes(k) || k.includes(key))?.[1];
  }

  const stats = dbRow ?? fallbackStats;

  let deliveryRate: number | null = null;
  if (stats && stats.deliveredOrders + stats.rtoOrders > 0) {
    deliveryRate = stats.deliveredOrders / (stats.deliveredOrders + stats.rtoOrders);
  }

  let deliveryChance: number | null = blendDeliveryFromRate(deliveryRate);
  let riskLevel: LiveAssistResult["riskLevel"] = "LOW";
  const riskMessages: string[] = [];

  if (!pincodeOk) {
    riskLevel = "HIGH";
    riskMessages.push("Pincode invalid — 6 digits required.");
    deliveryChance = null;
  }

  if (pincodeOk && !fb && !geo) {
    riskMessages.push("Pincode not verified against India dataset / maps — double-check with customer.");
    riskLevel = "MEDIUM";
  }

  if (input.statedCity?.trim() && detectedCity) {
    if (norm(input.statedCity) !== norm(detectedCity)) {
      riskLevel = "HIGH";
      riskMessages.push(
        `${pin} belongs to ${detectedCity}, not ${input.statedCity} — mismatch risk.`
      );
    }
  }

  if (pincodeOk && input.area.trim() && baseAreas.length && areaMatch === false) {
    riskLevel = riskLevel === "HIGH" ? "HIGH" : "MEDIUM";
    riskMessages.push("Area not in known locality list for this pincode — confirm spelling.");
  }

  if (deliveryRate != null && deliveryRate < 0.75) {
    riskLevel = "HIGH";
    riskMessages.push("Historically high RTO in this micro-area — extra verification recommended.");
  } else if (deliveryRate != null && deliveryRate < 0.88) {
    riskLevel = riskLevel === "HIGH" ? "HIGH" : "MEDIUM";
    riskMessages.push("Mixed delivery performance in this area.");
  }

  if (!input.houseNumber.trim() && input.area.trim() && input.roadSociety.trim()) {
    riskMessages.push("House number missing — COD risk.");
  }

  const completenessFields = [
    pincodeOk,
    !!input.area.trim(),
    !!input.roadSociety.trim(),
    !!input.landmark.trim(),
    !!input.houseNumber.trim(),
  ];
  const addressCompleteness = Math.round(
    (completenessFields.filter(Boolean).length / completenessFields.length) * 100
  );

  if (googleValidation?.verdict === "FIX") {
    riskLevel = riskLevel === "LOW" ? "MEDIUM" : riskLevel;
    riskMessages.push("Google Address Validation flagged possible issues.");
  }

  const analyticsSnippet = stats
    ? `Area analytics: ${stats.areaLabel} — delivered ${stats.deliveredOrders}, RTO ${stats.rtoOrders}.`
    : "No historical analytics row for this exact area yet.";

  const llm = await runAssistLlm({
    pincode: pin,
    city: detectedCity ?? undefined,
    state: detectedState ?? undefined,
    area: input.area,
    roadSociety: input.roadSociety,
    landmark: input.landmark,
    houseNumber: input.houseNumber,
    analyticsSnippet,
    rulesFromSystem: riskMessages,
  });

  const suggestedNextQuestion =
    llm?.suggestedNextQuestion?.trim() || defaultNextQuestion(input);

  if (llm?.riskNotes?.length) {
    for (const n of llm.riskNotes) {
      if (!riskMessages.includes(n)) riskMessages.push(n);
    }
  }
  if (typeof llm?.deliveryChanceHint === "number") {
    deliveryChance =
      deliveryChance == null
        ? llm.deliveryChanceHint
        : Math.round((deliveryChance + llm.deliveryChanceHint) / 2);
  }
  if (llm?.riskLevelHint === "HIGH") riskLevel = "HIGH";
  else if (llm?.riskLevelHint === "MEDIUM" && riskLevel === "LOW") riskLevel = "MEDIUM";

  return {
    pincodeMatch: pincodeOk ? true : false,
    detectedCity,
    detectedState,
    serviceable: serviceable && pincodeOk,
    possibleAreas,
    autocompleteSuggestions,
    areaMatch,
    landmarkMatch,
    addressCompleteness,
    deliveryChance,
    riskLevel,
    suggestedNextQuestion,
    riskMessages,
    googleValidation,
  };
}
