"use client";

import { useCallback, useEffect, useState } from "react";
import { AssistPanel } from "@/components/AssistPanel";
import type { ActiveField, LiveAssistResponse } from "@/lib/api";
import {
  createCustomer,
  createOrder,
  patchOrder,
  postLiveAssist,
} from "@/lib/api";

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
      const field =
        pincode.replace(/\D/g, "").length >= 6 && activeField === "none"
          ? "pincode"
          : activeField;
      const r = await postLiveAssist({
        pincode,
        area,
        roadSociety,
        landmark,
        houseNumber,
        statedCity: statedCity || undefined,
        activeField: field,
      });
      setAssist(r);
    } catch {
      setAssist(null);
      setAssistError(
        "Live assist unavailable — start API (npm run dev in /server) or check API_URL on Vercel."
      );
    } finally {
      setAssistLoading(false);
    }
  }, [pincode, area, roadSociety, landmark, houseNumber, statedCity, activeField]);

  useEffect(() => {
    const delay =
      activeField === "pincode" || pincode.replace(/\D/g, "").length >= 6 ? 180 : 320;
    const t = window.setTimeout(() => void refreshAssist(), delay);
    return () => window.clearTimeout(t);
  }, [refreshAssist, activeField, pincode]);

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
        city: assist?.detectedCity ?? null,
        state: assist?.detectedState ?? null,
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              COD verification
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">AI Live Address CRM</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Agent talks to customer — AI assists in real time only.
            </p>
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
            {customerId && (
              <span className="text-xs text-zinc-500">Session active</span>
            )}
          </div>

          {sessionError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{sessionError}</p>
          )}
          {finalizeMsg && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{finalizeMsg}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500">Customer name</span>
              <input
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500">Phone</span>
              <input
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-indigo-600">Pincode (પહેલા)</span>
            <input
              className="w-full rounded-lg border-2 border-indigo-200 px-3 py-2 text-lg font-semibold tracking-widest dark:border-indigo-800 dark:bg-zinc-900"
              value={pincode}
              onChange={(e) => {
                setPincode(e.target.value);
                setActiveField("pincode");
              }}
              onFocus={() => setActiveField("pincode")}
              placeholder="390024"
              inputMode="numeric"
              maxLength={6}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Area / locality</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onFocus={() => setActiveField("area")}
              onBlur={() => setTimeout(() => setActiveField("none"), 120)}
              placeholder="ram, old ch..."
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Road / society</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={roadSociety}
              onChange={(e) => setRoadSociety(e.target.value)}
              onFocus={() => setActiveField("road")}
              onBlur={() => setTimeout(() => setActiveField("none"), 120)}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Landmark</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              onFocus={() => setActiveField("landmark")}
              onBlur={() => setTimeout(() => setActiveField("none"), 120)}
              placeholder="zimmer..."
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">House / flat number</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              onFocus={() => setActiveField("house")}
              onBlur={() => setTimeout(() => setActiveField("none"), 120)}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Customer ne city kahi? (mismatch test)</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={statedCity}
              onChange={(e) => setStatedCity(e.target.value)}
              placeholder="Surat (wrong for 390024)"
            />
          </label>
        </section>

        <AssistPanel
          assist={assist}
          assistLoading={assistLoading}
          assistError={assistError}
          activeField={activeField}
          onPickArea={setArea}
          onPickRoad={setRoadSociety}
          onPickLandmark={setLandmark}
        />
      </main>
    </div>
  );
}
