"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getClipDetail, editClip } from "../../../lib/api";
import { ClipDetailResponse } from "../../../lib/types";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

function formatTimeShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

interface TimelineProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoDuration: number;
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
}

function Timeline({
  videoRef,
  videoDuration,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);

  const getTimeFromPosition = (clientX: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * videoDuration;
  };

  const getPositionFromTime = (time: number): number => {
    if (!timelineRef.current || videoDuration === 0) return 0;
    return (time / videoDuration) * 100;
  };

  const handleMouseDown = (handle: "start" | "end", e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(handle);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const time = getTimeFromPosition(e.clientX);
      const minBuffer = 0.1;

      if (isDragging === "start") {
        const newStart = Math.max(0, Math.min(time, endTime - minBuffer));
        onStartTimeChange(newStart);
        if (videoRef.current) {
          videoRef.current.currentTime = newStart;
        }
      } else if (isDragging === "end") {
        const newEnd = Math.min(videoDuration, Math.max(time, startTime + minBuffer));
        onEndTimeChange(newEnd);
        if (videoRef.current) {
          videoRef.current.currentTime = newEnd;
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, videoDuration, startTime, endTime, onStartTimeChange, onEndTimeChange, videoRef]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDragging || !timelineRef.current) return;
    const time = getTimeFromPosition(e.clientX);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const startPos = getPositionFromTime(startTime);
  const endPos = getPositionFromTime(endTime);
  const clipWidth = endPos - startPos;

  const timeMarkers = [];
  const markerInterval = 60;
  for (let t = 0; t <= videoDuration; t += markerInterval) {
    timeMarkers.push(t);
  }

  return (
    <div className="w-full">
      <div className="relative">
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative h-12 bg-zinc-200 dark:bg-zinc-800 rounded cursor-pointer"
        >
          <div className="absolute inset-0 flex items-center">
            {timeMarkers.map((time) => {
              const pos = getPositionFromTime(time);
              return (
                <div
                  key={time}
                  className="absolute top-0 bottom-0 w-px bg-zinc-400 dark:bg-zinc-600"
                  style={{ left: `${pos}%` }}
                >
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {formatTimeShort(time)}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="absolute top-0 bottom-0 bg-blue-500/50 dark:bg-blue-400/50"
            style={{
              left: `${startPos}%`,
              width: `${clipWidth}%`,
            }}
          />

          <div
            className={`absolute top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-500 cursor-ew-resize hover:bg-blue-700 dark:hover:bg-blue-400 ${
              isDragging === "start" ? "ring-2 ring-blue-400" : ""
            }`}
            style={{ left: `${startPos}%` }}
            onMouseDown={(e) => handleMouseDown("start", e)}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {formatTime(startTime)}
            </div>
          </div>

          <div
            className={`absolute top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-500 cursor-ew-resize hover:bg-blue-700 dark:hover:bg-blue-400 ${
              isDragging === "end" ? "ring-2 ring-blue-400" : ""
            }`}
            style={{ left: `${endPos}%` }}
            onMouseDown={(e) => handleMouseDown("end", e)}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {formatTime(endTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditClipPage() {
  const params = use(useParams());
  const router = useRouter();
  const clipId = params.clipId as string;
  
  const [clipData, setClipData] = useState<ClipDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (clipId) {
      loadClipData();
    }
  }, [clipId]);
  
  useEffect(() => {
    if (clipData) {
      setStartTime(clipData.start);
      setEndTime(clipData.end);
      setVideoDuration(clipData.video_duration);
    }
  }, [clipData]);
  
  useEffect(() => {
    if (clipData && videoRef.current && startTime > 0) {
      videoRef.current.currentTime = startTime;
    }
  }, [clipData, startTime]);
  
  
  const loadClipData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClipDetail(clipId);
      setClipData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clip data");
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartTimeChange = (newStart: number) => {
    if (newStart >= 0 && newStart < endTime) {
      setStartTime(newStart);
    }
  };
  
  const handleEndTimeChange = (newEnd: number) => {
    if (newEnd > startTime && newEnd <= videoDuration) {
      setEndTime(newEnd);
    }
  };
  
  const handleSave = async () => {
    if (startTime >= endTime || startTime < 0 || endTime > videoDuration) {
      setError("Invalid time range. Start must be less than end, and both must be within video duration.");
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      await editClip(clipId, startTime, endTime);
      router.push("/clips");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save edited clip");
    } finally {
      setSaving(false);
    }
  };
  
  
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 px-4 py-8 dark:bg-black">
        <main className="w-full max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-foreground"></div>
          </div>
        </main>
      </div>
    );
  }
  
  if (error && !clipData) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 px-4 py-8 dark:bg-black">
        <main className="w-full max-w-6xl mx-auto">
          <div className="mb-8">
            <Link
              href="/clips"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              ← Back to Clips
            </Link>
          </div>
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        </main>
      </div>
    );
  }
  
  if (!clipData) {
    return null;
  }
  
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 px-4 py-8 dark:bg-black">
      <main className="w-full max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-black dark:text-zinc-50">Edit Clip</h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              Adjust the start and end times for this clip
            </p>
          </div>
          <Link
            href="/clips"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Cancel
          </Link>
        </div>
        
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}
        
        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">Source Video</h2>
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={clipData.video_url}
                crossOrigin="anonymous"
                controls
                className="w-full"
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  if (video.duration) {
                    setVideoDuration(video.duration);
                  }
                  if (clipData && clipData.start > 0) {
                    video.currentTime = clipData.start;
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
          
          <div className="rounded-lg border border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">Clip Timing</h2>
            
            {videoDuration > 0 && (
              <div className="space-y-6">
                <Timeline
                  videoRef={videoRef}
                  videoDuration={videoDuration}
                  startTime={startTime}
                  endTime={endTime}
                  onStartTimeChange={handleStartTimeChange}
                  onEndTimeChange={handleEndTimeChange}
                />
                
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Clip Duration: {formatTime(endTime - startTime)}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Start: {formatTime(startTime)} • End: {formatTime(endTime)}
                      </p>
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={saving || startTime >= endTime || startTime < 0 || endTime > videoDuration}
                      className="rounded-full bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Edited Clip"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

