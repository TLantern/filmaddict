"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Track, TimelineItem, Sequence, SegmentAnalysis, EditableSegment } from "@/lib/types";
import { Button } from "./button-1";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./hover-card";
import { exportHighlight } from "@/lib/api";
import { 
  Play, Pause, Lock, LockOpen, Eye, EyeOff, Volume2, VolumeX, Headphones,
  Scissors, MousePointer2, Crop, ZoomIn, ZoomOut, MapPin, Download, 
  Save, Undo2, Redo2, Split, Copy, Trash2, Settings
} from "lucide-react";

const FRAME_RATE = 30;
const TRACK_HEIGHT = 60;
const TRACK_LABEL_WIDTH = 128;
const RULER_HEIGHT = 32;

export interface TimelineProps {
  sequences?: Sequence[];
  tracks?: Track[]; // Legacy support
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
  className?: string;
  activeSequenceId?: string;
  onSequenceChange?: (sequenceId: string) => void;
  onTrackControlChange?: (trackId: string, control: 'locked' | 'visible' | 'muted' | 'soloed', value: boolean) => void;
  segments?: SegmentAnalysis[]; // Segment overlays for video track
  // Toolbar handlers
  onBladeTool?: () => void;
  onSelectTool?: () => void;
  onTrimTool?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomToFit?: () => void;
  onAddMarker?: () => void;
  onExport?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  activeTool?: 'blade' | 'select' | 'trim' | null;
  canUndo?: boolean;
  canRedo?: boolean;
  isMac?: boolean;
  // Filter props
  segmentFilter?: "FLUFF" | "HIGHLIGHTS" | "ALL";
  onSegmentFilterChange?: (filter: "FLUFF" | "HIGHLIGHTS" | "ALL") => void;
  segmentCounts?: Record<"FLUFF" | "HIGHLIGHTS", number>;
  // Playback rate
  onPlaybackRateChange?: (rate: number) => void;
  playbackRate?: number;
  // Editable timeline segments with keep toggle
  timeline?: EditableSegment[];
  onToggleSegmentKeep?: (id: string) => void;
  onImplementAllFluff?: () => void;
  // Previous item positions for animation
  previousItemPositions?: Map<string, { start: number; end: number }>;
  // Original tracks (before adjustment) for adjacent item detection
  originalTracks?: Track[];
  // Video URL for audio waveform generation
  videoUrl?: string;
  // Video ID for highlight downloads
  videoId?: string;
  // Gaps (removed segments) to show as cut regions on tracks
  gaps?: [number, number][];
  // Accepted segments (Set of segment keys like "start-end")
  acceptedSegments?: Set<string>;
  // Sequence modification callbacks
  onSplitClip?: (sequenceId: string, trackId: string, itemId: string, splitTime: number) => void;
  onTrimClip?: (sequenceId: string, trackId: string, itemId: string, newStart: number, newEnd: number) => void;
  selectedItemIds?: Set<string>;
  onItemSelect?: (itemId: string, multiSelect: boolean) => void;
  onMoveItem?: (sequenceId: string, trackId: string, itemId: string, newStart: number, newEnd: number) => void;
}

// SMPTE Timecode Utilities
function secondsToFrames(seconds: number, fps: number = FRAME_RATE): number {
  return Math.floor(seconds * fps);
}

function framesToSeconds(frames: number, fps: number = FRAME_RATE): number {
  return frames / fps;
}

