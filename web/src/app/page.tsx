"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AssistPanel } from "@/components/AssistPanel";
import { CallerStepGuide, type WizardStep } from "@/components/CallerStepGuide";
import type { ActiveField, LiveAssistResponse } from "@/lib/api";
import {
  createCustomer,
  createOrder,
  patchOrder,
  postLiveAssist,
} from "@/lib/api";

function getStep(
  pinComplete: boolean,
  city: string,
  area: string,
  road: string,
  landmark: string,
  house: string
): WizardStep {
  if (!pinComplete) return 1;
  if (!area.trim()) return 2;
  if (!road.trim()) return 3;
  if (!landmark.trim()) return 4;
  if (!house.trim()) return 5;
  return 5;
}

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [area, setArea] = useState("");
  const [roadSociety, setRoadSociety] = useState("");
  const [landmark, setLandmark] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [activeField, setActiveField] = useState<ActiveField>("none");

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [assist, setAssist] = useState<LiveAssistResponse | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);

  const pinDigits = pincode.replace(/\D/g, "");
  const pinComplete = pinDigits.length === 6;

  const step = useMemo(
    () => getStep(pinComplete, city, area, roadSociety, landmark, houseNumber),
    [pinComplete, city, area, roadSociety, landmark, houseNumber]
  );

  const refreshAssist = useCallback(async () => {
    if (pinDigits.length > 0 && pinDigits.length < 6 && activeField === "pincode") {
      return;
    }
    setAssistLoading(true);
    setAssistError(null);
    try {
      let field = activeField;
      if (field === "none") {
        if (pinComplete && !area.trim()) field = "pincode";
        else if (area.trim()) field = "road";
      }
      const r = await postLiveAssist({
        pincode,
        area,
        roadSociety,
        landmark,
        houseNumber,
        statedCity: city || undefined,
        activeField: field,
      });
      setAssist(r);
      if (r.detectedCity) setCity(r.detectedCity);
      if (r.detectedState) setState(r.detectedState);
    } catch (e) {
      setAssist(null);
      setAssistError(
        e instanceof Error
          ? e.message
          : "Live assist unavailable — run: cd server && npm run dev"
      );
    } finally {
      setAssistLoading(false);
    }
  }, [pincode, pinDigits, pinComplete, area, roadSociety, landmark, houseNumber, city, activeField]);

  useEffect(() => {
    const typing = activeField === "area" || activeField === "road" || activeField === "landmark";
    const delay = activeField === "pincode" || pinComplete ? 120 : typing ? 150 : 280;
    const t = window.setTimeout(() => void refreshAssist(), delay);
    return () => window.clearTimeout(t);
  }, [refreshAssist, activeField, pincode, pinComplete, area, roadSociety, landmark]);

  const pickArea = (v: string) => {
    setArea(v);
    setActiveField("road");
    setTimeout(() => void refreshAssist(), 50);
  };

  const pickRoad = (v: string) => {
    setRoadSociety(v);
    setActiveField("landmark");
    setTimeout(() => void refreshAssist(), 50);
  };

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

  const finalizeManual = async () => {
    setFinalizeMsg(null);
    if (!orderId) {
      setFinalizeMsg("Pehle session start karein.");
      return;
    }
    try {
      await patchOrder(orderId, {
        pincode: pincode || null,
        city: city || null,
        state: state || null,
        area: area || null,
        roadSociety: roadSociety || null,
        landmark: landmark || null,
        houseNumber: houseNumber || null,
        serviceable: assist?.deliveryAvailable ?? true,
        deliveryChance: assist?.deliverySuccessRatio ?? null,
        riskLevel: assist?.riskLevel ?? null,
        status: "VERIFIED",
      });
      setFinalizeMsg("Order manually verified and saved.");
    } catch (e) {
      setFinalizeMsg(e instanceof Error ? e.message : "Finalize failed");
    }
  };

  const fieldClass = (enabled: boolean) =>
    enabled
      ? "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      : "w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50";

  const autoClass =
    "w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              COD verification
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">AI Live Address CRM</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void startSession()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Start session
            </button>
            <button
              type="button"
              onClick={() => void finalizeManual()}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
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
            {customerId && <span className="text-xs text-zinc-500">Session active</span>}
          </div>

          {sessionError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{sessionError}</p>
          )}
          {finalizeMsg && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{finalizeMsg}</p>
          )}

          <CallerStepGuide
            step={step}
            aiQuestion={assist?.suggestedNextQuestion}
            city={city}
            state={state}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500">Customer name</span>
              <input className={fieldClass(true)} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500">Phone</span>
              <input className={fieldClass(true)} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-indigo-600">Step 1 — Pincode</span>
            <input
              className="w-full rounded-lg border-2 border-indigo-200 px-3 py-2 text-lg font-semibold tracking-widest dark:border-indigo-800 dark:bg-zinc-900"
              value={pincode}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPincode(v);
                setActiveField("pincode");
                if (v.length < 6) {
                  setCity("");
                  setState("");
                }
              }}
              onFocus={() => setActiveField("pincode")}
              placeholder="390024"
              inputMode="numeric"
              maxLength={6}
            />
          </label>

          <div className={`grid gap-3 sm:grid-cols-2 ${pinComplete ? "" : "opacity-40 pointer-events-none"}`}>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-emerald-700">City (auto)</span>
              <input className={autoClass} value={city} readOnly placeholder="Pincode પછી auto" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-emerald-700">State (auto)</span>
              <input className={autoClass} value={state} readOnly placeholder="Pincode પછી auto" />
            </label>
          </div>

          <label className={`text-sm ${step >= 2 ? "" : "opacity-40 pointer-events-none"}`}>
            <span className="mb-1 block font-medium text-indigo-600">Step 2 — Area</span>
            <input
              className={fieldClass(step >= 2)}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onFocus={() => setActiveField("area")}
              placeholder="જમણી બાજુ list માંથી select કરો અથવા ટાઇપ કરો"
              disabled={step < 2}
            />
          </label>

          <label className={`text-sm ${step >= 3 ? "" : "opacity-40 pointer-events-none"}`}>
            <span className="mb-1 block text-zinc-500">Step 3 — Road / society</span>
            <input
              className={fieldClass(step >= 3)}
              value={roadSociety}
              onChange={(e) => {
                setRoadSociety(e.target.value);
                setActiveField("road");
              }}
              onFocus={() => setActiveField("road")}
              disabled={step < 3}
            />
          </label>

          <label className={`text-sm ${step >= 4 ? "" : "opacity-40 pointer-events-none"}`}>
            <span className="mb-1 block text-zinc-500">Step 4 — Landmark</span>
            <input
              className={fieldClass(step >= 4)}
              value={landmark}
              onChange={(e) => {
                setLandmark(e.target.value);
                setActiveField("landmark");
              }}
              onFocus={() => setActiveField("landmark")}
              disabled={step < 4}
            />
          </label>

          <label className={`text-sm ${step >= 5 ? "" : "opacity-40 pointer-events-none"}`}>
            <span className="mb-1 block text-zinc-500">Step 5 — House number</span>
            <input
              className={fieldClass(step >= 5)}
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              onFocus={() => setActiveField("house")}
              disabled={step < 5}
            />
          </label>
        </section>

        <AssistPanel
          assist={assist}
          assistLoading={assistLoading}
          assistError={assistError}
          activeField={activeField}
          step={step}
          onPickArea={pickArea}
          onPickRoad={pickRoad}
          onPickLandmark={setLandmark}
        />
      </main>
    </div>
  );
}
