"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActiveField, LiveAssistResponse } from "@/lib/api";
import {
  createCustomer,
  createOrder,
  patchOrder,
  postLiveAssist,
} from "@/lib/api";

function TriState({ label, value }: { label: string; value: boolean | null }) {
  const text =
    value === true ? "Yes" : value === false ? "No" : "—";
  const tone =
    value === true
      ? "text-emerald-600 dark:text-emerald-400"
      : value === false
        ? "text-rose-600 dark:text-rose-400"
        : "text-zinc-500";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className={`text-sm font-semibold ${tone}`}>{text}</span>
    </div>
  );
}

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [area, setArea] = useState("");
  const [roadSociety, setRoadSociety] = useState("");
  const [landmark, setLandmark] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [statedCity, setStatedCity] = useState("");
  const [activeField, setActiveField] = useState<ActiveField>("none");

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [assist, setAssist] = useState<LiveAssistResponse | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);

  const refreshAssist = useCallback(async () => {
    setAssistLoading(true);
    setAssistError(null);
    try {
      const r = await postLiveAssist({
        pincode,
        area,
        roadSociety,
        landmark,
        houseNumber,
        statedCity: statedCity || undefined,
        activeField,
      });
      setAssist(r);
    } catch {
      setAssist(null);
      setAssistError(
        "Live assist unavailable. Start the API (`npm run dev` in /server) and check NEXT_PUBLIC_API_URL."
      );
    } finally {
      setAssistLoading(false);
    }
  }, [
    pincode,
    area,
    roadSociety,
    landmark,
    houseNumber,
    statedCity,
    activeField,
  ]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refreshAssist();
    }, 450);
    return () => window.clearTimeout(t);
  }, [refreshAssist]);

  const startSession = async () => {
    setSessionError(null);
    setFinalizeMsg(null);
    try {
      const c = await createCustomer({
        name: name.trim() || "Walk-in",
        phone: phone.trim() || "0000000000",
      });
      setCustomerId(c.id);
      const o = await createOrder(c.id);
      setOrderId(o.id);
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "Session start failed");
    }
  };

  const applySuggestion = (text: string) => {
    if (activeField === "area") setArea(text);
    else if (activeField === "road") setRoadSociety(text);
    else if (activeField === "landmark") setLandmark(text);
  };

  const finalizeManual = async () => {
    setFinalizeMsg(null);
    if (!orderId) {
      setFinalizeMsg("Pehle session start karein (customer + order).");
      return;
    }
    try {
      await patchOrder(orderId, {
        pincode: pincode || null,
        city: assist?.detectedCity ?? null,
        state: assist?.detectedState ?? null,
        area: area || null,
        roadSociety: roadSociety || null,
        landmark: landmark || null,
        houseNumber: houseNumber || null,
        serviceable: assist?.serviceable ?? true,
        deliveryChance: assist?.deliveryChance ?? null,
        riskLevel: assist?.riskLevel ?? null,
        status: "VERIFIED",
      });
      setFinalizeMsg("Order manually verified and saved (DRAFT → VERIFIED).");
    } catch (e) {
      setFinalizeMsg(e instanceof Error ? e.message : "Finalize failed");
    }
  };

  const riskStyles =
    assist?.riskLevel === "HIGH"
      ? "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900"
      : assist?.riskLevel === "MEDIUM"
        ? "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900"
        : "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-100 dark:ring-emerald-900";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              COD verification
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">
              AI assistant CRM (agent-only)
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              AI suggests and verifies — only the caller talks to the customer and
              finalizes the order.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void startSession()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
            >
              Start session
            </button>
            <button
              type="button"
              onClick={() => void finalizeManual()}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Finalize manually
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Customer & address</h2>
            <div className="text-xs text-zinc-500">
              {customerId && <span className="mr-2">Cust {customerId.slice(0, 8)}…</span>}
              {orderId && <span>Order {orderId.slice(0, 8)}…</span>}
            </div>
          </div>

          {sessionError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-100">
              {sessionError}
            </p>
          )}
          {finalizeMsg && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              {finalizeMsg}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
                Customer name
              </span>
              <input
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Sharma"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
                Phone
              </span>
              <input
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
              />
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
              Pincode (first)
            </span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              onFocus={() => setActiveField("pincode")}
              onBlur={() => setActiveField("none")}
              placeholder="390024"
              inputMode="numeric"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
              Area / locality
            </span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onFocus={() => setActiveField("area")}
              onBlur={() => setTimeout(() => setActiveField("none"), 150)}
              placeholder="Ram Wadi"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
              Road / society
            </span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={roadSociety}
              onChange={(e) => setRoadSociety(e.target.value)}
              onFocus={() => setActiveField("road")}
              onBlur={() => setTimeout(() => setActiveField("none"), 150)}
              placeholder="Old Chhani Road"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
              Landmark
            </span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              onFocus={() => setActiveField("landmark")}
              onBlur={() => setTimeout(() => setActiveField("none"), 150)}
              placeholder="Near ABC Mall"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
              House / flat number
            </span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              onFocus={() => setActiveField("house")}
              onBlur={() => setTimeout(() => setActiveField("none"), 150)}
              placeholder="B-402"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
              Customer ne jo city bola (optional — mismatch alert)
            </span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={statedCity}
              onChange={(e) => setStatedCity(e.target.value)}
              placeholder="e.g. Surat (wrong) vs Vadodara (correct for 390024)"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">AI assistant panel</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Live verification, suggestions, and delivery risk — not visible to the
                customer.
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {assistLoading ? "Updating…" : "Live"}
            </span>
          </div>

          {assistError && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {assistError}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <TriState label="Pincode match" value={assist?.pincodeMatch ?? null} />
            <TriState label="Area match" value={assist?.areaMatch ?? null} />
            <TriState label="Landmark signal" value={assist?.landmarkMatch ?? null} />
            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Delivery available
              </span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {assist ? (assist.serviceable ? "Yes" : "No") : "—"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-xs uppercase text-zinc-500">Delivery chance</p>
              <p className="text-3xl font-semibold">
                {assist?.deliveryChance != null ? `${assist.deliveryChance}%` : "—"}
              </p>
              <p className="text-xs text-zinc-500">Blended model + area analytics</p>
            </div>
            <div
              className={`rounded-xl border p-4 ring-1 ${riskStyles} border-transparent`}
            >
              <p className="text-xs uppercase text-zinc-600 dark:text-zinc-300">
                Risk level
              </p>
              <p className="text-3xl font-semibold">{assist?.riskLevel ?? "—"}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                Caller reviews before COD dispatch
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
            <p className="text-xs font-semibold uppercase text-indigo-700 dark:text-indigo-300">
              Suggested next question
            </p>
            <p className="mt-1 text-base font-medium text-indigo-950 dark:text-indigo-50">
              {assist?.suggestedNextQuestion ?? "Assist loading…"}
            </p>
          </div>

          {(assist?.detectedCity || assist?.detectedState) && (
            <div className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <span className="text-zinc-500">Detected: </span>
              <span className="font-medium">
                {[assist.detectedCity, assist.detectedState].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Possible areas (pincode)
            </p>
            <div className="flex flex-wrap gap-2">
              {(assist?.possibleAreas?.length ? assist.possibleAreas : []).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArea(a)}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-800 hover:border-indigo-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-indigo-700"
                >
                  {a}
                </button>
              ))}
              {!assist?.possibleAreas?.length && (
                <span className="text-sm text-zinc-500">Enter a valid pincode.</span>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Live autocomplete
            </p>
            <div className="flex flex-wrap gap-2">
              {(assist?.autocompleteSuggestions ?? []).map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySuggestion(s)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-left text-xs text-zinc-800 hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {s}
                </button>
              ))}
              {!assist?.autocompleteSuggestions?.length && (
                <span className="text-sm text-zinc-500">
                  Type in focused field to fetch matches (needs Google key on API).
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Risk notes
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
              {(assist?.riskMessages?.length ? assist.riskMessages : ["No blockers yet."]).map(
                (m, i) => (
                  <li key={`${i}-${m}`}>{m}</li>
                )
              )}
            </ul>
          </div>

          {assist?.googleValidation && (
            <div className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <p className="font-semibold">Google Address Validation</p>
              <p className="text-zinc-600 dark:text-zinc-400">
                Verdict: {assist.googleValidation.verdict}
                {assist.googleValidation.formattedAddress
                  ? ` — ${assist.googleValidation.formattedAddress}`
                  : ""}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            Address completeness:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {assist?.addressCompleteness ?? 0}%
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