function secondsToSMPTE(seconds: number, fps: number = FRAME_RATE): string {
  const totalFrames = secondsToFrames(seconds, fps);
  const hours = Math.floor(totalFrames / (fps * 3600));
  const minutes = Math.floor((totalFrames % (fps * 3600)) / (fps * 60));
  const secs = Math.floor((totalFrames % (fps * 60)) / fps);
  const frames = totalFrames % fps;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

function sMPTEToSeconds(timecode: string, fps: number = FRAME_RATE): number {
  const parts = timecode.split(':');
  if (parts.length !== 4) return 0;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  const frames = parseInt(parts[3], 10);
  
  const totalFrames = hours * fps * 3600 + minutes * fps * 60 + seconds * fps + frames;
  return framesToSeconds(totalFrames, fps);
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// SequenceTabs Component
function SequenceTabs({
  sequences,
  activeSequenceId,
  onSequenceChange,
}: {
  sequences: Sequence[];
  activeSequenceId: string;
  onSequenceChange?: (sequenceId: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {sequences.map((sequence) => (
        <button
          key={sequence.id}
          onClick={() => onSequenceChange?.(sequence.id)}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            sequence.id === activeSequenceId
              ? 'bg-zinc-700 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-300'
          }`}
        >
          {sequence.name}
        </button>
      ))}
    </div>
  );
}

// ToolbarButtons Component
function ToolbarButtons({
  onBladeTool,
  onSelectTool,
  onTrimTool,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onAddMarker,
  onExport,
  onSave,
  onUndo,
  onRedo,
  activeTool,
  canUndo = false,
  canRedo = false,
  isMac = false,
  segmentFilter,
  onSegmentFilterChange,
  segmentCounts,
  onImplementAllFluff,
}: {
  onBladeTool?: () => void;
  onSelectTool?: () => void;
  onTrimTool?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomToFit?: () => void;
  onAddMarker?: () => void;
  onExport?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  activeTool?: 'blade' | 'select' | 'trim' | null;
  canUndo?: boolean;
  canRedo?: boolean;
  isMac?: boolean;
  segmentFilter?: "FLUFF" | "HIGHLIGHTS" | "ALL";
  onSegmentFilterChange?: (filter: "FLUFF" | "HIGHLIGHTS" | "ALL") => void;
  segmentCounts?: Record<"FLUFF" | "HIGHLIGHTS", number>;
  onImplementAllFluff?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-l border-r border-zinc-700 px-4">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onZoomOut}
                variant="mono"
                size="sm"
                className="px-2"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom Out ({isMac ? '⌘' : 'Ctrl'}-)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onZoomToFit}
                variant="mono"
                size="sm"
                className="px-2"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom to Fit (⇧Z)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onZoomIn}
                variant="mono"
                size="sm"
                className="px-2"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom In ({isMac ? '⌘' : 'Ctrl'}=)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        {/* Timeline Tools */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onBladeTool}
                variant={activeTool === 'blade' ? 'primary' : 'mono'}
                size="sm"
                className="px-2"
              >
                <Scissors className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Blade Tool (B)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onSelectTool}
                variant={activeTool === 'select' ? 'primary' : 'mono'}
                size="sm"
                className="px-2"
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Select Tool (A)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onTrimTool}
                variant={activeTool === 'trim' ? 'primary' : 'mono'}
                size="sm"
                className="px-2"
              >
                <Crop className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Trim Tool (T)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        {/* Markers */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onAddMarker}
                variant="mono"
                size="sm"
                className="px-2"
              >
                <MapPin className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Marker (M)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        {/* Global Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onSave}
                variant="mono"
                size="sm"
                className="px-2"
              >
                <Save className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save ({isMac ? '⌘' : 'Ctrl'}S)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onUndo}
                variant="mono"
                size="sm"
                className="px-2"
                disabled={!canUndo}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo ({isMac ? '⌘' : 'Ctrl'}Z)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onRedo}
                variant="mono"
                size="sm"
                className="px-2"
                disabled={!canRedo}
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo ({isMac ? '⌘' : 'Ctrl'}⇧Z)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onExport}
                variant="mono"
                size="sm"
                className="px-2"
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export ({isMac ? '⌘' : 'Ctrl'}E)</p>
            </TooltipContent>
          </Tooltip>
        </div>

      {segmentFilter !== undefined && onSegmentFilterChange && segmentCounts && (
        <>
          <div className="w-px h-6 bg-zinc-700 mx-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Filter:</span>
            <button
              onClick={() => onSegmentFilterChange("ALL")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                segmentFilter === "ALL"
                  ? "bg-transparent border border-white text-white"
                  : "bg-white text-zinc-900 border border-white"
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => onSegmentFilterChange("FLUFF")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                segmentFilter === "FLUFF"
                  ? "bg-transparent border border-white text-white"
                  : "bg-white text-zinc-900 border border-white"
              }`}
            >
              FLUFF ({segmentCounts.FLUFF})
            </button>
            <button
              onClick={() => onSegmentFilterChange("HIGHLIGHTS")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                segmentFilter === "HIGHLIGHTS"
                  ? "bg-transparent border border-white text-white"
                  : "bg-white text-zinc-900 border border-white"
              }`}
            >
              HIGHLIGHTS ({segmentCounts.HIGHLIGHTS})
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// PlayheadTimeDisplay Component
function PlayheadTimeDisplay({ currentTime }: { currentTime: number }) {
  return (
    <div className="font-mono text-sm text-zinc-300 px-3 py-1.5 bg-zinc-800 rounded">
      {secondsToSMPTE(currentTime)}
    </div>
  );
}

// SMPTETimeRuler Component
function SMPTETimeRuler({
  startTime,
  endTime,
  timelineWidth,
  zoom,
}: {
  startTime: number;
  endTime: number;
  timelineWidth: number;
  zoom: number;
}) {
  const visibleDuration = endTime - startTime;
  
  // Calculate appropriate tick interval based on zoom level
  let frameInterval = 30; // Default: 1 second
  if (zoom === 1) {
    // 2 minutes at 1x zoom: 120 seconds * 30 fps = 3600 frames
    frameInterval = 3600;
  } else if (visibleDuration < 1) {
    frameInterval = 1; // Show every frame when very zoomed in
  } else if (visibleDuration < 5) {
    frameInterval = 5; // Every 5 frames
  } else if (visibleDuration < 10) {
    frameInterval = 15; // Every 0.5 seconds
  } else if (visibleDuration < 30) {
    frameInterval = 30; // Every second
  } else if (visibleDuration < 60) {
    frameInterval = 90; // Every 3 seconds
  } else if (visibleDuration < 300) {
    frameInterval = 300; // Every 10 seconds
  } else {
    frameInterval = 1800; // Every minute
  }
  
  const startFrames = secondsToFrames(startTime);
  const endFrames = secondsToFrames(endTime);
  const startMarker = Math.floor(startFrames / frameInterval) * frameInterval;
  const numMarkers = Math.ceil((endFrames - startMarker) / frameInterval) + 1;
  
  const timeRange = endTime - startTime;
  const pixelsPerSecond = timelineWidth / timeRange;

  // Calculate font size based on pixels per second to ensure readability at all zoom levels
  // When zoomed in (high pixelsPerSecond), use larger font
  // When zoomed out (low pixelsPerSecond), use smaller but still readable font
  // Use square root scaling to handle wide range of values smoothly
  const fontSize = Math.max(10, Math.min(16, 10 + Math.sqrt(Math.max(0, pixelsPerSecond / 2)) * 1.5));

  return (
    <div 
      className="absolute top-0 left-0 h-8 border-b border-zinc-700 bg-zinc-800 overflow-hidden"
      style={{ width: `${timelineWidth}px` }}
    >
      {Array.from({ length: numMarkers }).map((_, i) => {
        const frameTime = startMarker + i * frameInterval;
        const time = framesToSeconds(frameTime);
        if (time > endTime || time < startTime) return null;

        const offset = (time - startTime) * pixelsPerSecond;
        if (offset < 0 || offset > timelineWidth) return null;

        return (
          <div
            key={frameTime}
            className="absolute top-0 h-full flex items-center"
            style={{ left: `${offset}px` }}
          >
            <div className="w-px h-3 bg-zinc-600" />
            <span 
              className="ml-1 text-zinc-400 whitespace-nowrap font-mono"
              style={{ fontSize: `${fontSize}px`, lineHeight: '1' }}
            >
              {secondsToSMPTE(time)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// TrackPanel Component
function TrackPanel({
  tracks,
  onTrackControlChange,
  showScrollbars,
  onScroll,
}: {
  tracks: Track[];
  onTrackControlChange?: (trackId: string, control: 'locked' | 'visible' | 'muted' | 'soloed', value: boolean) => void;
  showScrollbars: boolean;
  onScroll: () => void;
}) {
  const getTrackLabel = (track: Track) => {
    if (track.trackType === 'video') {
      return `V${track.trackIndex + 1}`;
    }
    return `A${track.trackIndex + 1}`;
  };

  return (
    <TooltipProvider>
      <div 
        className={`bg-zinc-800 border-r border-zinc-700 overflow-y-auto ${
          showScrollbars 
            ? '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-zinc-500' 
            : '[&::-webkit-scrollbar]:w-0'
        }`}
        onScroll={onScroll}
        style={{ 
          width: `${TRACK_LABEL_WIDTH}px`,
          scrollbarWidth: showScrollbars ? 'thin' : 'none',
          scrollbarColor: showScrollbars ? '#52525b #27272a' : 'transparent transparent',
          paddingTop: `${RULER_HEIGHT}px`, // Align V1/A1 with timeline frame time
        }}
      >
      {tracks.map((track) => (
        <div
          key={track.id}
          className="relative border-b border-zinc-700"
          style={{ height: `${TRACK_HEIGHT}px` }}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-700">
              <span className="text-xs font-medium text-zinc-300">{getTrackLabel(track)}</span>
            </div>
            <div className="flex items-center justify-center gap-1 px-1 py-1 flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTrackControlChange?.(track.id, 'locked', !track.locked)}
                    className={`p-1 rounded hover:bg-zinc-700 transition-colors ${
                      track.locked ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    {track.locked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <LockOpen className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{track.locked ? 'Unlock track' : 'Lock track'}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTrackControlChange?.(track.id, 'visible', !track.visible)}
                    className={`p-1 rounded hover:bg-zinc-700 transition-colors ${
                      track.visible ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                    disabled={track.locked}
                  >
                    {track.visible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{track.visible ? 'Hide track' : 'Show track'}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTrackControlChange?.(track.id, 'muted', !track.muted)}
                    className={`p-1 rounded hover:bg-zinc-700 transition-colors ${
                      track.muted ? 'text-zinc-500' : 'text-zinc-300'
                    }`}
                    disabled={track.locked || track.trackType === 'video'}
                  >
                    {track.muted ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{track.muted ? 'Unmute track' : 'Mute track'}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTrackControlChange?.(track.id, 'soloed', !track.soloed)}
                    className={`p-1 rounded hover:bg-zinc-700 transition-colors ${
                      track.soloed ? 'text-yellow-400' : 'text-zinc-500'
                    }`}
                    disabled={track.locked || track.trackType === 'video'}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{track.soloed ? 'Unsolo track' : 'Solo track'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      ))}
      </div>
    </TooltipProvider>
  );
}

// Waveform Component
function Waveform({
  audioUrl,
  start,
  end,
  duration,
  width,
  height,
}: {
  audioUrl: string;
  start: number;
  end: number;
  duration: number;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!audioUrl || !canvasRef.current || width <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const loadWaveform = async () => {
      try {
        setIsLoading(true);
        
        // Create absolute URL if needed
        const absoluteUrl = audioUrl.startsWith('http') 
          ? audioUrl 
          : `${window.location.origin}${audioUrl}`;

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(absoluteUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const sampleRate = audioBuffer.sampleRate;
        const channelData = audioBuffer.getChannelData(0);
        const itemStart = Math.max(0, start);
        const itemEnd = Math.min(duration, end);
        const itemDuration = itemEnd - itemStart;
        
        if (itemDuration <= 0) {
          audioContext.close();
          return;
        }

        const startSample = Math.floor(itemStart * sampleRate);
        const endSample = Math.floor(itemEnd * sampleRate);
        const samples = channelData.slice(startSample, endSample);

        const samplesPerPixel = Math.max(1, Math.floor(samples.length / width));
        const peaks: number[] = [];

        for (let i = 0; i < width; i++) {
          const pixelStart = i * samplesPerPixel;
          const pixelEnd = Math.min(pixelStart + samplesPerPixel, samples.length);
          let max = 0;

          for (let j = pixelStart; j < pixelEnd; j++) {
            const value = Math.abs(samples[j]);
            max = Math.max(max, value);
          }

          peaks.push(max);
        }

        const maxPeak = Math.max(...peaks, 0.001);
        const normalizedPeaks = peaks.map(p => (p / maxPeak) * (height / 2 - 2));

        setWaveformData(new Float32Array(normalizedPeaks));

        audioContext.close();
      } catch (error) {
        console.error('Error loading waveform:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWaveform();
  }, [audioUrl, start, end, duration, width, height]);

  useEffect(() => {
    if (!waveformData || !canvasRef.current || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    const centerY = height / 2;

    for (let i = 0; i < waveformData.length; i++) {
      const x = i;
      const amplitude = waveformData[i];
      
      ctx.beginPath();
      ctx.moveTo(x, centerY - amplitude);
      ctx.lineTo(x, centerY + amplitude);
      ctx.stroke();
    }
  }, [waveformData, width, height, isLoading]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.7 }}
    />
  );
}

// TimelineItemComponent
function TimelineItemComponent({
  item,
  startTime,
  endTime,
  timelineWidth,
  onItemClick,
  isHighlighted = false,
  isSelected = false,
  trackType = 'video',
  cutPoints = new Set<number>(),
  isAdjacentToCut = false,
  previousPosition,
  isCutSegment = false,
  videoUrl,
  duration,
  activeTool,
  canDrag = false,
  onMoveItem,
  sequenceId,
  trackId,
  trackLocked = false,
  videoId,
}: {
  item: TimelineItem;
  startTime: number;
  endTime: number;
  timelineWidth: number;
  onItemClick: (item: TimelineItem, e?: React.MouseEvent) => void;
  isHighlighted?: boolean;
  isSelected?: boolean;
  trackType?: 'video' | 'audio';
  cutPoints?: Set<number>;
  isAdjacentToCut?: boolean;
  previousPosition?: { start: number; end: number };
  isCutSegment?: boolean;
  videoUrl?: string;
  duration?: number;
  activeTool?: 'blade' | 'select' | 'trim' | null;
  canDrag?: boolean;
  onMoveItem?: (sequenceId: string, trackId: string, itemId: string, newStart: number, newEnd: number) => void;
  sequenceId?: string;
  trackId?: string;
  trackLocked?: boolean;
  videoId?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const dragStartRef = useRef<{ startX: number; itemStart: number; itemEnd: number } | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  
  // Handle cut segment fade out
  useEffect(() => {
    if (isCutSegment) {
      setOpacity(0);
    } else {
      setOpacity(1);
    }
  }, [isCutSegment]);

  const itemDuration = item.end - item.start;
  const canDragItem = canDrag && activeTool === 'select' && !trackLocked && sequenceId && trackId && onMoveItem;
  
  // Skip full-length background items
  const isFullLengthItem = item.start === 0 && (item.title === 'Video' || item.title === 'Audio');
  const isDraggable = canDragItem && !isFullLengthItem;

  // Handle drag - MUST be before early returns to follow Rules of Hooks
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDraggable || !itemRef.current || !sequenceId || !trackId || !onMoveItem) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const timelineArea = itemRef.current.closest('.timeline-area') as HTMLElement;
    if (!timelineArea) return;
    
    const timelineRect = timelineArea.getBoundingClientRect();
    const timeRange = endTime - startTime;
    const pixelsPerSecond = timelineWidth / timeRange;
    
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX - timelineRect.left,
      itemStart: item.start,
      itemEnd: item.end,
    };
  }, [isDraggable, sequenceId, trackId, onMoveItem, endTime, startTime, timelineWidth, item.start, item.end]);

  useEffect(() => {
    if (!isDragging || !dragStartRef.current || !itemRef.current || !sequenceId || !trackId || !onMoveItem) return;

    const timelineArea = itemRef.current.closest('.timeline-area') as HTMLElement;
    if (!timelineArea) return;

    const timeRange = endTime - startTime;
    const pixelsPerSecond = timelineWidth / timeRange;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      
      const timelineRect = timelineArea.getBoundingClientRect();
      const currentX = e.clientX - timelineRect.left;
      const deltaX = currentX - dragStartRef.current.startX;
      const deltaTime = deltaX / pixelsPerSecond;
      
      // Visual feedback handled via state - actual update happens on mouseUp
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      
      const timelineRect = timelineArea.getBoundingClientRect();
      const currentX = e.clientX - timelineRect.left;
      const deltaX = currentX - dragStartRef.current.startX;
      const deltaTime = deltaX / pixelsPerSecond;
      
      const newStart = Math.max(0, dragStartRef.current.itemStart + deltaTime);
      const newEnd = newStart + itemDuration;
      
      // Ensure end doesn't exceed duration
      const maxEnd = duration || Infinity;
      const finalEnd = Math.min(newEnd, maxEnd);
      const finalStart = finalEnd - itemDuration;
      
      if (finalStart >= 0) {
        onMoveItem(sequenceId, trackId, item.id, finalStart, finalEnd);
      }
      
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, sequenceId, trackId, item.id, onMoveItem, endTime, startTime, timelineWidth, itemDuration, duration]);

  // Early returns - MUST be after all hooks to follow Rules of Hooks
  if (item.end < startTime || item.start > endTime) return null;

  const itemStart = Math.max(item.start, startTime);
  const itemEnd = Math.min(item.end, endTime);
  const timeRange = endTime - startTime;
  
  if (timeRange <= 0 || timelineWidth <= 0) return null;
  
  const startPercent = ((itemStart - startTime) / timeRange) * 100;
  const widthPercent = ((itemEnd - itemStart) / timeRange) * 100;

  const leftPos = (timelineWidth * startPercent) / 100;
  const itemWidth = Math.max((timelineWidth * widthPercent) / 100, 8);

  const isVideo = trackType === 'video';
  const videoColor = '#779ECB';
  const highlightColor = '#a855f7'; // Purple for highlights
  const audioColor = '#2E2E33';
  const audioHighlightColor = '#6b46c1'; // Purple for audio highlights (darker)

  // Selection takes priority over highlight
  const selectionBorderColor = '#fbbf24'; // Amber/yellow for selection
  const backgroundColor = isVideo 
    ? (isHighlighted ? highlightColor : videoColor)
    : (isHighlighted ? audioHighlightColor : audioColor);
  const borderColor = isSelected 
    ? selectionBorderColor
    : (isVideo 
      ? (isHighlighted ? '#9333ea' : '#6b8db8')
      : (isHighlighted ? '#7c3aed' : '#25252a'));

  // Ensure minimum width for visibility
  const displayWidth = Math.max(itemWidth, 8);

  // Check if this item has cut points at start or end
  const hasCutAtStart = cutPoints.has(item.start);
  const hasCutAtEnd = cutPoints.has(item.end);
  
  // Determine which edge should be curved for adjacent items
  const shouldCurveLeft = isAdjacentToCut && cutPoints.has(item.end);
  const shouldCurveRight = isAdjacentToCut && cutPoints.has(item.start);
  
  // Calculate border radius for curved ends - more pronounced for adjacent items
  const baseRadius = '6px';
  const curvedRadius = isAdjacentToCut ? '16px' : '12px';
  const borderRadius = hasCutAtStart || hasCutAtEnd || isAdjacentToCut ? curvedRadius : baseRadius;
  const borderTopLeftRadius = (hasCutAtStart || shouldCurveLeft) ? curvedRadius : baseRadius;
  const borderTopRightRadius = (hasCutAtEnd || shouldCurveRight) ? curvedRadius : baseRadius;
  const borderBottomLeftRadius = borderTopLeftRadius;
  const borderBottomRightRadius = borderTopRightRadius;

  const handleDownloadHighlight = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoId || !duration || isDownloading) return;
    
    try {
      setIsDownloading(true);
      const blob = await exportHighlight(videoId, item.start, item.end, duration);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `highlight_${item.start.toFixed(2)}s_${item.end.toFixed(2)}s.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading highlight:", err);
    } finally {
      setIsDownloading(false);
    }
  }, [videoId, duration, item.start, item.end, isDownloading]);

  // Calculate if position changed for animation
  const hasPositionChanged = previousPosition && (
    Math.abs(previousPosition.start - item.start) > 0.01 || 
    Math.abs(previousPosition.end - item.end) > 0.01
  );
  
  // Calculate previous left position if available
  let previousLeftPos = leftPos;
  if (previousPosition && hasPositionChanged) {
    const prevItemStart = Math.max(previousPosition.start, startTime);
    const prevItemEnd = Math.min(previousPosition.end, endTime);
    const timeRange = endTime - startTime;
    if (timeRange > 0 && timelineWidth > 0) {
      const prevStartPercent = ((prevItemStart - startTime) / timeRange) * 100;
      previousLeftPos = (timelineWidth * prevStartPercent) / 100;
    }
  }

  const itemContent = (
    <motion.div
      ref={itemRef}
      layout
      className="absolute border-2 overflow-hidden"
      style={{
        left: `${leftPos}px`,
        width: `${displayWidth}px`,
        minWidth: `${displayWidth}px`,
        top: '0',
        height: `${TRACK_HEIGHT}px`,
        zIndex: isDragging ? 40 : (isSelected ? 30 : (isHighlighted ? 20 : 10)),
        marginLeft: '0',
        marginRight: '0',
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.5)' : (isHighlighted ? `0 4px 6px -1px ${backgroundColor}40` : 'none'),
        borderRadius: borderRadius,
        borderTopLeftRadius: borderTopLeftRadius,
        borderTopRightRadius: borderTopRightRadius,
        borderBottomLeftRadius: borderBottomLeftRadius,
        borderBottomRightRadius: borderBottomRightRadius,
        cursor: isDraggable ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        opacity: isDragging ? 0.8 : opacity,
      }}
      animate={{
        opacity: isCutSegment ? 0 : (isDragging ? 0.8 : opacity),
        ...(hasPositionChanged && !isCutSegment ? { left: `${leftPos}px` } : {}),
      }}
      transition={
        (hasPositionChanged && !isCutSegment
          ? {
              layout: {
                type: "spring",
                stiffness: 300,
                damping: 30,
              },
              left: {
                duration: 0.25,
                ease: 'easeOut',
                delay: 0.1, // 100ms gap before fill animation starts
              },
              opacity: { duration: 0 },
            }
          : isCutSegment
          ? {
              layout: {
                type: "spring",
                stiffness: 300,
                damping: 30,
              },
              opacity: { duration: 0.15, ease: 'easeOut' },
            }
          : {
              layout: {
                type: "spring",
                stiffness: 300,
                damping: 30,
              },
              opacity: { duration: 0 },
            }) as any
      }
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        // For full-length items (starting at 0), don't stop propagation
        // This allows clicking through full-length items to seek to clicked position
        // Full-length items are typically the background video track
        if (isFullLengthItem) {
          return;
        }
        
        // Don't trigger click if we were dragging
        if (isDragging) {
          e.stopPropagation();
          return;
        }
        
        e.stopPropagation();
        onItemClick(item, e);
      }}
      title={`${item.title}\n${secondsToSMPTE(item.start)} - ${secondsToSMPTE(item.end)}`}
    >
      {trackType === 'audio' && videoUrl && duration && displayWidth > 20 && (
        <Waveform
          audioUrl={videoUrl}
          start={item.start}
          end={item.end}
          duration={duration}
          width={displayWidth}
          height={TRACK_HEIGHT - 4}
        />
      )}
      {displayWidth > 60 && (
        <>
          {trackType === 'audio' && (
            <div className="absolute top-0 left-0 px-2 pt-1 z-10">
              <span className="text-xs text-white font-medium truncate opacity-80">{item.title}</span>
            </div>
          )}
          {trackType === 'video' && (
            <div className="flex items-center h-full px-2 relative">
              <span className="text-xs text-white font-medium truncate">{item.title}</span>
              {isHighlighted && item.rank !== undefined && (
                <div className="absolute top-1 left-1 flex items-center justify-center min-w-[20px] h-5 px-1 bg-white rounded-full border border-black/30 shadow-md" style={{ zIndex: 50 }}>
                  <span className="text-xs font-bold text-black leading-none">{item.rank}</span>
                </div>
              )}
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 text-[10px] text-white/80 px-2 pb-1 font-mono bg-black/20">
            {secondsToSMPTE(item.start)} - {secondsToSMPTE(item.end)}
          </div>
        </>
      )}
      {displayWidth <= 60 && displayWidth > 8 && (
        <div className="w-full h-full flex items-center justify-center relative">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: isVideo ? (isHighlighted ? '#a855f7' : '#779ECB') : '#2E2E33' }}
          />
          {isHighlighted && item.rank !== undefined && (
            <div className="absolute top-0 left-0 flex items-center justify-center min-w-[16px] h-4 px-0.5 bg-white rounded-full border border-black/30 shadow-md" style={{ zIndex: 50 }}>
              <span className="text-[10px] font-bold text-black leading-none">{item.rank}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );

  if (isHighlighted && trackType === 'video' && videoId && duration) {
    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          {itemContent}
        </HoverCardTrigger>
        <HoverCardContent className="w-auto">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold text-white">{item.title}</div>
            <div className="text-xs text-zinc-400">
              {secondsToSMPTE(item.start)} - {secondsToSMPTE(item.end)}
            </div>
            <Button
              onClick={handleDownloadHighlight}
              disabled={isDownloading}
              variant="primary"
              size="sm"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Downloading..." : "Save"}
            </Button>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return itemContent;
}

// SegmentOverlay Component - displays segment labels on video track with keep toggle
function SegmentOverlay({
  segment,
  startTime,
  endTime,
  timelineWidth,
  timeline,
  onToggleSegmentKeep,
}: {
  segment: SegmentAnalysis;
  startTime: number;
  endTime: number;
  timelineWidth: number;
  timeline?: EditableSegment[];
  onToggleSegmentKeep?: (id: string) => void;
}) {
  // Validate segment times
  if (segment.end_time <= segment.start_time || segment.start_time < 0) {
    return null; // Skip invalid segments
  }
  
  // Check if segment is outside visible time range
  if (segment.end_time < startTime || segment.start_time > endTime) return null;

  const segmentStart = Math.max(segment.start_time, startTime);
  const segmentEnd = Math.min(segment.end_time, endTime);
  const timeRange = endTime - startTime;
  
  if (timeRange <= 0 || timelineWidth <= 0) return null;
  
  const startPercent = ((segmentStart - startTime) / timeRange) * 100;
  const widthPercent = ((segmentEnd - segmentStart) / timeRange) * 100;

  const leftPos = (timelineWidth * startPercent) / 100;
  const segmentWidth = Math.max((timelineWidth * widthPercent) / 100, 4);

  // Find corresponding timeline segment to check keep state
  const timelineSegment = timeline?.find(t => 
    Math.abs(t.start - segment.start_time) < 0.01 && 
    Math.abs(t.end - segment.end_time) < 0.01
  );
  const isKept = !timelineSegment || timelineSegment.keep;

  // Color coding based on label and keep state
  const getSegmentColors = (label: string, kept: boolean) => {
    if (!kept) {
      // Removed segments shown with grey (unavailable)
      return {
        bg: 'rgba(63, 63, 70, 0.85)', // zinc-700 solid grey
        border: 'rgba(82, 82, 91, 0.8)', // zinc-600
        text: 'rgb(113, 113, 122)', // zinc-500
      };
    }
    if (label === 'FLUFF') {
      return {
        bg: 'rgba(239, 68, 68, 0.3)', // red-500 with 30% opacity
        border: 'rgba(239, 68, 68, 0.5)', // red-500 with 50% opacity
        text: 'rgb(252, 165, 165)', // red-300
      };
    }
    if (label === 'HIGHLIGHTS') {
      return {
        bg: 'rgba(168, 85, 247, 0.3)', // purple-500 with 30% opacity
        border: 'rgba(168, 85, 247, 0.5)', // purple-500 with 50% opacity
        text: 'rgb(196, 181, 253)', // purple-300
      };
    }
    return {
      bg: 'rgba(113, 113, 122, 0.2)', // zinc-500 with 20% opacity
      border: 'rgba(113, 113, 122, 0.3)', // zinc-400 with 30% opacity
      text: 'rgb(212, 212, 216)', // zinc-300
    };
  };

  const colors = getSegmentColors(segment.label, isKept);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timelineSegment && onToggleSegmentKeep) {
      onToggleSegmentKeep(timelineSegment.id);
    }
  };

  return (
    <div
      className={`absolute top-0 bottom-0 border-l border-r cursor-pointer hover:opacity-90 transition-opacity`}
      style={{
        left: `${leftPos}px`,
        width: `${segmentWidth}px`,
        zIndex: 30,
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
      title={`${segment.label} (${segment.rating.toFixed(2)}): ${segment.reason}\nClick to ${isKept ? 'remove' : 'restore'}`}
      onClick={handleClick}
    >
      {/* Grey "unavailable" overlay for cut segments */}
      {!isKept && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(63, 63, 70, 0.9)',
            zIndex: 31,
          }}
        />
      )}
      {segmentWidth > 50 && (
        <div className="absolute top-1 left-1 right-1 flex items-center justify-between" style={{ zIndex: 32 }}>
          <div 
            className={`text-[10px] font-medium truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${!isKept ? 'line-through' : ''}`}
            style={{ color: colors.text }}
          >
            {segment.label}
          </div>
          {segmentWidth > 80 && (
            <div 
              className="text-[9px] px-1 rounded"
              style={{ 
                backgroundColor: isKept ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.5)',
                color: isKept ? 'rgb(134, 239, 172)' : 'rgb(252, 165, 165)',
              }}
            >
              {isKept ? 'KEEP' : 'CUT'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// TimelineTrack Component
function TimelineTrack({
  track,
  startTime,
  endTime,
  timelineWidth,
  onItemClick,
  hoverTime,
  isHighlightTrack,
  segments,
  cutPoints = new Set<number>(),
  adjacentItems = new Set<string>(),
  previousItemPositions,
  timeline,
  onToggleSegmentKeep,
  videoUrl,
  duration,
  selectedItemIds = new Set<string>(),
  activeTool,
  onMoveItem,
  sequenceId,
  videoId,
  gaps,
}: {
  track: Track;
  startTime: number;
  endTime: number;
  timelineWidth: number;
  onItemClick: (item: TimelineItem, e?: React.MouseEvent) => void;
  hoverTime: number | null;
  isHighlightTrack: boolean;
  segments?: SegmentAnalysis[];
  cutPoints?: Set<number>;
  gaps?: [number, number][];
  adjacentItems?: Set<string>;
  previousItemPositions?: Map<string, { start: number; end: number }>;
  timeline?: EditableSegment[];
  onToggleSegmentKeep?: (id: string) => void;
  videoUrl?: string;
  duration?: number;
  selectedItemIds?: Set<string>;
  activeTool?: 'blade' | 'select' | 'trim' | null;
  onMoveItem?: (sequenceId: string, trackId: string, itemId: string, newStart: number, newEnd: number) => void;
  sequenceId?: string;
  videoId?: string;
}) {
  if (!track.visible) {
    return (
      <div
        className="relative border-b border-zinc-700 bg-zinc-900/50"
        style={{ height: `${TRACK_HEIGHT}px` }}
      />
    );
  }

  // Only show segment overlays on video tracks (trackIndex 0)
  const showSegments = track.trackIndex === 0 && segments;

  return (
    <div
      className="relative border-b border-zinc-700 opacity-100"
      style={{ 
        height: `${TRACK_HEIGHT}px`,
        marginLeft: '0',
        paddingLeft: '0',
      }}
    >
      {track.items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-zinc-500">No items</span>
        </div>
      )}
      {track.items.map((item) => {
        // Check if this item is a removed segment (keep=false in timeline)
        const timelineSegment = timeline?.find(t => 
          Math.abs(t.start - item.start) < 0.01 && 
          Math.abs(t.end - item.end) < 0.01
        );
        const isCutSegment = timelineSegment ? !timelineSegment.keep : false;
        
        // Highlights are always highlighted (green), but no hover effects
        const isHighlighted = item.isHighlight;
        const isSelected = selectedItemIds.has(item.id);
        const isAdjacent = adjacentItems.has(item.id);
        const previousPosition = previousItemPositions?.get(item.id);
        
        return (
          <div key={item.id} className="relative" style={{ zIndex: isSelected ? 30 : (isHighlighted ? 20 : 10) }}>
            <TimelineItemComponent
              item={item}
              startTime={startTime}
              endTime={endTime}
              timelineWidth={timelineWidth}
              onItemClick={onItemClick}
              isHighlighted={isHighlighted}
              isSelected={isSelected}
              trackType={track.trackType}
              cutPoints={cutPoints}
              isAdjacentToCut={isAdjacent}
              previousPosition={previousPosition}
              isCutSegment={isCutSegment}
              videoUrl={videoUrl}
              duration={duration}
              activeTool={activeTool}
              canDrag={!!onMoveItem}
              onMoveItem={onMoveItem}
              sequenceId={sequenceId}
              trackId={track.id}
              trackLocked={track.locked}
              videoId={videoId}
            />
          </div>
        );
      })}
      
      {/* Segment overlays - rendered on top of items, clickable for keep toggle */}
      {showSegments && segments.map((segment, idx) => (
        <SegmentOverlay
          key={`segment-${idx}`}
          segment={segment}
          startTime={startTime}
          endTime={endTime}
          timelineWidth={timelineWidth}
          timeline={timeline}
          onToggleSegmentKeep={onToggleSegmentKeep}
        />
      ))}
      
      {/* Gap overlays - show cut/removed regions with grey overlay */}
      {gaps && gaps.map(([gapStart, gapEnd], idx) => {
        const timeRange = endTime - startTime;
        if (timeRange <= 0) return null;
        
        // Only show gaps that are visible in current view
        if (gapEnd < startTime || gapStart > endTime) return null;
        
        const visibleStart = Math.max(gapStart, startTime);
        const visibleEnd = Math.min(gapEnd, endTime);
        
        const leftPercent = ((visibleStart - startTime) / timeRange) * 100;
        const widthPercent = ((visibleEnd - visibleStart) / timeRange) * 100;
        const leftPos = (timelineWidth * leftPercent) / 100;
        const width = Math.max((timelineWidth * widthPercent) / 100, 2);
        
        return (
          <div
            key={`gap-${idx}`}
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `${leftPos}px`,
              width: `${width}px`,
              background: 'rgba(63, 63, 70, 0.85)',
              borderLeft: '2px solid rgba(82, 82, 91, 0.8)',
              borderRight: '2px solid rgba(82, 82, 91, 0.8)',
              zIndex: 25,
            }}
            title={`Cut: ${gapStart.toFixed(1)}s - ${gapEnd.toFixed(1)}s (skipped)`}
          />
        );
      })}
    </div>
  );
}

// Enhanced Playhead Component with drag
function Playhead({
  currentTime,
  startTime,
  endTime,
  timelineWidth,
  isDragging,
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  currentTime: number;
  startTime: number;
  endTime: number;
  timelineWidth: number;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onDrag: (e: MouseEvent) => void;
  onDragEnd: () => void;
}) {
  const timeRange = endTime - startTime;
  const playheadPercent = timeRange > 0 ? ((currentTime - startTime) / timeRange) * 100 : 0;
  const leftPos = (timelineWidth * playheadPercent) / 100;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-auto cursor-col-resize"
      style={{ left: `${leftPos}px` }}
      onMouseDown={onDragStart}
    >
      <div 
        className="absolute -top-3 -left-2 w-5 h-5 bg-red-500 rounded-full border-2 border-zinc-900 hover:bg-red-400 transition-colors"
        style={{ cursor: 'col-resize' }}
      />
    </div>
  );
}

// Hover Playhead Component
function HoverPlayhead({
  hoverTime,
  startTime,
  endTime,
  timelineWidth,
}: {
  hoverTime: number | null;
  startTime: number;
  endTime: number;
  timelineWidth: number;
}) {
  if (hoverTime === null) return null;

  const timeRange = endTime - startTime;
  const playheadPercent = timeRange > 0 ? ((hoverTime - startTime) / timeRange) * 100 : 0;
  const leftPos = (timelineWidth * playheadPercent) / 100;

  if (hoverTime < startTime || hoverTime > endTime) return null;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/70 z-25 pointer-events-none"
      style={{ left: `${leftPos}px` }}
    />
  );
}

// HorizontalScrollbar Component
function HorizontalScrollbar({
  duration,
  startTime,
  endTime,
  timelineWidth,
  onScroll,
  showScrollbars,
}: {
  duration: number;
  startTime: number;
  endTime: number;
  timelineWidth: number;
  onScroll: (scrollLeft: number) => void;
  showScrollbars: boolean;
}) {
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartScroll, setDragStartScroll] = useState(0);

  const visibleDuration = endTime - startTime;
  const thumbWidth = Math.max(20, (visibleDuration / duration) * timelineWidth);
  const thumbLeft = (startTime / duration) * timelineWidth;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollbarRef.current) return;
    const rect = scrollbarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Check if clicking on thumb or track
    if (x >= thumbLeft && x <= thumbLeft + thumbWidth) {
      // Dragging thumb
      setIsDragging(true);
      setDragStartX(e.clientX);
      setDragStartScroll(startTime);
    } else {
      // Jump to position
      const newScrollTime = (x / timelineWidth) * duration;
      const newStartTime = Math.max(0, Math.min(newScrollTime, duration - visibleDuration));
      onScroll(newStartTime);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const pixelsPerSecond = timelineWidth / duration;
      const deltaTime = deltaX / pixelsPerSecond;
      const newStartTime = Math.max(0, Math.min(dragStartScroll + deltaTime, duration - visibleDuration));
      onScroll(newStartTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartX, dragStartScroll, duration, visibleDuration, timelineWidth, onScroll]);

  return (
    <div
      ref={scrollbarRef}
      className={`h-4 bg-zinc-800 border-t border-zinc-700 cursor-pointer transition-opacity ${
        showScrollbars ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => {}}
      style={{ width: `${timelineWidth}px` }}
    >
      <div
        className="h-full bg-zinc-600 hover:bg-zinc-500 transition-colors rounded"
        style={{
          width: `${thumbWidth}px`,
          marginLeft: `${thumbLeft}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      />
    </div>
  );
}

// Main Timeline Component
export function Timeline({
  sequences,
  tracks: legacyTracks,
  currentTime,
  duration,
  onSeek,
  onPlayPause,
  isPlaying = false,
  className = "",
  activeSequenceId,
  onSequenceChange,
  onTrackControlChange,
  segments,
  onBladeTool,
  onSelectTool,
  onTrimTool,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onAddMarker,
  onExport,
  onSave,
  onUndo,
  onRedo,
  activeTool,
  canUndo,
  canRedo,
  isMac = false,
  segmentFilter,
  onSegmentFilterChange,
  segmentCounts,
  onPlaybackRateChange,
  playbackRate = 1,
  timeline,
  onToggleSegmentKeep,
  onImplementAllFluff,
  previousItemPositions,
  originalTracks,
  videoUrl,
  videoId,
  gaps,
  acceptedSegments,
  onSplitClip,
  onTrimClip,
  selectedItemIds,
  onItemSelect,
  onMoveItem,
}: TimelineProps) {
  // Extract cut points from segments where keep=false
  const cutPoints = useMemo(() => {
    const points = new Set<number>();
    if (timeline) {
      timeline.filter(s => !s.keep).forEach((seg) => {
        points.add(seg.start);
        points.add(seg.end);
      });
    }
    return points;
  }, [timeline]);

  // Identify items adjacent to cuts (for curved edges)
  const adjacentItems = useMemo(() => {
    const adjacent = new Set<string>();
    if (!timeline) return adjacent;
    
    const removedSegments = timeline.filter(s => !s.keep);
    if (removedSegments.length === 0) return adjacent;
    
    // Use originalTracks if provided, otherwise fall back to legacyTracks
    const tracksToCheck = originalTracks || legacyTracks;
    if (!tracksToCheck || tracksToCheck.length === 0) return adjacent;
    
    // Get all items from original tracks
    const allOriginalItems = tracksToCheck.flatMap(t => t.items);
    
    // For each removed segment, find adjacent items
    removedSegments.forEach((seg) => {
      allOriginalItems.forEach(item => {
        if (Math.abs(item.end - seg.start) < 0.01) {
          adjacent.add(item.id);
        }
        if (Math.abs(item.start - seg.end) < 0.01) {
          adjacent.add(item.id);
        }
      });
    });
    
    return adjacent;
  }, [timeline, originalTracks, legacyTracks]);

  // Create default sequence from legacy tracks or use provided sequences
  const defaultSequence = useMemo<Sequence | null>(() => {
    if (sequences && sequences.length > 0) {
      return sequences[0];
    }
    
    if (legacyTracks && legacyTracks.length > 0) {
      // V1 only for now
      const videoTracks: Track[] = Array.from({ length: 1 }, (_, i) => ({
        id: `video-track-${i}`,
        items: legacyTracks[i]?.items || [],
        trackType: 'video' as const,
        trackIndex: i,
        locked: false,
        visible: true,
        muted: false,
        soloed: false,
      }));
      // Commented out V2, V3 for now
      // const videoTracks: Track[] = Array.from({ length: 3 }, (_, i) => ({
      //   id: `video-track-${i}`,
      //   items: legacyTracks[i]?.items || [],
      //   trackType: 'video' as const,
      //   trackIndex: i,
      //   locked: false,
      //   visible: true,
      //   muted: false,
      //   soloed: false,
      // }));
      
      // A1 only for now
      const audioTracks: Track[] = Array.from({ length: 1 }, (_, i) => ({
        id: `audio-track-${i}`,
        items: [],
        trackType: 'audio' as const,
        trackIndex: i,
        locked: false,
        visible: true,
        muted: false,
        soloed: false,
      }));
      // Commented out A2, A3 for now
      // const audioTracks: Track[] = Array.from({ length: 3 }, (_, i) => ({
      //   id: `audio-track-${i}`,
      //   items: [],
      //   trackType: 'audio' as const,
      //   trackIndex: i,
      //   locked: false,
      //   visible: true,
      //   muted: false,
      //   soloed: false,
      // }));
      
      return {
        id: 'default-sequence',
        name: 'Sequence 01',
        videoTracks,
        audioTracks,
        duration,
      };
    }
    
    // Empty default sequence (V1 and A1 only for now)
    const videoTracks: Track[] = Array.from({ length: 1 }, (_, i) => ({
      id: `video-track-${i}`,
      items: [],
      trackType: 'video' as const,
      trackIndex: i,
      locked: false,
      visible: true,
      muted: false,
      soloed: false,
    }));
    // Commented out V2, V3 for now
    // const videoTracks: Track[] = Array.from({ length: 3 }, (_, i) => ({
    //   id: `video-track-${i}`,
    //   items: [],
    //   trackType: 'video' as const,
    //   trackIndex: i,
    //   locked: false,
    //   visible: true,
    //   muted: false,
    //   soloed: false,
    // }));
    
    const audioTracks: Track[] = Array.from({ length: 1 }, (_, i) => ({
      id: `audio-track-${i}`,
      items: [],
      trackType: 'audio' as const,
      trackIndex: i,
      locked: false,
      visible: true,
      muted: false,
      soloed: false,
    }));
    // Commented out A2, A3 for now
    // const audioTracks: Track[] = Array.from({ length: 3 }, (_, i) => ({
    //   id: `audio-track-${i}`,
    //   items: [],
    //   trackType: 'audio' as const,
    //   trackIndex: i,
    //   locked: false,
    //   visible: true,
    //   muted: false,
    //   soloed: false,
    // }));
    
    return {
      id: 'default-sequence',
      name: 'Sequence 01',
      videoTracks,
      audioTracks,
      duration,
    };
  }, [sequences, legacyTracks, duration]);

  const sequenceList = sequences && sequences.length > 0 ? sequences : (defaultSequence ? [defaultSequence] : []);
  const activeSeqId = activeSequenceId || (defaultSequence?.id || '');
  const activeSequence = sequenceList.find(s => s.id === activeSeqId) || defaultSequence;

  const [zoom, setZoom] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineAreaRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isPlayheadDragging, setIsPlayheadDragging] = useState(false);
  const playheadDragRef = useRef<{ startX: number; startTime: number; wasPlaying: boolean } | null>(null);
  const [showScrollbars, setShowScrollbars] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [localCurrentTime, setLocalCurrentTime] = useState(currentTime);
  const [localSelectedItems, setLocalSelectedItems] = useState<Set<string>>(selectedItemIds || new Set());

  const timelineWidth = containerWidth;
  const visibleDuration = useMemo(() => duration / zoom, [duration, zoom]);
  const startTime = useMemo(() => Math.max(0, Math.min(scrollLeft, Math.max(0, duration - visibleDuration))), [scrollLeft, duration, visibleDuration]);
  const endTime = useMemo(() => Math.min(duration, startTime + visibleDuration), [duration, startTime, visibleDuration]);

  // Expose zoom controls via ref for external control
  const zoomControlRef = useRef<{ zoomIn: () => void; zoomOut: () => void; zoomToFit: () => void } | null>(null);
  
  zoomControlRef.current = {
    zoomIn: () => setZoom(prev => Math.min(10, prev * 1.2)),
    zoomOut: () => setZoom(prev => Math.max(0.1, prev / 1.2)),
    zoomToFit: () => setZoom(1),
  };

  // Handle external zoom callbacks
  useEffect(() => {
    if (onZoomIn && zoomControlRef.current) {
      (window as any).__timelineZoomIn = zoomControlRef.current.zoomIn;
    }
    if (onZoomOut && zoomControlRef.current) {
      (window as any).__timelineZoomOut = zoomControlRef.current.zoomOut;
    }
    if (onZoomToFit && zoomControlRef.current) {
      (window as any).__timelineZoomToFit = zoomControlRef.current.zoomToFit;
    }
    return () => {
      delete (window as any).__timelineZoomIn;
      delete (window as any).__timelineZoomOut;
      delete (window as any).__timelineZoomToFit;
    };
  }, [onZoomIn, onZoomOut, onZoomToFit]);

  // Handle wheel zoom (touchpad pinch-to-zoom)
  const handleWheelZoom = useCallback((e: React.WheelEvent) => {
    // Check for Ctrl/Cmd key (pinch zoom on trackpads) or ctrlKey in wheel event
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY;
      const zoomFactor = delta > 0 ? 0.9 : 1.1; // Zoom out on scroll down, zoom in on scroll up
      const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));
      
      // Calculate mouse position relative to timeline
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseTime = startTime + (mouseX / timelineWidth) * visibleDuration;
      
      setZoom(newZoom);
      
      // Adjust scroll to keep the time under the mouse cursor in the same position
      const newVisibleDuration = duration / newZoom;
      const newStartTime = Math.max(0, Math.min(mouseTime - (mouseX / timelineWidth) * newVisibleDuration, duration - newVisibleDuration));
      setScrollLeft(newStartTime);
    }
  }, [zoom, duration, startTime, visibleDuration, timelineWidth]);

  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        const width = timelineRef.current.clientWidth;
        setContainerWidth(width);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Sync local current time with prop (but not during dragging)
  useEffect(() => {
    if (!isPlayheadDragging) {
      setLocalCurrentTime(currentTime);
    }
  }, [currentTime, isPlayheadDragging]);

  // Sync selection state with prop
  useEffect(() => {
    if (selectedItemIds) {
      setLocalSelectedItems(new Set(selectedItemIds));
    }
  }, [selectedItemIds]);

  // Sync scroll position when currentTime changes externally (during playback)
  useEffect(() => {
    if (isPlayheadDragging) return;
    const timeInView = currentTime >= startTime && currentTime <= endTime;
    if (!timeInView && duration > 0) {
      // Center playhead in view
      const newStartTime = Math.max(0, Math.min(currentTime - visibleDuration / 2, duration - visibleDuration));
      setScrollLeft(newStartTime);
    }
  }, [currentTime, duration, visibleDuration, isPlayheadDragging, startTime, endTime]);

  // Handle scrollbar visibility on scroll
  const handleScroll = useCallback(() => {
    setShowScrollbars(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setShowScrollbars(false);
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Playhead drag handlers
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPlayheadDragging(true);
    playheadDragRef.current = {
      startX: e.clientX,
      startTime: localCurrentTime,
      wasPlaying: isPlaying || false,
    };
    // Pause video when starting to drag
    if (isPlaying && onPlayPause) {
      onPlayPause();
    }
  }, [localCurrentTime, isPlaying, onPlayPause]);

  useEffect(() => {
    if (!isPlayheadDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!playheadDragRef.current || !timelineAreaRef.current) return;
      
      const rect = timelineAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / timelineWidth));
      const newTime = startTime + percent * (endTime - startTime);
      let clampedTime = Math.max(0, Math.min(duration, newTime));
      
      // Skip over gaps - if dragging into a gap, move to end of gap
      if (gaps && gaps.length > 0) {
        for (const [gapStart, gapEnd] of gaps) {
          if (clampedTime >= gapStart && clampedTime < gapEnd) {
            clampedTime = gapEnd;
            break;
          }
        }
      }
      
      // Update local time immediately for smooth dragging
      setLocalCurrentTime(clampedTime);
      
      // Call onSeek to update parent
      if (onSeek) {
        onSeek(clampedTime);
      }
    };

    const handleMouseUp = () => {
      const wasPlaying = playheadDragRef.current?.wasPlaying || false;
      const dragStartTime = playheadDragRef.current?.startTime || localCurrentTime;
      const timeChanged = Math.abs(localCurrentTime - dragStartTime) > 0.1; // More than 0.1 seconds difference
      
      setIsPlayheadDragging(false);
      playheadDragRef.current = null;
      
      // Resume playback if it was playing before drag and time changed
      if (wasPlaying && timeChanged && onPlayPause) {
        // Small delay to ensure seek completes before resuming
        setTimeout(() => {
          onPlayPause();
        }, 50);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPlayheadDragging, timelineWidth, startTime, endTime, duration, onSeek, gaps]);

  const handleTimelineMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlayheadDragging || !timelineAreaRef.current) return;

    const rect = timelineAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Account for scroll position
    const scrollLeft = e.currentTarget.scrollLeft;
    const adjustedX = x + scrollLeft;
    
    if (timelineWidth <= 0) return;
    
    const percent = Math.max(0, Math.min(1, adjustedX / timelineWidth));
    const hoveredTime = startTime + percent * (endTime - startTime);
    
    setHoverTime(Math.max(0, Math.min(duration, hoveredTime)));
  }, [isPlayheadDragging, timelineWidth, startTime, endTime, duration]);

  const handleTimelineMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlayheadDragging) return;
    
    // Don't handle clicks on child elements (tracks, items, etc.)
    if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('[data-timeline-item]')) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Account for scroll position
    const scrollLeft = e.currentTarget.scrollLeft;
    const adjustedX = x + scrollLeft;
    
    if (timelineWidth <= 0) return;
    
    const percent = Math.max(0, Math.min(1, adjustedX / timelineWidth));
    const clickedTime = startTime + percent * (endTime - startTime);
    let clampedTime = Math.max(0, Math.min(duration, clickedTime));

    // Check if clicked time is in a gap - if so, skip to end of gap
    if (gaps && gaps.length > 0) {
      for (const [gapStart, gapEnd] of gaps) {
        if (clampedTime >= gapStart && clampedTime < gapEnd) {
          // Clicked in a gap - move to end of gap
          clampedTime = gapEnd;
          break;
        }
      }
    }

    // Handle blade tool: Split clips at clicked time
    if (activeTool === 'blade' && onSplitClip && activeSequence) {
      const allTracks = [...activeSequence.videoTracks, ...activeSequence.audioTracks];
      allTracks.forEach(track => {
        track.items.forEach(item => {
          // Check if item intersects with the split time (but not at exact start/end)
          if (clampedTime > item.start && clampedTime < item.end) {
            onSplitClip(activeSequence.id, track.id, item.id, clampedTime);
          }
        });
      });
      return; // Don't seek when using blade tool
    }

    // Handle select tool: Deselect all on empty click
    if (activeTool === 'select') {
      if (onItemSelect) {
        // Deselect all by clearing selection
        setLocalSelectedItems(new Set());
      }
      return; // Don't seek when using select tool
    }

    // Update local time immediately for instant visual feedback
    setLocalCurrentTime(clampedTime);
    
    // Call onSeek to update parent
    if (onSeek) {
      onSeek(clampedTime);
    }
    
    // Start playback if not already playing
    if (!isPlaying && onPlayPause) {
      onPlayPause();
    }
  };

  const handleItemClick = useCallback((item: TimelineItem, e?: React.MouseEvent) => {
    // Handle select tool
    if (activeTool === 'select') {
      const multiSelect = e?.shiftKey || e?.ctrlKey || e?.metaKey || false;
      
      if (multiSelect) {
        // Toggle selection
        setLocalSelectedItems(prev => {
          const newSet = new Set(prev);
          if (newSet.has(item.id)) {
            newSet.delete(item.id);
          } else {
            newSet.add(item.id);
          }
          if (onItemSelect) {
            onItemSelect(item.id, true);
          }
          return newSet;
        });
      } else {
        // Single select
        setLocalSelectedItems(new Set([item.id]));
        if (onItemSelect) {
          onItemSelect(item.id, false);
        }
      }
      return; // Don't seek when using select tool
    }

    // Default behavior: seek to item start
    onSeek?.(item.start);
  }, [activeTool, onItemSelect, onSeek]);

  const allTracks = activeSequence ? [...activeSequence.videoTracks, ...activeSequence.audioTracks] : [];
  const totalTracksHeight = allTracks.length * TRACK_HEIGHT;

  return (
    <div className={`flex flex-col bg-zinc-900 ${className}`}>
      {/* Top Bar */}
      <TooltipProvider>
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700 bg-zinc-800">
          <div className="flex items-center gap-4">
            <SequenceTabs
              sequences={sequenceList}
              activeSequenceId={activeSeqId}
              onSequenceChange={onSequenceChange}
            />
            <PlayheadTimeDisplay currentTime={currentTime} />
            
            {/* Toolbar Buttons */}
            <ToolbarButtons
            onBladeTool={onBladeTool}
            onSelectTool={onSelectTool}
            onTrimTool={onTrimTool}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onZoomToFit={onZoomToFit}
            onAddMarker={onAddMarker}
            onExport={onExport}
            onSave={onSave}
            onUndo={onUndo}
            onRedo={onRedo}
            activeTool={activeTool}
            canUndo={canUndo}
            canRedo={canRedo}
            isMac={isMac}
            segmentFilter={segmentFilter}
            onSegmentFilterChange={onSegmentFilterChange}
            segmentCounts={segmentCounts}
            onImplementAllFluff={onImplementAllFluff}
          />
        </div>
        
        <div className="flex items-center gap-4">
          {onPlayPause && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onPlayPause}
                  variant="ghost"
                  size="icon"
                  className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Play/Pause (Space)</p>
              </TooltipContent>
            </Tooltip>
          )}
          {onPlaybackRateChange && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onPlaybackRateChange(1.5)}
                    variant={playbackRate === 1.5 ? "primary" : "ghost"}
                    size="sm"
                    className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 transition-colors px-2"
                  >
                    1.5x
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>1.5x Speed</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onPlaybackRateChange(2)}
                    variant={playbackRate === 2 ? "primary" : "ghost"}
                    size="sm"
                    className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 transition-colors px-2"
                  >
                    2x
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>2x Speed</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onPlaybackRateChange(3)}
                    variant={playbackRate === 3 ? "primary" : "ghost"}
                    size="sm"
                    className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 transition-colors px-2"
                  >
                    3x
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>3x Speed</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
        </div>
      </TooltipProvider>

      {/* Timeline Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Panel */}
        <div
          onMouseEnter={() => setShowScrollbars(true)}
          onMouseLeave={() => {
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
              setShowScrollbars(false);
            }, 500);
          }}
        >
          <TrackPanel
            tracks={allTracks}
            onTrackControlChange={onTrackControlChange}
            showScrollbars={showScrollbars}
            onScroll={handleScroll}
          />
        </div>

        {/* Timeline Area */}
        <div
          ref={timelineRef}
          className="flex-1 flex flex-col overflow-hidden"
          style={{ width: `calc(100% - ${TRACK_LABEL_WIDTH}px)` }}
        >
          {/* Time Ruler */}
          <div 
            className="relative"
            style={{ height: `${RULER_HEIGHT}px` }}
            onMouseMove={handleTimelineMouseMove}
            onMouseLeave={handleTimelineMouseLeave}
            onWheel={handleWheelZoom}
          >
            <SMPTETimeRuler
              startTime={startTime}
              endTime={endTime}
              timelineWidth={timelineWidth}
              zoom={zoom}
            />
            <HoverPlayhead
              hoverTime={hoverTime}
              startTime={startTime}
              endTime={endTime}
              timelineWidth={timelineWidth}
            />
          </div>

          {/* Timeline Canvas */}
          <div
            ref={timelineAreaRef}
            className={`relative flex-1 overflow-y-auto overflow-x-hidden ${
              showScrollbars 
                ? '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-zinc-500' 
                : '[&::-webkit-scrollbar]:w-0'
            }`}
            onClick={handleTimelineClick}
            onMouseMove={handleTimelineMouseMove}
            onMouseLeave={() => {
              handleTimelineMouseLeave();
              if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
              }
              scrollTimeoutRef.current = setTimeout(() => {
                setShowScrollbars(false);
              }, 500);
            }}
            onWheel={handleWheelZoom}
            onScroll={handleScroll}
            onMouseEnter={() => setShowScrollbars(true)}
            style={{ 
              cursor: isPlayheadDragging ? "col-resize" : "pointer",
              scrollbarWidth: showScrollbars ? 'thin' : 'none',
              scrollbarColor: showScrollbars ? '#52525b #27272a' : 'transparent transparent',
            }}
          >
            <div
            className="relative timeline-area"
            style={{
              minHeight: `${totalTracksHeight}px`,
              width: `${timelineWidth}px`,
            }}
          >
              <Playhead
                currentTime={localCurrentTime}
                startTime={startTime}
                endTime={endTime}
                timelineWidth={timelineWidth}
                isDragging={isPlayheadDragging}
                onDragStart={handlePlayheadMouseDown}
                onDrag={() => {}}
                onDragEnd={() => {}}
              />
              
              <HoverPlayhead
                hoverTime={hoverTime}
                startTime={startTime}
                endTime={endTime}
                timelineWidth={timelineWidth}
              />
              
              {/* Video Tracks */}
              {activeSequence?.videoTracks.map((track) => (
                <TimelineTrack
                  key={track.id}
                  track={track}
                  startTime={startTime}
                  endTime={endTime}
                  timelineWidth={timelineWidth}
                  onItemClick={handleItemClick}
                  hoverTime={hoverTime}
                  isHighlightTrack={track.trackIndex === 0}
                  segments={track.trackIndex === 0 ? segments : undefined}
                  cutPoints={cutPoints}
                  adjacentItems={adjacentItems}
                  previousItemPositions={previousItemPositions}
                  timeline={timeline}
                  onToggleSegmentKeep={onToggleSegmentKeep}
                  videoUrl={videoUrl}
                  duration={duration}
                  selectedItemIds={localSelectedItems}
                  activeTool={activeTool}
                  onMoveItem={onMoveItem}
                  sequenceId={activeSeqId}
                  videoId={videoId}
                  gaps={gaps}
                />
              ))}
              
              {/* Audio Tracks */}
              {activeSequence?.audioTracks.map((track) => (
                <TimelineTrack
                  key={track.id}
                  track={track}
                  startTime={startTime}
                  endTime={endTime}
                  timelineWidth={timelineWidth}
                  onItemClick={handleItemClick}
                  hoverTime={hoverTime}
                  isHighlightTrack={false}
                  segments={undefined}
                  cutPoints={cutPoints}
                  adjacentItems={adjacentItems}
                  previousItemPositions={previousItemPositions}
                  timeline={timeline}
                  onToggleSegmentKeep={onToggleSegmentKeep}
                  videoUrl={videoUrl}
                  duration={duration}
                  selectedItemIds={localSelectedItems}
                  activeTool={activeTool}
                  onMoveItem={onMoveItem}
                  sequenceId={activeSeqId}
                  videoId={videoId}
                  gaps={gaps}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollbar */}
      <div
        onMouseEnter={() => setShowScrollbars(true)}
        onMouseLeave={() => {
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }
          scrollTimeoutRef.current = setTimeout(() => {
            setShowScrollbars(false);
          }, 500);
        }}
      >
        <HorizontalScrollbar
          duration={duration}
          startTime={startTime}
          endTime={endTime}
          timelineWidth={timelineWidth}
          onScroll={setScrollLeft}
          showScrollbars={showScrollbars}
        />
      </div>
    </div>
  );
}