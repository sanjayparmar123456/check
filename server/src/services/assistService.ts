import { prisma } from "../lib/db.js";
import { safeDbQuery } from "../lib/safeDb.js";
import { pincodeFallback, type AreaStats } from "../data/pincodeFallback.js";
import {
  geocodePincode,
  placesAutocomplete,
  validateAddressStructured,
} from "../lib/googleMaps.js";
import { lookupIndiaPincode } from "../lib/indiaPost.js";
import { runAssistLlm } from "../lib/openaiAssist.js";

export type LiveAssistInput = {
  pincode: string;
  area: string;
  roadSociety: string;
  landmark: string;
  houseNumber: string;
  statedCity?: string;
  activeField: "pincode" | "area" | "road" | "landmark" | "house" | "none";
};

export type ValidationChecks = {
  pincodeValid: boolean | null;
  cityMatch: boolean | null;
  areaExists: boolean | null;
  landmarkExists: boolean | null;
  addressComplete: boolean | null;
  deliveryFeasible: boolean | null;
};

export type LiveAssistResult = {
  pincodeMatch: boolean | null;
  detectedCity: string | null;
  detectedState: string | null;
  serviceable: boolean;
  codAvailable: boolean;
  deliveryAvailable: boolean;
  possibleAreas: string[];
  nearbyServiceableLocations: string[];
  areaSuggestions: string[];
  roadSuggestions: string[];
  landmarkSuggestions: string[];
  autocompleteSuggestions: string[];
  areaMatch: boolean | null;
  landmarkMatch: boolean | null;
  addressCompleteness: number;
  deliveryChance: number | null;
  deliverySuccessRatio: number | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  suggestedNextQuestion: string;
  riskMessages: string[];
  validationChecks: ValidationChecks;
  pincodeEngineReady: boolean;
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
  return haystack
    .filter((h) => {
      const s = norm(h);
      return (
        s.includes(n) ||
        n.split(" ").every((w) => w.length > 0 && s.includes(w))
      );
    })
    .slice(0, limit);
}

function defaultNextQuestion(input: LiveAssistInput, pincodeOk: boolean): string {
  if (!pincodeOk) return "Sir pincode confirm karo — 6 digit bolo.";
  if (!input.area.trim()) return "Sir kaya area ma cho?";
  if (!input.roadSociety.trim()) return "Sir road nu naam bolo.";
  if (!input.landmark.trim()) return "Sir nearby landmark bolo.";
  if (!input.houseNumber.trim()) return "Sir house number bolo.";
  return "Sir poora address ek baar repeat karwa lijiye.";
}

function ratio(delivered: number, rto: number): number {
  const t = delivered + rto;
  return t > 0 ? Math.round((delivered / t) * 100) : 91;
}

