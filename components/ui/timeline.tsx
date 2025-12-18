"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Track, TimelineItem } from "@/lib/types";
import { Button } from "./button-1";
import { Play, Pause } from "lucide-react";

interface TimelineProps {
  tracks: Track[];
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
  className?: string;
}

const TRACK_HEIGHT = 60;
const TRACK_LABEL_WIDTH = 128;

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function TimelineItemComponent({
  item,
  startTime,
  endTime,
  containerWidth,
  onItemClick,
}: {
  item: TimelineItem;
  startTime: number;
  endTime: number;
  containerWidth: number;
  onItemClick: (item: TimelineItem) => void;
}) {
  if (item.end < startTime || item.start > endTime) return null;

  const itemStart = Math.max(item.start, startTime);
  const itemEnd = Math.min(item.end, endTime);
  const timeRange = endTime - startTime;
  const startPercent = ((itemStart - startTime) / timeRange) * 100;
  const widthPercent = ((itemEnd - itemStart) / timeRange) * 100;

  const timelineWidth = containerWidth - TRACK_LABEL_WIDTH;
  const leftPos = TRACK_LABEL_WIDTH + (timelineWidth * startPercent) / 100;
  const itemWidth = (timelineWidth * widthPercent) / 100;

  return (
    <div
      className="absolute top-2 bottom-2 rounded bg-blue-600 hover:bg-blue-500 border border-blue-400 cursor-pointer transition-colors overflow-hidden"
      style={{
        left: `${leftPos}px`,
        width: `${itemWidth}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onItemClick(item);
      }}
      title={`${item.title}\n${formatTime(item.start)} - ${formatTime(item.end)}`}
    >
      <div className="flex items-center h-full px-2">
        <span className="text-xs text-white font-medium truncate">{item.title}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 text-[10px] text-blue-100 px-2 pb-1">
        {formatTime(item.start)} - {formatTime(item.end)}
      </div>
    </div>
  );
}

function TimelineTrack({
  track,
  trackIndex,
  startTime,
  endTime,
  containerWidth,
  onItemClick,
}: {
  track: Track;
  trackIndex: number;
  startTime: number;
  endTime: number;
  containerWidth: number;
  onItemClick: (item: TimelineItem) => void;
}) {
  return (
    <div
      key={track.id}
      className="relative border-b border-zinc-700"
      style={{ height: `${TRACK_HEIGHT}px` }}
    >
      <div className="absolute left-0 top-0 bottom-0 bg-zinc-800 border-r border-zinc-700 flex items-center px-3 z-10" style={{ width: `${TRACK_LABEL_WIDTH}px` }}>
        <span className="text-sm text-zinc-300 truncate">Track {trackIndex + 1}</span>
      </div>
      {track.items.map((item) => (
        <TimelineItemComponent
          key={item.id}
          item={item}
          startTime={startTime}
          endTime={endTime}
          containerWidth={containerWidth}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}

function TimeMarkers({
  startTime,
  endTime,
}: {
  startTime: number;
  endTime: number;
}) {
  const visibleDuration = endTime - startTime;
  let interval = 10;
  if (visibleDuration > 600) interval = 60;
  else if (visibleDuration > 300) interval = 30;
  else if (visibleDuration > 120) interval = 20;
  else if (visibleDuration > 60) interval = 10;
  else if (visibleDuration > 30) interval = 5;
  else interval = 2;

  const startMarker = Math.floor(startTime / interval) * interval;
  const numMarkers = Math.ceil((endTime - startMarker) / interval) + 1;

  return (
    <div className="absolute top-0 left-0 right-0 h-8 border-b border-zinc-700 bg-zinc-800 overflow-hidden">
      {Array.from({ length: numMarkers }).map((_, i) => {
        const time = startMarker + i * interval;
        if (time > endTime || time < startTime) return null;

        const timeRange = endTime - startTime;
        const percent = ((time - startTime) / timeRange) * 100;
        if (percent < 0 || percent > 100) return null;

        return (
          <div
            key={time}
            className="absolute top-0 h-full flex items-center"
            style={{ left: `${percent}%` }}
          >
            <div className="w-px h-2 bg-zinc-600" />
            <span className="ml-1 text-xs text-zinc-400 whitespace-nowrap">{formatTime(time)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Playhead({
  currentTime,
  startTime,
  endTime,
}: {
  currentTime: number;
  startTime: number;
  endTime: number;
}) {
  const timeRange = endTime - startTime;
  const playheadPercent = timeRange > 0 ? ((currentTime - startTime) / timeRange) * 100 : 0;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
      style={{ left: `${playheadPercent}%` }}
    >
      <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full" />
    </div>
  );
}

export function Timeline({
  tracks,
  currentTime,
  duration,
  onSeek,
  onPlayPause,
  isPlaying = false,
  className = "",
}: TimelineProps) {
  const [zoom, setZoom] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const visibleDuration = useMemo(() => duration / zoom, [duration, zoom]);
  const startTime = useMemo(
    () => Math.max(0, currentTime - visibleDuration / 2),
    [currentTime, visibleDuration]
  );
  const endTime = useMemo(
    () => Math.min(duration, startTime + visibleDuration),
    [duration, startTime, visibleDuration]
  );
  const actualStartTime = useMemo(
    () => (endTime - visibleDuration < 0 ? 0 : endTime - visibleDuration),
    [endTime, visibleDuration]
  );
  const actualEndTime = useMemo(() => actualStartTime + visibleDuration, [actualStartTime, visibleDuration]);

  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setContainerWidth(timelineRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !onSeek) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentClicked = x / rect.width;
    const clickedTime = actualStartTime + percentClicked * (actualEndTime - actualStartTime);

    onSeek(Math.max(0, Math.min(duration, clickedTime)));
  };

  const handleItemClick = (item: TimelineItem) => {
    onSeek?.(item.start);
  };

  return (
    <div className={`flex flex-col bg-zinc-900 ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Zoom:</span>
          <div className="flex gap-1">
            <Button
              onClick={() => setZoom(1)}
              variant={zoom === 1 ? "primary" : "mono"}
              size="sm"
              className="min-w-[50px]"
            >
              1x
            </Button>
            <Button
              onClick={() => setZoom(2)}
              variant={zoom === 2 ? "primary" : "mono"}
              size="sm"
              className="min-w-[50px]"
            >
              2x
            </Button>
            <Button
              onClick={() => setZoom(4)}
              variant={zoom === 4 ? "primary" : "mono"}
              size="sm"
              className="min-w-[50px]"
            >
              4x
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {onPlayPause && (
            <Button
              onClick={onPlayPause}
              variant="ghost"
              size="icon"
              className="text-zinc-300 hover:text-zinc-100"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <span>{formatTime(currentTime)}</span>
            <span> / </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="text-sm text-zinc-300">
          {tracks.length} track{tracks.length !== 1 ? "s" : ""} • {duration.toFixed(1)}s
        </div>
      </div>

      <div
        ref={timelineRef}
        className="relative flex-1 overflow-y-auto overflow-x-hidden"
        onClick={handleTimelineClick}
        style={{ cursor: "pointer" }}
      >
        <div
          className="relative w-full"
          style={{
            minHeight: `${tracks.length * TRACK_HEIGHT}px`,
          }}
        >
          <Playhead currentTime={currentTime} startTime={actualStartTime} endTime={actualEndTime} />
          <TimeMarkers startTime={actualStartTime} endTime={actualEndTime} />

          <div className="mt-8">
            {tracks.map((track, trackIndex) => (
              <TimelineTrack
                key={track.id}
                track={track}
                trackIndex={trackIndex}
                startTime={actualStartTime}
                endTime={actualEndTime}
                containerWidth={containerWidth}
                onItemClick={handleItemClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
