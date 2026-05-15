import type { ActiveField, LiveAssistResponse } from "@/lib/api";

function ChipList({
  items,
  onPick,
}: {
  items: string[];
  onPick?: (v: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick?.(item)}
          className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-900 hover:bg-white dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-100"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean | null }) {
  const icon = ok === true ? "✅" : ok === false ? "❌" : "○";
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <span>{icon}</span>
    </div>
  );
}

export function AssistPanel({
  assist,
  assistLoading,
  assistError,
  activeField,
  onPickArea,
  onPickRoad,
  onPickLandmark,
}: {
  assist: LiveAssistResponse | null;
  assistLoading: boolean;
  assistError: string | null;
  activeField: ActiveField;
  onPickArea: (v: string) => void;
  onPickRoad: (v: string) => void;
  onPickLandmark: (v: string) => void;
}) {
  const riskStyles =
    assist?.riskLevel === "HIGH"
      ? "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-100"
      : assist?.riskLevel === "MEDIUM"
        ? "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40"
        : "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/30";

  const liveSuggestions =
    activeField === "landmark"
      ? assist?.landmarkSuggestions ?? []
      : activeField === "area"
        ? assist?.areaSuggestions ?? []
        : assist?.autocompleteSuggestions ?? [];

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">AI Live Assistant</h2>
          <p className="text-sm text-zinc-500">Pincode engine • area • landmark • risk</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {assistLoading ? "…" : "LIVE"}
        </span>
      </div>

      {assistError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{assistError}</p>
      )}

      {assistLoading && !assist?.pincodeEngineReady && (
        <p className="animate-pulse rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          Pincode verify thai rahyu chhe…
        </p>
      )}

      {(assist?.pincodeEngineReady || (assist?.detectedCity && assist?.possibleAreas?.length)) && (
        <div className="space-y-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-4 dark:border-indigo-900 dark:from-indigo-950/40 dark:to-zinc-950">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Live Pincode Intelligence
          </p>
          <div>
            <span className="text-xs text-zinc-500">City</span>
            <p className="text-xl font-semibold">
              {assist.detectedCity}
              {assist.detectedState ? `, ${assist.detectedState}` : ""}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-zinc-600">Areas</span>
            <ChipList items={assist.possibleAreas} onPick={onPickArea} />
          </div>

          {assist.nearbyServiceableLocations.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-zinc-600">
                Nearby serviceable locations
              </span>
              <ChipList items={assist.nearbyServiceableLocations} />
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-md bg-white px-2 py-1 shadow-sm dark:bg-zinc-900">
              {assist.codAvailable ? "✅ COD Available" : "❌ COD N/A"}
            </span>
            <span className="rounded-md bg-white px-2 py-1 shadow-sm dark:bg-zinc-900">
              {assist.deliveryAvailable ? "✅ Delivery Available" : "❌ No delivery"}
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs uppercase text-zinc-500">Delivery success ratio</p>
          <p className="text-3xl font-bold text-emerald-600">
            {assist?.deliverySuccessRatio != null ? `${assist.deliverySuccessRatio}%` : "—"}
          </p>
        </div>
        <div className={`rounded-xl border p-3 ring-1 ${riskStyles} border-transparent`}>
          <p className="text-xs uppercase opacity-80">Risk level</p>
          <p className="text-3xl font-bold">{assist?.riskLevel ?? "—"}</p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
        <p className="text-xs font-bold uppercase text-indigo-600">Suggested (auto)</p>
        {assist?.detectedCity && (
          <p className="mt-2 text-sm">
            <span className="text-zinc-500">City: </span>
            <span className="font-bold text-indigo-900 dark:text-indigo-100">
              {assist.detectedCity}
              {assist.detectedState ? `, ${assist.detectedState}` : ""}
            </span>
          </p>
        )}
        {assist?.possibleAreas && assist.possibleAreas.length > 0 && (
          <div className="mt-2">
            <span className="text-xs text-zinc-500">Areas (click to fill):</span>
            <ChipList items={assist.possibleAreas.slice(0, 6)} onPick={onPickArea} />
          </div>
        )}
        <p className="mt-3 text-xs font-bold uppercase text-indigo-600">Next question</p>
        <p className="mt-1 text-lg font-medium">
          &ldquo;{assist?.suggestedNextQuestion ?? "Sir pincode 6 digit nakho…"}&rdquo;
        </p>
      </div>

      {liveSuggestions.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">
            {activeField === "landmark"
              ? "Live landmark suggestions"
              : activeField === "area"
                ? "Live area suggestions"
                : "Live suggestions"}
          </p>
          <ChipList
            items={liveSuggestions}
            onPick={
              activeField === "landmark"
                ? onPickLandmark
                : activeField === "area"
                  ? onPickArea
                  : activeField === "road"
                    ? onPickRoad
                    : undefined
            }
          />
        </div>
      )}

      {assist?.validationChecks && (
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="mb-2 text-sm font-semibold">Address validation (live)</p>
          <div className="space-y-1">
            <CheckRow label="Pincode validity" ok={assist.validationChecks.pincodeValid} />
            <CheckRow label="City match" ok={assist.validationChecks.cityMatch} />
            <CheckRow label="Area exists" ok={assist.validationChecks.areaExists} />
            <CheckRow label="Landmark exists" ok={assist.validationChecks.landmarkExists} />
            <CheckRow label="Address complete" ok={assist.validationChecks.addressComplete} />
            <CheckRow label="Delivery feasible" ok={assist.validationChecks.deliveryFeasible} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Completeness: {assist.addressCompleteness}%
          </p>
        </div>
      )}

      {assist?.riskMessages && assist.riskMessages.length > 0 && (
        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 dark:border-rose-900 dark:bg-rose-950/20">
          <p className="mb-2 text-sm font-semibold text-rose-800 dark:text-rose-200">
            Risk detection
          </p>
          <ul className="space-y-1 text-sm text-rose-900 dark:text-rose-100">
            {assist.riskMessages.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
