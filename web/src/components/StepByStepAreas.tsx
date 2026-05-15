"use client";

import { useEffect, useState } from "react";

export function StepByStepAreas({
  areas,
  onPick,
  active,
}: {
  areas: string[];
  onPick: (area: string) => void;
  active: boolean;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active || !areas.length) {
      setShown(0);
      return;
    }
    setShown(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= areas.length) window.clearInterval(id);
    }, 450);
    return () => window.clearInterval(id);
  }, [areas, active]);

  if (!active || !areas.length) return null;

  return (
    <ul className="mt-2 space-y-2">
      {areas.slice(0, shown).map((a, idx) => (
        <li
          key={a}
          className="flex items-center justify-between rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm shadow-sm transition-all duration-300 dark:border-indigo-900 dark:bg-zinc-900"
        >
          <span className="font-medium text-indigo-950 dark:text-indigo-50">
            {idx + 1}. {a}
          </span>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(a)}
            className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-500"
          >
            Select
          </button>
        </li>
      ))}
      {shown < areas.length && (
        <li className="text-xs text-indigo-600 animate-pulse">વધુ areas લોડ થઈ રહ્યા છે…</li>
      )}
    </ul>
  );
}
