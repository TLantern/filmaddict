"use client";

import { useState } from "react";
import { VerdictExplanation } from "@/lib/types";
import { exportHighlight } from "@/lib/api";
import { Button } from "./button-1";

interface VerdictPanelProps {
  explanation: VerdictExplanation;
  videoId?: string;
  startTime?: number;
  endTime?: number;
}

export function VerdictPanel({ explanation, videoId, startTime, endTime }: VerdictPanelProps) {
  const [exporting, setExporting] = useState<{ [key: string]: boolean }>({});
  const [exportError, setExportError] = useState<string | null>(null);
  
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
  
  const canExport = videoId && startTime !== undefined && endTime !== undefined;
  
  const handleExport = async (aspectRatio: "9:16" | "1:1" | "16:9") => {
    if (!canExport) return;
    
    const key = aspectRatio;
    setExporting(prev => ({ ...prev, [key]: true }));
    setExportError(null);
    
    try {
      const blob = await exportHighlight(videoId!, startTime!, endTime!, aspectRatio);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `highlight_${startTime!.toFixed(1)}s_${endTime!.toFixed(1)}s_${aspectRatio.replace(':', 'x')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export highlight";
      setExportError(errorMessage);
      console.error("Error exporting highlight:", err);
    } finally {
      setExporting(prev => ({ ...prev, [key]: false }));
    }
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
          {/* Export Buttons */}
          {canExport && explanation.evidence.length > 0 && (
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-zinc-700">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleExport("9:16")}
                  disabled={exporting["9:16"]}
                  className="flex-1 text-xs py-1.5 bg-white text-black border border-white hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting["9:16"] ? "Exporting..." : "Export 9:16"}
                </Button>
                <Button
                  onClick={() => handleExport("1:1")}
                  disabled={exporting["1:1"]}
                  className="flex-1 text-xs py-1.5 bg-white text-black border border-white hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting["1:1"] ? "Exporting..." : "Export 1:1"}
                </Button>
                <Button
                  onClick={() => handleExport("16:9")}
                  disabled={exporting["16:9"]}
                  className="flex-1 text-xs py-1.5 bg-white text-black border border-white hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting["16:9"] ? "Exporting..." : "Export 16:9"}
                </Button>
              </div>
              {exportError && (
                <p className="text-xs text-red-400">{exportError}</p>
              )}
            </div>
          )}
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