export async function buildLiveAssist(input: LiveAssistInput): Promise<LiveAssistResult> {
  const pin = input.pincode.replace(/\D/g, "");
  const pincodeOk = pin.length === 6;

  const fb = pincodeFallback[pin];

  let indiaPost = null;
  let geo = null;
  if (pincodeOk && !fb) {
    [indiaPost, geo] = await Promise.all([lookupIndiaPincode(pin), geocodePincode(pin)]);
  } else if (pincodeOk && fb) {
    indiaPost = await lookupIndiaPincode(pin);
  }

  const detectedCity = fb?.city ?? indiaPost?.city ?? geo?.city ?? null;
  const detectedState = fb?.state ?? indiaPost?.state ?? geo?.state ?? null;
  const codAvailable = fb?.codAvailable ?? (pincodeOk && (indiaPost?.valid || !!geo));
  const deliveryAvailable =
    pincodeOk &&
    (fb != null ? fb.serviceable : indiaPost?.valid === true || !!geo);

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
    new Set([
      ...(fb?.areas ?? []),
      ...(indiaPost?.areas ?? []),
      ...dbLocals.map((l) => l.locality),
    ])
  );
  const nearbyServiceableLocations = fb?.nearbyServiceable ?? [];
  const landmarkCatalog = fb?.landmarks ?? [];
  const roadCatalog = fb?.roads ?? [];

  const pincodeEngineReady = pincodeOk && (!!fb || !!indiaPost?.valid || !!geo);

  let possibleAreas = baseAreas;
  let areaSuggestions: string[] = [];
  let roadSuggestions: string[] = [];
  let landmarkSuggestions: string[] = [];
  let autocompleteSuggestions: string[] = [];

  const areaFilled = input.area.trim().length > 0;
  const roadPhase =
    input.activeField === "road" ||
    (areaFilled && !input.landmark.trim() && input.activeField !== "landmark");
  const landmarkPhase =
    input.activeField === "landmark" || (areaFilled && input.roadSociety.trim() && !input.landmark.trim());

  if (input.activeField === "area" && input.area.trim().length >= 1) {
    areaSuggestions = fuzzyPick(baseAreas, input.area, 12);
    if (input.area.trim().length >= 2) {
      const places = await placesAutocomplete(input.area, pin);
      areaSuggestions = Array.from(new Set([...areaSuggestions, ...places])).slice(0, 10);
    }
    autocompleteSuggestions = areaSuggestions;
  } else if (roadPhase && areaFilled) {
    const local = fuzzyPick(
      roadCatalog.length ? roadCatalog : [],
      input.roadSociety.trim() || input.area,
      10
    );
    const placesQuery = input.roadSociety.trim()
      ? `${input.roadSociety}, ${input.area}, ${pin}`
      : `${input.area}, ${detectedCity ?? ""} ${pin}`;
    const places = await placesAutocomplete(placesQuery, pin);
    roadSuggestions = Array.from(new Set([...local, ...places])).slice(0, 12);
    if (roadSuggestions.length === 0) {
      roadSuggestions = [
        `${input.area} Road`,
        `${input.area} Main Road`,
        `${input.area} Society`,
        `${input.area} Nagar`,
      ];
    }
    autocompleteSuggestions = roadSuggestions;
  } else if (landmarkPhase) {
    const local = fuzzyPick(landmarkCatalog, input.landmark.trim() || input.area, 10);
    const placesQuery = input.landmark.trim()
      ? `${input.landmark}, ${input.area}, ${pin}`
      : `${input.area}, ${input.roadSociety}, ${pin}`.replace(/,\s*,/g, ",");
    const places = await placesAutocomplete(placesQuery, pin);
    landmarkSuggestions = Array.from(new Set([...local, ...places])).slice(0, 12);
    autocompleteSuggestions = landmarkSuggestions;
  } else if (pincodeEngineReady) {
    possibleAreas = baseAreas;
  }

  const areaMatch =
    input.area.trim().length === 0
      ? null
      : baseAreas.some((a) => norm(a) === norm(input.area) || norm(a).includes(norm(input.area)));

  const landmarkMatch =
    input.landmark.trim().length === 0
      ? null
      : landmarkCatalog.some((l) => norm(l).includes(norm(input.landmark))) ||
        landmarkSuggestions.some((s) => norm(s).includes(norm(input.landmark)));

  let googleValidation: LiveAssistResult["googleValidation"] = null;
  if (pincodeOk && input.area.trim() && (input.roadSociety.trim() || input.landmark.trim())) {
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
  } else if (fb?.pincodeStats && pincodeOk) {
    deliveryRate =
      fb.pincodeStats.deliveredOrders /
      (fb.pincodeStats.deliveredOrders + fb.pincodeStats.rtoOrders);
  }

  let deliveryChance: number | null =
    deliveryRate != null ? Math.round(deliveryRate * 100) : pincodeOk ? 91 : null;
  let deliverySuccessRatio = deliveryChance;

  let riskLevel: LiveAssistResult["riskLevel"] = "LOW";
  const riskMessages: string[] = [];

  if (!pincodeOk) {
    riskLevel = "HIGH";
    riskMessages.push("⚠️ Pincode invalid — 6 digits required.");
    deliveryChance = null;
    deliverySuccessRatio = null;
  }

  if (pincodeOk && !fb && !indiaPost?.valid && !geo) {
    riskMessages.push("⚠️ Pincode not found — customer સાથે confirm karo.");
    riskLevel = "HIGH";
    deliveryChance = null;
    deliverySuccessRatio = null;
  } else if (pincodeOk && !fb && indiaPost?.valid) {
    riskMessages.push(`ℹ️ ${indiaPost.areas.length} localities found for this pincode.`);
  }

  if (input.statedCity?.trim() && detectedCity) {
    if (norm(input.statedCity) !== norm(detectedCity)) {
      riskLevel = "HIGH";
      riskMessages.push(
        `⚠️ ${pin} belongs to ${detectedCity}, not ${input.statedCity}.`
      );
    }
  }

  if (pincodeOk && input.area.trim() && baseAreas.length && areaMatch === false) {
    riskLevel = riskLevel === "HIGH" ? "HIGH" : "MEDIUM";
    riskMessages.push("⚠️ Area not found in known list for this pincode.");
  }

  if (deliveryRate != null && deliveryRate < 0.75) {
    riskLevel = "HIGH";
    riskMessages.push("⚠️ High RTO area — extra verification recommended.");
  } else if (deliveryRate != null && deliveryRate < 0.88) {
    riskLevel = riskLevel === "HIGH" ? "HIGH" : "MEDIUM";
    riskMessages.push("⚠️ Mixed delivery performance in this area.");
  }

  if (!input.houseNumber.trim() && input.area.trim() && input.roadSociety.trim()) {
    riskMessages.push("⚠️ House number missing.");
  }

  if (!input.landmark.trim() && input.roadSociety.trim()) {
    riskMessages.push("⚠️ Landmark missing — delivery risk.");
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

  const cityMatch =
    input.statedCity?.trim() && detectedCity
      ? norm(input.statedCity) === norm(detectedCity)
      : pincodeOk
        ? true
        : null;

  const validationChecks: ValidationChecks = {
    pincodeValid: pincodeOk ? true : pin.length > 0 ? false : null,
    cityMatch,
    areaExists: input.area.trim() ? areaMatch : null,
    landmarkExists: input.landmark.trim() ? landmarkMatch : null,
    addressComplete: addressCompleteness >= 80 ? true : addressCompleteness > 0 ? false : null,
    deliveryFeasible: pincodeOk ? deliveryAvailable : null,
  };

  if (googleValidation?.verdict === "FIX") {
    riskLevel = riskLevel === "LOW" ? "MEDIUM" : riskLevel;
    riskMessages.push("⚠️ Google Address Validation flagged issues.");
  }

  const analyticsSnippet = stats
    ? `Area: ${stats.areaLabel} — delivered ${stats.deliveredOrders}, RTO ${stats.rtoOrders}.`
    : fb?.pincodeStats
      ? `Pincode avg success ~${ratio(fb.pincodeStats.deliveredOrders, fb.pincodeStats.rtoOrders)}%.`
      : "No analytics yet.";

  const needsLlm =
    pincodeOk &&
    (input.area.trim() || input.roadSociety.trim() || input.landmark.trim());
  const llm = needsLlm
      ? await runAssistLlm({
          pincode: pin,
          city: detectedCity ?? undefined,
          state: detectedState ?? undefined,
          area: input.area,
          roadSociety: input.roadSociety,
          landmark: input.landmark,
          houseNumber: input.houseNumber,
          analyticsSnippet,
          rulesFromSystem: riskMessages,
        })
      : null;

  let suggestedNextQuestion =
    llm?.suggestedNextQuestion?.trim() || defaultNextQuestion(input, pincodeOk);

  if (pincodeOk && !input.area.trim() && !llm?.suggestedNextQuestion) {
    suggestedNextQuestion = "Sir kaya area ma cho?";
  }

  if (llm?.riskNotes?.length) {
    for (const n of llm.riskNotes) {
      const msg = n.startsWith("⚠️") ? n : `⚠️ ${n}`;
      if (!riskMessages.includes(msg)) riskMessages.push(msg);
    }
  }
  if (typeof llm?.deliveryChanceHint === "number") {
    deliveryChance =
      deliveryChance == null
        ? llm.deliveryChanceHint
        : Math.round((deliveryChance + llm.deliveryChanceHint) / 2);
    deliverySuccessRatio = deliveryChance;
  }
  if (llm?.riskLevelHint === "HIGH") riskLevel = "HIGH";
  else if (llm?.riskLevelHint === "MEDIUM" && riskLevel === "LOW") riskLevel = "MEDIUM";

  return {
    pincodeMatch: pincodeOk ? true : pin.length > 0 ? false : null,
    detectedCity,
    detectedState,
    serviceable: deliveryAvailable,
    codAvailable: codAvailable && pincodeOk,
    deliveryAvailable,
    possibleAreas,
    nearbyServiceableLocations,
    areaSuggestions,
    roadSuggestions,
    landmarkSuggestions,
    autocompleteSuggestions,
    areaMatch,
    landmarkMatch,
    addressCompleteness,
    deliveryChance,
    deliverySuccessRatio,
    riskLevel,
    suggestedNextQuestion,
    riskMessages,
    validationChecks,
    pincodeEngineReady,
    googleValidation,
  };
}
