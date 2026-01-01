"use client";

import { VerdictExplanation } from "@/lib/types";

interface VerdictPanelProps {
  explanation: VerdictExplanation;
}

export function VerdictPanel({ explanation }: VerdictPanelProps) {
  const isFluff = explanation.verdict === "FLUFF";
  
  // Color coding based on verdict type
  const badgeColors = isFluff
    ? "bg-red-500/20 text-red-400 border-red-500/50"
    : "bg-green-500/20 text-green-400 border-green-500/50";
  
  // Confidence badge colors
  const confidenceColors = {
    high: "bg-blue-500/20 text-blue-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
      {/* Verdict Badge */}
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded text-sm font-semibold border ${badgeColors}`}>
          {explanation.verdict}
        </span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${confidenceColors[explanation.confidence]}`}>
          {explanation.confidence} confidence
        </span>
      </div>

      {/* Evidence List */}
      {explanation.evidence.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Evidence
          </h3>
          <ul className="flex flex-col gap-1.5">
            {explanation.evidence.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-zinc-500 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Hint */}
      <div className="pt-2 border-t border-zinc-700">
        <p className="text-xs font-medium text-zinc-400">Action</p>
        <p className="text-sm text-zinc-200 mt-1">{explanation.action_hint}</p>
      </div>
    </div>
  );
}



