export type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEPS: { n: WizardStep; title: string; ask: string }[] = [
  { n: 1, title: "Pincode", ask: "Sir tamaro pincode bolo (6 digit)." },
  { n: 2, title: "Area", ask: "Sir kaya area / locality ma cho?" },
  { n: 3, title: "Road", ask: "Sir road athva society nu naam bolo." },
  { n: 4, title: "Landmark", ask: "Sir najik nu koi famous landmark bolo." },
  { n: 5, title: "House", ask: "Sir flat / house number bolo." },
];

export function CallerStepGuide({
  step,
  aiQuestion,
  city,
  state,
}: {
  step: WizardStep;
  aiQuestion?: string;
  city?: string;
  state?: string;
}) {
  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="text-xs font-bold uppercase text-amber-800 dark:text-amber-200">
        Caller — customer ne આ પૂછો (Step {step}/5)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <span
            key={s.n}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              s.n === step
                ? "bg-amber-600 text-white"
                : s.n < step
                  ? "bg-emerald-200 text-emerald-900"
                  : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {s.n}. {s.title}
          </span>
        ))}
      </div>
      {step >= 2 && city && (
        <p className="mt-3 text-sm text-amber-900 dark:text-amber-100">
          <span className="font-semibold">Auto-filled:</span> {city}
          {state ? `, ${state}` : ""} — customer ne confirm karwa kaho.
        </p>
      )}
      <p className="mt-3 text-lg font-semibold text-amber-950 dark:text-amber-50">
        &ldquo;{aiQuestion || STEPS[step - 1].ask}&rdquo;
      </p>
    </div>
  );
}
