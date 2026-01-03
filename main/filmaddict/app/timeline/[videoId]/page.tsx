"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getHighlights,
  getMoments,
  getVideoPlaybackUrl,
  getVideoStatus,
  getSegments,
  storePendingCuts,
  getPendingCuts,
  saveVideoCuts,
  submitSegmentFeedback,
} from "@/lib/api";
import { Highlight, MomentResponse, Track, TimelineItem, Sequence, SegmentAnalysis } from "@/lib/types";
import { VideoPlayer, VideoPlayerRef } from "@/components/ui/video-player";
import { Timeline, type TimelineProps } from "@/components/ui/timeline";
import { Button } from "@/components/ui/button-1";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, Undo2, Redo2, Download, Pencil } from "lucide-react";
import { ExportDialog } from "@/components/ui/export-dialog";
import { exportVideo, ExportFormat } from "@/lib/api";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useKeyboardShortcuts, ShortcutConfig, isMac } from "@/lib/hooks/useKeyboardShortcuts";
import { SHORTCUTS, getShortcutDisplay } from "@/lib/shortcuts";
import { saveEditingSession, loadEditingSession } from "@/lib/sessionStorage";
import { useUser } from "@clerk/nextjs";

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const videoId = params.videoId as string;
  const playerRef = useRef<VideoPlayerRef>(null);
  // Track last seek time to prevent seek loops in gap-skipping
  const lastSeekTimeRef = useRef<number>(0);
  const lastSeekGapRef = useRef<string>('');

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [moments, setMoments] = useState<MomentResponse[]>([]);
  const [segments, setSegments] = useState<SegmentAnalysis[]>([]);
  const [allSegments, setAllSegments] = useState<SegmentAnalysis[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [activeSequenceId, setActiveSequenceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState<"FLUFF" | "HIGHLIGHTS" | "ALL">("ALL");
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [acceptedSegments, setAcceptedSegments] = useState<Set<string>>(new Set());
  const [keptSegments, setKeptSegments] = useState<Set<string>>(new Set());
  const [pendingCutsCount, setPendingCutsCount] = useState(0);
  const [cutting, setCutting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  
  // New state for shortcuts features
  const [activeTool, setActiveTool] = useState<'blade' | 'select' | 'trim' | null>(null);
  const [markers, setMarkers] = useState<Array<{ id: string; time: number; label?: string }>>([]);
  const [inPoint, setInPoint] = useState<number | undefined>(undefined);
  const [outPoint, setOutPoint] = useState<number | undefined>(undefined);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopPlayback, setLoopPlayback] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selections, setSelections] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  
  // Project name state
  const [projectName, setProjectName] = useState<string>("Untitled Project");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  
  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // Undo/Redo state
  const [history, setHistory] = useState<Array<{ type: string; data: any }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 50;
  
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  // Compute gaps (cut regions) from acceptedSegments for timeline display and playback skipping
  const gaps = useMemo<[number, number][]>(() => {
    const gapsArray: [number, number][] = [];
    acceptedSegments.forEach((segmentKey) => {
      const [start, end] = segmentKey.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && end > start) {
        gapsArray.push([start, end]);
      }
    });
    // Sort gaps by start time
    gapsArray.sort((a, b) => a[0] - b[0]);
    return gapsArray;
  }, [acceptedSegments]);

  useEffect(() => {
    if (videoId) {
      loadVideoData();
      loadPendingCuts();
    }
  }, [videoId]);

  const loadPendingCuts = async () => {
    try {
      const result = await getPendingCuts(videoId);
      setPendingCutsCount(result.total_pending);
      
      // Sync accepted segments with pending cuts from server
      const pendingSet = new Set<string>();
      result.pending_cuts.forEach(cut => {
        pendingSet.add(`${cut.start_time}-${cut.end_time}`);
      });
      setAcceptedSegments(pendingSet);
    } catch (err) {
      console.error("Error loading pending cuts:", err);
    }
  };

  const loadVideoData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusData, highlightsData, segmentsData] = await Promise.all([
        getVideoStatus(videoId),
        getHighlights(videoId),
        getSegments(videoId).catch(() => ({ video_id: videoId, segments: [] })), // Fallback if segments not available
      ]);

      setHighlights(highlightsData.highlights);
      
      // Filter and validate segments - remove invalid ones (end < start) and sort by start_time
      const validSegments = segmentsData.segments
        .filter(segment => segment.end_time > segment.start_time && segment.start_time >= 0)
        .sort((a, b) => a.start_time - b.start_time);
      
      // Store all segments for filtering
      setAllSegments(validSegments);
      // Set initial segments (will be filtered by useEffect)
      setSegments(validSegments);
      
      // Print segments with start/stop times
      console.log('=== SEGMENTS ===');
      console.log(`Total segments from API: ${segmentsData.segments.length}`);
      console.log(`Valid segments: ${validSegments.length}`);
      validSegments.forEach((segment, idx) => {
        console.log(`Segment ${idx + 1}:`, {
          label: segment.label,
          start_time: segment.start_time,
          end_time: segment.end_time,
          duration: `${(segment.end_time - segment.start_time).toFixed(2)}s`,
          rating: segment.rating,
          reason: segment.reason,
        });
      });
      
      // Log invalid segments
      const invalidSegments = segmentsData.segments.filter(
        segment => segment.end_time <= segment.start_time || segment.start_time < 0
      );
      if (invalidSegments.length > 0) {
        console.warn(`Found ${invalidSegments.length} invalid segments:`, invalidSegments);
      }
      console.log('===============');
      
      setDuration(statusData.duration || 0);
      setVideoUrl(getVideoPlaybackUrl(videoId));

      // Try to get moments, but use highlights if moments don't exist
      let timelineTracks: Track[] = [];
      try {
        const momentsData = await getMoments(videoId);
        setMoments(momentsData.moments);
        
        // Match moments to highlights and create tracks
        timelineTracks = createTracks(
          momentsData.moments,
          highlightsData.highlights
        );
        setTracks(timelineTracks);
      } catch (momentsError) {
        console.log("Moments not available, using highlights instead:", momentsError);
        // Create tracks from highlights directly
        timelineTracks = createTracksFromHighlights(highlightsData.highlights);
        setTracks(timelineTracks);
      }

      // Create sequence from tracks (filter out accepted segments)
      const sequence = createSequenceFromTracks(timelineTracks, statusData.duration || 0, acceptedSegments);
      setSequences([sequence]);
      setActiveSequenceId(sequence.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load video data");
    } finally {
      setLoading(false);
    }
  };

  const createTracks = (
    moments: MomentResponse[],
    highlights: Highlight[]
  ): Track[] => {
    const tracks: Track[] = [];

    moments.forEach((moment, index) => {
      // Find matching highlight for this moment
      const matchingHighlight = highlights.find(
        (h) =>
          Math.abs(h.start - moment.start) < 0.5 &&
          Math.abs(h.end - moment.end) < 0.5
      );

      const item: TimelineItem = {
        id: moment.id,
        start: moment.start,
        end: moment.end,
        title: matchingHighlight?.title || `Moment ${index + 1}`,
        momentUrl: moment.moment_url,
      };

      // Create one track per moment
      tracks.push({
        id: `track-${moment.id}`,
        items: [item],
        trackType: 'video',
        trackIndex: 0,
        locked: false,
        visible: true,
        muted: false,
        soloed: false,
      });
    });

    return tracks;
  };

  const createTracksFromHighlights = (highlights: Highlight[]): Track[] => {
    const tracks: Track[] = [];

    highlights.forEach((highlight, index) => {
      const item: TimelineItem = {
        id: `highlight-${index}`,
        start: highlight.start,
        end: highlight.end,
        title: highlight.title || `Highlight ${index + 1}`,
        momentUrl: "",
        isHighlight: true, // Mark as highlight for purple color
      };

      // Create one track per highlight
      tracks.push({
        id: `track-highlight-${index}`,
        items: [item],
        trackType: 'video',
        trackIndex: 0,
        locked: false,
        visible: true,
        muted: false,
        soloed: false,
      });
    });

    return tracks;
  };

  const createSequenceFromTracks = (tracks: Track[], duration: number, acceptedSegmentsSet?: Set<string>): Sequence => {
    // Create video tracks (V1 only for now)
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

    // Helper function to check if a segment is accepted (deleted)
    const isSegmentAccepted = (start: number, end: number): boolean => {
      if (!acceptedSegmentsSet) return false;
      const segmentKey = `${start}-${end}`;
      return acceptedSegmentsSet.has(segmentKey);
    };

    // Create a full-length video block spanning the entire duration on V1
    if (duration > 0) {
      const fullVideoItem: TimelineItem = {
        id: `video-full-${videoId}`,
        start: 0,
        end: duration,
        title: 'Video',
        momentUrl: '',
      };
      videoTracks[0].items.push(fullVideoItem);
    }

    // Place all highlight/moment video items on V1 (trackIndex 0) as well
    // Filter out items that correspond to accepted segments
    tracks.forEach((track) => {
      track.items.forEach((videoItem) => {
        if (!isSegmentAccepted(videoItem.start, videoItem.end)) {
          videoTracks[0].items.push(videoItem);
        }
      });
    });

    // Create audio tracks (A1 only for now)
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

    // Create a full-length audio block spanning the entire duration on A1
    if (duration > 0) {
      const fullAudioItem: TimelineItem = {
        id: `audio-full-${videoId}`,
        start: 0,
        end: duration,
        title: 'Audio',
        momentUrl: '',
      };
      audioTracks[0].items.push(fullAudioItem);
    }

    // Create corresponding audio items for each video item and place them on A1 (trackIndex 0)
    // Filter out items that correspond to accepted segments
    tracks.forEach((track) => {
      track.items.forEach((videoItem) => {
        if (!isSegmentAccepted(videoItem.start, videoItem.end)) {
          const audioItem: TimelineItem = {
            id: `audio-${videoItem.id}`,
            start: videoItem.start,
            end: videoItem.end,
            title: videoItem.title,
            momentUrl: videoItem.momentUrl,
            isHighlight: videoItem.isHighlight, // Preserve highlight status
          };
          audioTracks[0].items.push(audioItem);
        }
      });
    });

    const sequenceId = `sequence-${videoId}`;
    return {
      id: sequenceId,
      name: 'Sequence 01',
      videoTracks,
      audioTracks,
      duration,
    };
  };

  const handleSeek = useCallback((time: number) => {
    if (playerRef.current) {
      let seekTime = time;
      
      // Check if seek time is in a gap - if so, skip to end of gap
      if (gaps.length > 0) {
        for (const [gapStart, gapEnd] of gaps) {
          if (seekTime >= gapStart && seekTime < gapEnd) {
            // Seek to end of gap instead (with larger buffer)
            seekTime = gapEnd + 0.1; // 100ms buffer to ensure we're past it
            break;
          }
        }
      }
      
      playerRef.current.seek(seekTime);
    }
  }, [gaps]);

  const handleTimeUpdate = useCallback((time: number) => {
    // Gap-skipping: if current time is in a gap, skip to end of gap
    if (gaps.length > 0 && playerRef.current) {
      for (const [gapStart, gapEndTime] of gaps) {
        const gapKey = `${gapStart}-${gapEndTime}`;
        // Check if we're in the gap (strict check, no epsilon on upper bound)
        if (time >= gapStart && time < gapEndTime) {
          // Prevent seek loops - if we just sought to this gap, skip this update
          if (lastSeekGapRef.current === gapKey && Math.abs(time - lastSeekTimeRef.current) < 0.5) {
            // Still in gap after seek - wait a bit longer
            return;
          }
          
          // We're in a gap - skip to well past the end to ensure we're out
          const skipTo = gapEndTime + 0.1; // Skip 100ms past the end
          lastSeekTimeRef.current = skipTo;
          lastSeekGapRef.current = gapKey;
          playerRef.current.seek(skipTo);
          // Don't update state - let the next timeUpdate handle it after seek
          return;
        }
      }
      // Clear seek tracking if we're not in any gap
      if (lastSeekGapRef.current) {
        lastSeekGapRef.current = '';
      }
    }
    setCurrentTime(time);
  }, [gaps]);

  const handleDurationChange = (dur: number) => {
    if (dur > 0) {
      setDuration(dur);
    }
  };

  const handlePlayPause = () => {
    if (playerRef.current) {
      if (playerRef.current.isPlaying()) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        playerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSequenceChange = (sequenceId: string) => {
    setActiveSequenceId(sequenceId);
  };

  const handleTrackControlChange = (trackId: string, control: 'locked' | 'visible' | 'muted' | 'soloed', value: boolean) => {
    setSequences(prevSequences => {
      return prevSequences.map(seq => {
        if (seq.id !== activeSequenceId) return seq;
        
        const updateTrack = (track: Track) => {
          if (track.id !== trackId) return track;
          return { ...track, [control]: value };
        };

        return {
          ...seq,
          videoTracks: seq.videoTracks.map(updateTrack),
          audioTracks: seq.audioTracks.map(updateTrack),
        };
      });
    });
  };

  const navigateToSegment = (index: number) => {
    const validIndex = Math.max(0, Math.min(index, segments.length - 1));
    if (validIndex < 0 || validIndex >= segments.length) return;
    isManualNavigation.current = true;
    setCurrentSegmentIndex(validIndex);
    const segment = segments[validIndex];
    if (segment && playerRef.current) {
      playerRef.current.seek(segment.start_time);
    }
  };

  const handleAcceptSegment = async () => {
    if (currentSegmentIndex < 0 || currentSegmentIndex >= segments.length) return;
    
    const segment = segments[currentSegmentIndex];
    const segmentKey = `${segment.start_time}-${segment.end_time}`;
    
    // Update local state immediately - NO backend call to avoid video corruption
    // Backend sync happens on export only
    setAcceptedSegments(prev => new Set([...prev, segmentKey]));
    setPendingCutsCount(prev => prev + 1);
    
    // Move playhead to end of deleted segment
    if (playerRef.current) {
      playerRef.current.seek(segment.end_time);
    }
  };

  const handleImplementAllFluff = useCallback(() => {
    // Find all FLUFF segments that aren't already accepted
    const fluffSegments = allSegments.filter(s => {
      if (s.label !== "FLUFF") return false;
      const segmentKey = `${s.start_time}-${s.end_time}`;
      return !acceptedSegments.has(segmentKey);
    });
    
    if (fluffSegments.length === 0) return;
    
    // Add all FLUFF segments to accepted segments
    const newSegmentKeys = fluffSegments.map(s => `${s.start_time}-${s.end_time}`);
    setAcceptedSegments(prev => new Set([...prev, ...newSegmentKeys]));
    setPendingCutsCount(prev => prev + fluffSegments.length);
    
    // Move playhead to end of last FLUFF segment
    if (fluffSegments.length > 0 && playerRef.current) {
      const lastSegment = fluffSegments[fluffSegments.length - 1];
      playerRef.current.seek(lastSegment.end_time);
    }
  }, [allSegments, acceptedSegments]);

  const handleAutoSave = useCallback(async () => {
    if (acceptedSegments.size === 0) return;
    if (saving || cutting) return;
    
    try {
      // Store pending cuts to server without processing
      const cutsToStore = Array.from(acceptedSegments).map(key => {
        const [start, end] = key.split('-').map(Number);
        return { start_time: start, end_time: end };
      });
      
      if (cutsToStore.length > 0) {
        const result = await storePendingCuts(videoId, cutsToStore);
        setPendingCutsCount(result.total_pending);
        console.log('Auto-saved pending cuts:', result.total_pending);
      }
    } catch (err) {
      console.error("Error auto-saving pending cuts:", err);
      // Don't show error to user for auto-save failures
    }
  }, [acceptedSegments, saving, cutting, videoId]);

  const handleSaveCuts = useCallback(async () => {
    if (pendingCutsCount === 0) return;
    if (saving) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Apply all pending cuts and save to video
      await saveVideoCuts(videoId);
      
      // Clear pending cuts
      setPendingCutsCount(0);
      setAcceptedSegments(new Set());
      
      // Reload video data to reflect changes
      await loadVideoData();
    } catch (err) {
      console.error("Error saving video cuts:", err);
      setError(err instanceof Error ? err.message : "Failed to save video cuts");
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCutsCount, saving, videoId]);

  const handleClearPendingCuts = async () => {
    if (pendingCutsCount === 0) return;
    if (saving) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Clear all pending cuts from server
      const { clearPendingCuts } = await import("@/lib/api");
      await clearPendingCuts(videoId);
      
      // Clear pending cuts locally
      setPendingCutsCount(0);
      setAcceptedSegments(new Set());
    } catch (err) {
      console.error("Error clearing pending cuts:", err);
      setError(err instanceof Error ? err.message : "Failed to clear pending cuts");
    } finally {
      setSaving(false);
    }
  };

  const handleDeclineSegment = () => {
    if (currentSegmentIndex < 0 || currentSegmentIndex >= segments.length) return;
    
    const segment = segments[currentSegmentIndex];
    const segmentKey = `${segment.start_time}-${segment.end_time}`;
    
    // Add segment to kept segments (removes from fluff list and removes highlight)
    setKeptSegments(prev => new Set([...prev, segmentKey]));
    
    // Advance to next segment
    if (currentSegmentIndex < segments.length - 1) {
      navigateToSegment(currentSegmentIndex + 1);
    } else {
      navigateToSegment(0);
    }
  };

  const handleSegmentFeedback = async (feedbackType: "GREAT" | "FINE" | "WRONG") => {
    if (currentSegmentIndex < 0 || currentSegmentIndex >= segments.length) return;
    if (submittingFeedback) return;
    
    const segment = segments[currentSegmentIndex];
    
    // Create a unique key for this segment (use ID if available, otherwise use time range)
    const segmentKey = segment.id || `${segment.start_time}-${segment.end_time}`;
    
    try {
      setSubmittingFeedback(true);
      
      // Submit feedback - use ID if available, otherwise use time range lookup
      await submitSegmentFeedback(
        videoId,
        segment.id || null,
        feedbackType,
        segment.start_time,
        segment.end_time
      );
      
      // Mark feedback as given for this segment
      setFeedbackGiven(prev => new Set([...prev, segmentKey]));
      
      // Show thank you dialog
      setShowFeedbackDialog(true);
      
      // Optionally show a brief success message
      console.log(`Feedback submitted: ${feedbackType} for segment ${segmentKey}`);
    } catch (err) {
      console.error("Error submitting segment feedback:", err);
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleRevertFeedback = useCallback(() => {
    if (currentSegmentIndex < 0 || currentSegmentIndex >= segments.length) return;
    if (submittingFeedback) return;
    
    const segment = segments[currentSegmentIndex];
    const segmentKey = segment.id || `${segment.start_time}-${segment.end_time}`;
    
    // Remove feedback from the current segment
    if (feedbackGiven.has(segmentKey)) {
      setFeedbackGiven(prev => {
        const newSet = new Set(prev);
        newSet.delete(segmentKey);
        return newSet;
      });
      console.log(`Feedback reverted for segment ${segmentKey}`);
    }
  }, [currentSegmentIndex, segments, feedbackGiven, submittingFeedback]);

  // Helper to add to history
  const addToHistory = useCallback((type: string, data: any) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ type, data });
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIndex >= 0) {
      const action = history[historyIndex];
      
      // Restore state based on action type
      if (action.type === 'add_marker') {
        // Undo add: remove the marker
        setMarkers(prev => {
          const newMarkers = prev.filter(m => m.id !== action.data.id);
          saveEditingSession(videoId, { markers: newMarkers }, user?.id);
          return newMarkers;
        });
      } else if (action.type === 'delete_marker') {
        // Undo delete: add the marker back
        setMarkers(prev => {
          const newMarkers = [...prev, action.data].sort((a, b) => a.time - b.time);
          saveEditingSession(videoId, { markers: newMarkers }, user?.id);
          return newMarkers;
        });
      }
      
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex, videoId, user?.id]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const action = history[nextIndex];
      
      // Restore state based on action type
      if (action.type === 'add_marker') {
        // Redo add: add the marker
        setMarkers(prev => {
          const newMarkers = [...prev, action.data].sort((a, b) => a.time - b.time);
          saveEditingSession(videoId, { markers: newMarkers }, user?.id);
          return newMarkers;
        });
      } else if (action.type === 'delete_marker') {
        // Redo delete: remove the marker
        setMarkers(prev => {
          const newMarkers = prev.filter(m => m.id !== action.data.id);
          saveEditingSession(videoId, { markers: newMarkers }, user?.id);
          return newMarkers;
        });
      }
      
      setHistoryIndex(nextIndex);
    }
  }, [history, historyIndex, videoId, user?.id]);

  // Marker handlers
  const handleAddMarker = useCallback(() => {
    const time = currentTime;
    const newMarker = {
      id: `marker-${Date.now()}`,
      time,
      label: `Marker at ${time.toFixed(2)}s`,
    };
    setMarkers(prev => [...prev, newMarker]);
    addToHistory('add_marker', newMarker);
    saveEditingSession(videoId, { markers: [...markers, newMarker] }, user?.id);
  }, [currentTime, markers, videoId, addToHistory, user?.id]);

  const handleDeleteMarker = useCallback(() => {
    if (markers.length > 0) {
      // Delete marker closest to current time
      const closestMarker = markers.reduce((prev, curr) => 
        Math.abs(curr.time - currentTime) < Math.abs(prev.time - currentTime) ? curr : prev
      );
      const newMarkers = markers.filter(m => m.id !== closestMarker.id);
      setMarkers(newMarkers);
      addToHistory('delete_marker', closestMarker);
      saveEditingSession(videoId, { markers: newMarkers }, user?.id);
    }
  }, [markers, currentTime, videoId, addToHistory, user?.id]);

  const handleNextMarker = useCallback(() => {
    const nextMarker = markers.filter(m => m.time > currentTime).sort((a, b) => a.time - b.time)[0];
    if (nextMarker && playerRef.current) {
      playerRef.current.seek(nextMarker.time);
    }
  }, [markers, currentTime]);

  const handlePrevMarker = useCallback(() => {
    const prevMarker = markers.filter(m => m.time < currentTime).sort((a, b) => b.time - a.time)[0];
    if (prevMarker && playerRef.current) {
      playerRef.current.seek(prevMarker.time);
    }
  }, [markers, currentTime]);

  // In/Out point handlers
  const handleSetInPoint = useCallback(() => {
    setInPoint(currentTime);
    saveEditingSession(videoId, { inPoint: currentTime }, user?.id);
  }, [currentTime, videoId]);

  const handleSetOutPoint = useCallback(() => {
    setOutPoint(currentTime);
    saveEditingSession(videoId, { outPoint: currentTime }, user?.id);
  }, [currentTime, videoId]);

  const handleClearInOut = useCallback(() => {
    setInPoint(undefined);
    setOutPoint(undefined);
    saveEditingSession(videoId, { inPoint: undefined, outPoint: undefined }, user?.id);
  }, [videoId]);

  // Playback handlers
  const handleStop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.seek(0);
    }
  }, []);

  const handleStepForward = useCallback((frames: number = 1) => {
    if (playerRef.current) {
      playerRef.current.stepForward(frames);
    }
  }, []);

  const handleStepBackward = useCallback((frames: number = 1) => {
    if (playerRef.current) {
      playerRef.current.stepBackward(frames);
    }
  }, []);

  const handleGoToStart = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.seek(0);
    }
  }, []);

  const handleGoToEnd = useCallback(() => {
    if (playerRef.current) {
      const dur = playerRef.current.getDuration();
      if (dur > 0) {
        playerRef.current.seek(dur);
      }
    }
  }, []);

  const handleJogBackward = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(-1);
      playerRef.current.play();
    }
  }, []);

  const handleJogStop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(1);
      playerRef.current.pause();
    }
  }, []);

  const handleJogForward = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(2);
      playerRef.current.play();
    }
  }, []);

  const handleFastForward = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(4);
      playerRef.current.play();
    }
  }, []);

  const handleRewind = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(-2);
      playerRef.current.play();
    }
  }, []);

  const handleToggleLoop = useCallback(() => {
    setLoopPlayback(prev => !prev);
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate);
      setPlaybackRate(rate);
    }
  }, []);

  // Tool handlers
  const handleBladeTool = useCallback(() => {
    setActiveTool(prev => prev === 'blade' ? null : 'blade');
    console.log('Blade tool activated - coming soon');
  }, []);

  const handleSelectTool = useCallback(() => {
    setActiveTool(prev => prev === 'select' ? null : 'select');
  }, []);

  const handleTrimTool = useCallback(() => {
    setActiveTool(prev => prev === 'trim' ? null : 'trim');
    console.log('Trim tool activated - coming soon');
  }, []);

  // Handle split clip
  const handleSplitClip = useCallback((sequenceId: string, trackId: string, itemId: string, splitTime: number) => {
    setSequences(prevSequences => {
      return prevSequences.map(seq => {
        if (seq.id !== sequenceId) return seq;

        const updateTracks = (tracks: Track[]) => {
          return tracks.map(track => {
            if (track.id !== trackId) return track;
            
            const itemIndex = track.items.findIndex(item => item.id === itemId);
            if (itemIndex === -1) return track;
            
            const item = track.items[itemIndex];
            if (splitTime <= item.start || splitTime >= item.end) return track;

            // Split the item into two items
            const firstItem: TimelineItem = {
              ...item,
              end: splitTime,
            };
            const secondItem: TimelineItem = {
              ...item,
              id: `${item.id}-split-${splitTime}`,
              start: splitTime,
            };

            const newItems = [...track.items];
            newItems.splice(itemIndex, 1, firstItem, secondItem);

            return { ...track, items: newItems };
          });
        };

        return {
          ...seq,
          videoTracks: updateTracks(seq.videoTracks),
          audioTracks: updateTracks(seq.audioTracks),
        };
      });
    });
  }, []);

  // Handle trim clip
  const handleTrimClip = useCallback((sequenceId: string, trackId: string, itemId: string, newStart: number, newEnd: number) => {
    setSequences(prevSequences => {
      return prevSequences.map(seq => {
        if (seq.id !== sequenceId) return seq;

        const updateTracks = (tracks: Track[]) => {
          return tracks.map(track => {
            if (track.id !== trackId) return track;
            
            return {
              ...track,
              items: track.items.map(item => {
                if (item.id !== itemId) return item;
                return { ...item, start: newStart, end: newEnd };
              }),
            };
          });
        };

        return {
          ...seq,
          videoTracks: updateTracks(seq.videoTracks),
          audioTracks: updateTracks(seq.audioTracks),
        };
      });
    });
  }, []);

  // Handle item selection
  const handleItemSelect = useCallback((itemId: string, multiSelect: boolean) => {
    if (multiSelect) {
      setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    } else {
      setSelectedItemIds(new Set([itemId]));
    }
  }, []);

  // Handle moving items - synchronizes video/audio counterparts
  const handleMoveItem = useCallback((sequenceId: string, trackId: string, itemId: string, newStart: number, newEnd: number) => {
    setSequences(prevSequences => {
      return prevSequences.map(seq => {
        if (seq.id !== sequenceId) return seq;

        // Find the original item to get its duration
        const allItems = [
          ...seq.videoTracks.flatMap(t => t.items),
          ...seq.audioTracks.flatMap(t => t.items),
        ];
        const originalItem = allItems.find(item => item.id === itemId);
        if (!originalItem) return seq;

        const itemDuration = originalItem.end - originalItem.start;
        const actualNewEnd = newEnd - newStart >= itemDuration ? newEnd : newStart + itemDuration;

        const updateTracks = (tracks: Track[]) => {
          return tracks.map(track => {
            if (track.id !== trackId) return track;
            
            const itemIndex = track.items.findIndex(item => item.id === itemId);
            if (itemIndex === -1) return track;
            
            const item = track.items[itemIndex];
            
            const updatedItem = {
              ...item,
              start: newStart,
              end: actualNewEnd,
            };
            
            const newItems = [...track.items];
            newItems[itemIndex] = updatedItem;

            return { ...track, items: newItems };
          });
        };

        // Determine if this is a video or audio item before updating
        const isVideoItem = seq.videoTracks.some(track => track.items.some(item => item.id === itemId));

        const updatedVideoTracks = updateTracks(seq.videoTracks);
        const updatedAudioTracks = updateTracks(seq.audioTracks);

        if (isVideoItem) {
          // Video item moved - find and sync the corresponding audio item
          const audioCounterpartId = `audio-${itemId}`;
          const finalAudioTracks = updatedAudioTracks.map(track => {
            const audioItemIndex = track.items.findIndex(item => 
              item.id === audioCounterpartId || 
              (item.id.startsWith('audio-') && item.id.endsWith(itemId.replace(/^audio-/, '')))
            );
            
            // Also check by matching start/end times (original position)
            let itemIndexToUpdate = audioItemIndex;
            if (itemIndexToUpdate === -1) {
              itemIndexToUpdate = track.items.findIndex(item =>
                Math.abs(item.start - originalItem.start) < 0.01 &&
                Math.abs(item.end - originalItem.end) < 0.01 &&
                item.id.startsWith('audio-')
              );
            }
            
            if (itemIndexToUpdate !== -1) {
              const newItems = [...track.items];
              const itemDuration = originalItem.end - originalItem.start;
              const calculatedEnd = newEnd - newStart >= itemDuration ? newEnd : newStart + itemDuration;
              newItems[itemIndexToUpdate] = {
                ...newItems[itemIndexToUpdate],
                start: newStart,
                end: calculatedEnd,
              };
              return { ...track, items: newItems };
            }
            return track;
          });
          return {
            ...seq,
            videoTracks: updatedVideoTracks,
            audioTracks: finalAudioTracks,
          };
        } else {
          // Audio item moved - find and sync the corresponding video item
          const videoItemId = itemId.replace(/^audio-/, '');
          const finalVideoTracks = updatedVideoTracks.map(track => {
            const videoItemIndex = track.items.findIndex(item => item.id === videoItemId);
            
            // Also check by matching start/end times (original position)
            let itemIndexToUpdate = videoItemIndex;
            if (itemIndexToUpdate === -1) {
              itemIndexToUpdate = track.items.findIndex(item =>
                Math.abs(item.start - originalItem.start) < 0.01 &&
                Math.abs(item.end - originalItem.end) < 0.01 &&
                !item.title.includes('full-') // Don't match full-length items
              );
            }
            
            if (itemIndexToUpdate !== -1) {
              const newItems = [...track.items];
              const itemDuration = originalItem.end - originalItem.start;
              const calculatedEnd = newEnd - newStart >= itemDuration ? newEnd : newStart + itemDuration;
              newItems[itemIndexToUpdate] = {
                ...newItems[itemIndexToUpdate],
                start: newStart,
                end: calculatedEnd,
              };
              return { ...track, items: newItems };
            }
            return track;
          });
          return {
            ...seq,
            videoTracks: finalVideoTracks,
            audioTracks: updatedAudioTracks,
          };
        }

      });
    });
  }, []);

  // Zoom handlers - trigger timeline zoom via window handlers
  const handleZoomIn = useCallback(() => {
    if ((window as any).__timelineZoomIn) {
      (window as any).__timelineZoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if ((window as any).__timelineZoomOut) {
      (window as any).__timelineZoomOut();
    }
  }, []);

  const handleZoomToFit = useCallback(() => {
    if ((window as any).__timelineZoomToFit) {
      (window as any).__timelineZoomToFit();
    }
  }, []);

  // Other handlers
  const handleSnapToggle = useCallback(() => {
    setSnapEnabled(prev => !prev);
  }, []);

  const handleSaveProject = useCallback(async () => {
    // Save session state to backend including sequences
    await saveEditingSession(videoId, {
      markers,
      selections,
      sequences,
      currentTime,
      inPoint,
      outPoint,
      projectName,
      viewPreferences: {
        snapEnabled,
        loopPlayback,
      },
    }, user?.id);
    
    // If there are pending cuts, also save the video
    if (pendingCutsCount > 0 && !saving) {
      await handleSaveCuts();
    }
    
    console.log('Project saved');
  }, [videoId, markers, selections, sequences, currentTime, inPoint, outPoint, projectName, snapEnabled, loopPlayback, pendingCutsCount, saving, handleSaveCuts, user?.id]);

  const handleCopy = useCallback(() => {
    console.log('Copy - coming soon');
  }, []);

  const handleCut = useCallback(() => {
    console.log('Cut - coming soon');
  }, []);

  const handlePaste = useCallback(() => {
    console.log('Paste - coming soon');
  }, []);

  const handleSelectAll = useCallback(() => {
    // Select all segments/clips
    const allIds = segments.map(s => s.id || `${s.start_time}-${s.end_time}`);
    setSelections(allIds);
  }, [segments]);

  const handleDeselectAll = useCallback(() => {
    setSelections([]);
  }, []);

  const handleExport = useCallback(() => {
    setExportDialogOpen(true);
  }, []);

  const handleExportVideo = useCallback(async (format: ExportFormat) => {
    try {
      setError(null);
      
      // Compute segments to remove from acceptedSegments and sequences
      // First, collect all items that should be kept from sequences (visible, non-muted items)
      const keepSegments: Array<[number, number]> = [];
      if (sequences.length > 0) {
        const activeSequence = sequences.find(seq => seq.id === activeSequenceId) || sequences[0];
        if (activeSequence) {
          // Collect all visible, non-muted items from video tracks
          activeSequence.videoTracks.forEach(track => {
            if (track.visible && !track.muted) {
              track.items.forEach(item => {
                // Skip full-length items (they're placeholders)
                if (!item.id.includes('full-') && item.end > item.start) {
                  keepSegments.push([item.start, item.end]);
                }
              });
            }
          });
        }
      }
      
      // If we have keep segments from sequences, compute segments to remove
      let segmentsToRemove: Array<{ start_time: number; end_time: number }> | undefined;
      
      if (keepSegments.length > 0) {
        // Sort keep segments by start time
        keepSegments.sort((a, b) => a[0] - b[0]);
        
        // Compute segments to remove (inverse of keep segments)
        const removeSegments: Array<[number, number]> = [];
        let currentTime = 0;
        
        for (const [start, end] of keepSegments) {
          if (currentTime < start) {
            removeSegments.push([currentTime, start]);
          }
          currentTime = Math.max(currentTime, end);
        }
        
        // Add remaining segment if any
        if (currentTime < duration) {
          removeSegments.push([currentTime, duration]);
        }
        
        segmentsToRemove = removeSegments.map(([start, end]) => ({
          start_time: start,
          end_time: end,
        }));
      } else if (acceptedSegments.size > 0) {
        // Fallback to acceptedSegments if no sequences
        segmentsToRemove = Array.from(acceptedSegments).map(key => {
          const [start, end] = key.split('-').map(Number);
          return { start_time: start, end_time: end };
        });
      }
      
      // Export the video
      const blob = await exportVideo(videoId, format, segmentsToRemove);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set filename based on format
      const formatExtensions: Record<ExportFormat, string> = {
        mp4: 'mp4',
        mov_prores422: 'mov',
        mov_prores4444: 'mov',
        webm: 'webm',
        xml: 'xml',
        edl: 'edl',
        aaf: 'aaf',
      };
      a.download = `export_${videoId}.${formatExtensions[format]}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting video:", err);
      setError(err instanceof Error ? err.message : "Failed to export video");
      throw err;
    }
  }, [videoId, acceptedSegments, sequences, activeSequenceId, duration]);

  // Stub handlers for features not yet implemented
  const handleStub = useCallback((featureName: string) => {
    console.log(`Feature coming soon: ${featureName}`);
  }, []);

  // Setup keyboard shortcuts
  const shortcuts: ShortcutConfig[] = [
    // Global
    { key: SHORTCUTS.save_project.key, meta: true, handler: () => handleSaveProject() },
    { key: SHORTCUTS.undo.key, meta: true, handler: () => handleUndo() },
    { key: SHORTCUTS.redo.key, meta: true, shift: true, handler: () => handleRedo() },
    { key: SHORTCUTS.revert_feedback.key, meta: true, shift: true, handler: () => handleRevertFeedback() },
    { key: SHORTCUTS.copy.key, meta: true, handler: () => handleCopy() },
    { key: SHORTCUTS.cut.key, meta: true, handler: () => handleCut() },
    { key: SHORTCUTS.paste.key, meta: true, handler: () => handlePaste() },
    { key: SHORTCUTS.select_all.key, meta: true, handler: () => handleSelectAll() },
    { key: SHORTCUTS.deselect_all.key, meta: true, shift: true, handler: () => handleDeselectAll() },
    { key: SHORTCUTS.preferences.key, meta: true, handler: () => handleStub('Preferences') },
    
    // Playback
    { key: SHORTCUTS.stop.key, handler: () => handleStop() },
    { key: SHORTCUTS.step_forward.key, handler: () => handleStepForward(1), preventDefault: false },
    { key: SHORTCUTS.step_backward.key, handler: () => handleStepBackward(1), preventDefault: false },
    { key: SHORTCUTS.next_frame.key, handler: () => handleStepForward(1) },
    { key: SHORTCUTS.prev_frame.key, handler: () => handleStepBackward(1) },
    { key: SHORTCUTS.jog_backward.key, handler: () => handleJogBackward() },
    { key: SHORTCUTS.jog_stop.key, handler: () => handleJogStop() },
    { key: SHORTCUTS.jog_forward.key, handler: () => handleJogForward() },
    { key: SHORTCUTS.fast_forward.key, shift: true, handler: () => handleFastForward() },
    { key: SHORTCUTS.rewind.key, shift: true, handler: () => handleRewind() },
    { key: SHORTCUTS.go_to_start.key, handler: () => handleGoToStart() },
    { key: SHORTCUTS.go_to_end.key, handler: () => handleGoToEnd() },
    { key: SHORTCUTS.set_in.key, handler: () => handleSetInPoint() },
    { key: SHORTCUTS.set_out.key, handler: () => handleSetOutPoint() },
    { key: SHORTCUTS.clear_in_out.key, alt: true, handler: () => handleClearInOut() },
    { key: SHORTCUTS.loop_playback.key, meta: true, handler: () => handleToggleLoop() },
    
    // Timeline
    { key: SHORTCUTS.blade_tool.key, handler: () => handleBladeTool() },
    { key: SHORTCUTS.select_tool.key, handler: () => handleSelectTool() },
    { key: SHORTCUTS.trim_tool.key, handler: () => handleTrimTool() },
    { key: SHORTCUTS.zoom_in.key, meta: true, handler: () => handleZoomIn() },
    { key: SHORTCUTS.zoom_out.key, meta: true, handler: () => handleZoomOut() },
    { key: SHORTCUTS.zoom_to_fit.key, shift: true, handler: () => handleZoomToFit() },
    { key: SHORTCUTS.snap_toggle.key, handler: () => handleSnapToggle() },
    
    // Markers
    { key: SHORTCUTS.add_marker.key, handler: () => handleAddMarker() },
    { key: SHORTCUTS.edit_marker.key, shift: true, handler: () => handleStub('Edit Marker') },
    { key: SHORTCUTS.next_marker.key, meta: true, shift: true, handler: () => handleNextMarker() },
    { key: SHORTCUTS.prev_marker.key, meta: true, shift: true, handler: () => handlePrevMarker() },
    { key: SHORTCUTS.delete_marker.key, alt: true, handler: () => handleDeleteMarker() },
    
    // Export
    { key: SHORTCUTS.export_master_file.key, meta: true, handler: () => handleExport() },
    
    // Stubs
    { key: SHORTCUTS.ripple_delete.key, shift: true, handler: () => handleStub('Ripple Delete') },
    { key: SHORTCUTS.add_edit.key, meta: true, handler: () => handleStub('Add Edit') },
    { key: SHORTCUTS.lift_from_timeline.key, handler: () => handleStub('Lift from Timeline') },
    { key: SHORTCUTS.overwrite_edit.key, handler: () => handleStub('Overwrite Edit') },
    { key: SHORTCUTS.insert_edit.key, handler: () => handleStub('Insert Edit') },
    { key: SHORTCUTS.connect_clip.key, handler: () => handleStub('Connect Clip') },
    { key: SHORTCUTS.detach_audio.key, meta: true, shift: true, handler: () => handleStub('Detach Audio') },
    { key: SHORTCUTS.expand_audio.key, ctrl: true, handler: () => handleStub('Expand Audio') },
    { key: SHORTCUTS.enable_disable_clip.key, handler: () => handleStub('Enable/Disable Clip') },
    { key: SHORTCUTS.show_hide_skimmer.key, handler: () => handleStub('Show/Hide Skimmer') },
    { key: SHORTCUTS.split_clip.key, meta: true, handler: () => handleStub('Split Clip') },
    { key: SHORTCUTS.duplicate_clip.key, meta: true, handler: () => handleStub('Duplicate Clip') },
    { key: SHORTCUTS.delete_clip.key, handler: () => handleStub('Delete Clip') },
    { key: SHORTCUTS.speed_up.key, meta: true, handler: () => handleStub('Speed Up') },
    { key: SHORTCUTS.slow_down.key, meta: true, handler: () => handleStub('Slow Down') },
    { key: SHORTCUTS.reverse_clip.key, shift: true, handler: () => handleStub('Reverse Clip') },
    { key: SHORTCUTS.normalize_audio.key, meta: true, shift: true, handler: () => handleStub('Normalize Audio') },
    { key: SHORTCUTS.show_inspector.key, meta: true, handler: () => handleStub('Show Inspector') },
    { key: SHORTCUTS.toggle_waveforms.key, meta: true, alt: true, handler: () => handleStub('Toggle Waveforms') },
    { key: SHORTCUTS.increase_volume.key, ctrl: true, handler: () => handleStub('Increase Volume') },
    { key: SHORTCUTS.decrease_volume.key, ctrl: true, handler: () => handleStub('Decrease Volume') },
    { key: SHORTCUTS.mute_clip.key, shift: true, handler: () => handleStub('Mute Clip') },
    { key: SHORTCUTS.solo_clip.key, shift: true, handler: () => handleStub('Solo Clip') },
    { key: SHORTCUTS.add_audio_fade_in.key, ctrl: true, shift: true, handler: () => handleStub('Add Audio Fade In') },
    { key: SHORTCUTS.add_audio_fade_out.key, ctrl: true, shift: true, handler: () => handleStub('Add Audio Fade Out') },
    { key: SHORTCUTS.duck_audio.key, ctrl: true, handler: () => handleStub('Duck Audio') },
    { key: SHORTCUTS.show_timeline.key, meta: true, handler: () => handleStub('Show Timeline') },
    { key: SHORTCUTS.show_browser.key, meta: true, handler: () => handleStub('Show Browser') },
    { key: SHORTCUTS.show_inspector_view.key, meta: true, handler: () => handleStub('Show Inspector') },
    { key: SHORTCUTS.show_effects.key, meta: true, handler: () => handleStub('Show Effects') },
    { key: SHORTCUTS.toggle_skimming.key, handler: () => handleStub('Toggle Skimming') },
    { key: SHORTCUTS.toggle_full_view.key, meta: true, shift: true, handler: () => handleStub('Toggle Full View') },
    { key: SHORTCUTS.share.key, meta: true, shift: true, handler: () => handleStub('Share') },
    { key: SHORTCUTS.quick_export.key, meta: true, ctrl: true, handler: () => handleStub('Quick Export') },
    { key: SHORTCUTS.slip_edit.key, handler: () => handleStub('Slip Edit') },
    { key: SHORTCUTS.slide_edit.key, handler: () => handleStub('Slide Edit') },
    { key: SHORTCUTS.roll_edit.key, handler: () => handleStub('Roll Edit') },
    { key: SHORTCUTS.ripple_trim_forward.key, shift: true, handler: () => handleStub('Ripple Trim Forward') },
    { key: SHORTCUTS.ripple_trim_backward.key, shift: true, handler: () => handleStub('Ripple Trim Backward') },
    { key: SHORTCUTS.nudge_clip_forward.key, alt: true, handler: () => handleStub('Nudge Clip Forward') },
    { key: SHORTCUTS.nudge_clip_backward.key, alt: true, handler: () => handleStub('Nudge Clip Backward') },
  ];

  useKeyboardShortcuts(shortcuts);

  const currentSegment = currentSegmentIndex >= 0 && currentSegmentIndex < segments.length 
    ? segments[currentSegmentIndex] 
    : null;

  // Filter segments based on selected filter and accepted segments
  useEffect(() => {
    let filtered: SegmentAnalysis[] = [];
    
    if (segmentFilter === "HIGHLIGHTS") {
      // Convert highlights to segments for display
      filtered = highlights.map((highlight, index) => ({
        id: `highlight-${index}`,
        start_time: highlight.start,
        end_time: highlight.end,
        label: "HIGHLIGHTS" as const,
        rating: highlight.score,
        reason: highlight.summary || highlight.title || "Highlight",
        repetition_score: 0,
        filler_density: 0,
        visual_change_score: 0,
        usefulness_score: highlight.score,
        explanation: highlight.explanation,
      }));
    } else if (segmentFilter === "FLUFF") {
      // Filter by segment label
      filtered = allSegments.filter(segment => segment.label === segmentFilter);
    } else {
      // Show both FLUFF and HIGHLIGHTS
      const fluffSegments = allSegments.filter(segment => segment.label === "FLUFF");
      const highlightSegments = highlights.map((highlight, index) => ({
        id: `highlight-${index}`,
        start_time: highlight.start,
        end_time: highlight.end,
        label: "HIGHLIGHTS" as const,
        rating: highlight.score,
        reason: highlight.summary || highlight.title || "Highlight",
        repetition_score: 0,
        filler_density: 0,
        visual_change_score: 0,
        usefulness_score: highlight.score,
        explanation: highlight.explanation,
      }));
      filtered = [...fluffSegments, ...highlightSegments];
    }
    
    // Remove accepted segments (they're marked for removal)
    filtered = filtered.filter(segment => {
      const segmentKey = `${segment.start_time}-${segment.end_time}`;
      return !acceptedSegments.has(segmentKey);
    });
    
    // Remove kept segments (they're removed from fluff list)
    filtered = filtered.filter(segment => {
      const segmentKey = `${segment.start_time}-${segment.end_time}`;
      return !keptSegments.has(segmentKey);
    });
    
    setSegments(filtered);
  }, [segmentFilter, allSegments, acceptedSegments, keptSegments, highlights]);

  // Update sequences when acceptedSegments changes to reflect deletions in both video and audio tracks
  useEffect(() => {
    if (tracks.length > 0 && duration > 0) {
      const updatedSequence = createSequenceFromTracks(tracks, duration, acceptedSegments);
      setSequences([updatedSequence]);
    }
  }, [acceptedSegments, tracks, duration, videoId]);

  // Reset current index when segments change
  useEffect(() => {
    if (currentSegmentIndex >= segments.length && segments.length > 0) {
      setCurrentSegmentIndex(0);
    } else if (segments.length === 0) {
      setCurrentSegmentIndex(-1);
    } else if (currentSegmentIndex < 0 && segments.length > 0) {
      setCurrentSegmentIndex(0);
    }
  }, [segments.length]);

  // Track if navigation was manual to avoid seek conflicts
  const isManualNavigation = useRef(false);

  // Update current segment index based on currentTime
  useEffect(() => {
    if (segments.length === 0) return;
    if (isManualNavigation.current) return; // Don't update if user just navigated manually
    
    // Find which segment contains the current time
    const segmentIndex = segments.findIndex(segment => 
      currentTime >= segment.start_time && currentTime <= segment.end_time
    );
    
    // If we found a segment and it's different from current index, update it
    if (segmentIndex !== -1 && segmentIndex !== currentSegmentIndex) {
      setCurrentSegmentIndex(segmentIndex);
    } else if (segmentIndex === -1 && currentSegmentIndex >= 0) {
      // If current time is not in any segment, find the closest segment
      const closestIndex = segments.reduce((closest, segment, index) => {
        const currentDistance = Math.abs(currentTime - (segment.start_time + segment.end_time) / 2);
        const closestDistance = closest.index === -1 
          ? Infinity
          : Math.abs(currentTime - (segments[closest.index].start_time + segments[closest.index].end_time) / 2);
        return currentDistance < closestDistance ? { index, distance: currentDistance } : closest;
      }, { index: -1, distance: Infinity });
      
      if (closestIndex.index !== -1 && closestIndex.index !== currentSegmentIndex) {
        setCurrentSegmentIndex(closestIndex.index);
      }
    }
  }, [currentTime, segments, currentSegmentIndex]);

  // Auto-seek to current segment's start time when segment index changes (but only if user navigated manually)
  useEffect(() => {
    if (isManualNavigation.current && currentSegmentIndex >= 0 && currentSegmentIndex < segments.length && playerRef.current) {
      const segment = segments[currentSegmentIndex];
      if (segment) {
        playerRef.current.seek(segment.start_time);
        // Reset flag after a short delay to allow time-based updates again
        setTimeout(() => {
          isManualNavigation.current = false;
        }, 100);
      }
    }
  }, [currentSegmentIndex, segments]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        setIsPlaying(playerRef.current.isPlaying());
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Load session state on mount
  useEffect(() => {
    if (videoId) {
      loadEditingSession(videoId).then(session => {
        if (session.markers) setMarkers(session.markers);
        if (session.inPoint !== undefined) setInPoint(session.inPoint);
        if (session.outPoint !== undefined) setOutPoint(session.outPoint);
        if (session.projectName) setProjectName(session.projectName);
        if (session.currentTime !== undefined) setCurrentTime(session.currentTime);
        if (session.viewPreferences) {
          setSnapEnabled(session.viewPreferences.snapEnabled);
          setLoopPlayback(session.viewPreferences.loopPlayback);
        }
        // Restore video player position after a short delay to ensure player is ready
        if (session.currentTime !== undefined && playerRef.current) {
          setTimeout(() => {
            playerRef.current?.seek(session.currentTime || 0);
          }, 500);
        }
      });
    }
  }, [videoId]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingProjectName && projectNameInputRef.current) {
      projectNameInputRef.current.focus();
      projectNameInputRef.current.select();
    }
  }, [isEditingProjectName]);

  // Generate deterministic UUID from project name using Web Crypto API
  const generateIdFromName = useCallback(async (name: string): Promise<string> => {
    // Use Web Crypto API to generate a deterministic hash
    const encoder = new TextEncoder();
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const data = encoder.encode(namespace + name);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Format as UUID v4-style (deterministic based on name)
    const uuid = [
      hex.substring(0, 8),
      hex.substring(8, 12),
      '4' + hex.substring(13, 16),
      ((parseInt(hex.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.substring(17, 20),
      hex.substring(20, 32)
    ].join('-');
    
    return uuid;
  }, []);

  // Handle project name save
  const handleProjectNameSave = useCallback(async () => {
    setIsEditingProjectName(false);
    
    // Generate new ID from project name
    const newVideoId = await generateIdFromName(projectName);
    
    // Save to backend with new ID
    await saveEditingSession(newVideoId, { projectName }, user?.id);
    
    // Navigate to new URL with the generated ID
    if (newVideoId !== videoId) {
      router.push(`/timeline/${newVideoId}`);
    } else {
      await saveEditingSession(videoId, { projectName }, user?.id);
    }
  }, [videoId, projectName, router, generateIdFromName, user?.id]);

  // Handle project name key press
  const handleProjectNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleProjectNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingProjectName(false);
      // Restore previous name from session
      loadEditingSession(videoId).then(session => {
        if (session.projectName) {
          setProjectName(session.projectName);
        } else {
          setProjectName("Untitled Project");
        }
      });
    }
  }, [videoId, handleProjectNameSave]);

  // Auto-save every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleAutoSave();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [handleAutoSave]);

  // Handle segment navigation shortcuts (keep existing behavior but integrate with new system)
  useEffect(() => {
    const handleSegmentNav = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Only handle these if we're not in an active shortcut
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.key === "ArrowLeft" && currentSegmentIndex > 0) {
          navigateToSegment(currentSegmentIndex - 1);
        } else if (e.key === "ArrowRight" && currentSegmentIndex < segments.length - 1) {
          navigateToSegment(currentSegmentIndex + 1);
        }
      } else if ((e.key === "a" || e.key === "A") && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (currentSegmentIndex >= 0 && currentSegmentIndex < segments.length) {
          handleAcceptSegment();
        }
      } else if ((e.key === "d" || e.key === "D") && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (currentSegmentIndex >= 0 && currentSegmentIndex < segments.length) {
          handleDeclineSegment();
        }
      }
    };

    window.addEventListener("keydown", handleSegmentNav);
    return () => window.removeEventListener("keydown", handleSegmentNav);
  }, [currentSegmentIndex, segments.length]);

  // Count segments by label, excluding accepted and kept segments
  const segmentCounts: Record<"FLUFF" | "HIGHLIGHTS", number> = useMemo(() => {
    const fluffCount = allSegments.filter(s => {
      if (s.label !== "FLUFF") return false;
      const segmentKey = `${s.start_time}-${s.end_time}`;
      return !acceptedSegments.has(segmentKey) && !keptSegments.has(segmentKey);
    }).length;
    
    const highlightsCount = highlights.filter(h => {
      const segmentKey = `${h.start}-${h.end}`;
      return !acceptedSegments.has(segmentKey) && !keptSegments.has(segmentKey);
    }).length;
    
    return {
      FLUFF: fluffCount,
      HIGHLIGHTS: highlightsCount,
    };
  }, [allSegments, highlights, acceptedSegments, keptSegments]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-purple-500 mx-auto mb-4"></div>
          <p className="text-zinc-300">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => router.push("/dashboard")} variant="primary">
            Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-black overflow-x-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-900">
          <div className="flex items-center gap-4">
            <div className="flex items-center" style={{ gap: '-4px' }}>
              <Image
                src="/logo.png"
                alt="YKlipp"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
                unoptimized
              />
              <span className="text-xl font-bold text-white">Yklipp</span>
            </div>
            <div className="w-px h-6 bg-zinc-700" />
            <div className="flex items-center gap-2">
              {isEditingProjectName ? (
                <input
                  ref={projectNameInputRef}
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleProjectNameSave}
                  onKeyDown={handleProjectNameKeyDown}
                  className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-zinc-500 min-w-[200px]"
                />
              ) : (
                <>
                  <span className="text-sm text-white font-medium">{projectName}</span>
                  <button
                    onClick={() => setIsEditingProjectName(true)}
                    className="p-1 hover:bg-zinc-800 rounded transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-zinc-400 hover:text-zinc-300" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center" style={{ gap: '5.5px' }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSaveProject}
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
                    onClick={handleUndo}
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
                    onClick={handleRedo}
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
                    onClick={handleExport}
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
          <div className="w-px h-6 bg-zinc-700" />
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                // Save pending cuts before navigating
                if (acceptedSegments.size > 0 && !saving && !cutting) {
                  try {
                    const cutsToStore = Array.from(acceptedSegments).map(key => {
                      const [start, end] = key.split('-').map(Number);
                      return { start_time: start, end_time: end };
                    });
                    if (cutsToStore.length > 0) {
                      await storePendingCuts(videoId, cutsToStore);
                    }
                  } catch (err) {
                    console.error("Error saving before navigation:", err);
                  }
                }
                router.push("/dashboard");
              }}
              variant="mono"
              size="sm"
            >
              Dashboard
            </Button>
            <Button
              onClick={() => router.push("/landing")}
              variant="mono"
              size="sm"
            >
              Home
            </Button>
          </div>
        </div>
      </div>

      <ResizablePanelGroup direction="vertical" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={70} minSize={30}>
          <div className="flex flex-col h-full">
            {videoUrl && (
              <VideoPlayer
                key={videoId}
                ref={playerRef}
                src={videoUrl}
                videoId={videoId}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                className="flex-1"
                currentSegment={currentSegment ? {
                  label: currentSegment.label,
                  reason: currentSegment.reason,
                  explanation: currentSegment.explanation,
                  start_time: currentSegment.start_time,
                  end_time: currentSegment.end_time,
                  rating: currentSegment.rating,
                } : undefined}
              />
            )}
            {/* Segment Review Panel */}
            {segments.length > 0 && (
              <div className="relative flex items-center gap-4 px-4 py-3 border-t border-zinc-800 bg-zinc-900 flex-shrink-0">
                {currentSegment && (
                  <>
                    <div className="flex flex-col items-center gap-1 px-2 sm:px-4">
                      <span className="text-xs text-zinc-400 uppercase tracking-wide">clip feedback</span>
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                        {(() => {
                          const segmentKey = currentSegment?.id || (currentSegment ? `${currentSegment.start_time}-${currentSegment.end_time}` : '');
                          const isDisabled = submittingFeedback || (segmentKey ? feedbackGiven.has(segmentKey) : false);
                          
                          return (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleSegmentFeedback("GREAT")}
                                    disabled={isDisabled}
                                    className="text-xl sm:text-2xl md:text-3xl px-3 py-2 sm:px-4 sm:py-2 md:px-2 md:py-1 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center bg-transparent hover:bg-zinc-800/50 active:bg-zinc-700/50 rounded-lg border border-transparent hover:border-zinc-600/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95 md:hover:scale-125 hover:drop-shadow-[0_0_8px_rgba(156,163,175,0.8)] disabled:hover:scale-100 disabled:hover:drop-shadow-none"
                                  >
                                    🔥
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Great Call</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleSegmentFeedback("FINE")}
                                    disabled={isDisabled}
                                    className="text-xl sm:text-2xl md:text-3xl px-3 py-2 sm:px-4 sm:py-2 md:px-2 md:py-1 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center bg-transparent hover:bg-zinc-800/50 active:bg-zinc-700/50 rounded-lg border border-transparent hover:border-zinc-600/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95 md:hover:scale-125 hover:drop-shadow-[0_0_8px_rgba(156,163,175,0.8)] disabled:hover:scale-100 disabled:hover:drop-shadow-none"
                                  >
                                    😐
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Fine</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleSegmentFeedback("WRONG")}
                                    disabled={isDisabled}
                                    className="text-xl sm:text-2xl md:text-3xl px-3 py-2 sm:px-4 sm:py-2 md:px-2 md:py-1 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center bg-transparent hover:bg-zinc-800/50 active:bg-zinc-700/50 rounded-lg border border-transparent hover:border-zinc-600/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95 md:hover:scale-125 hover:drop-shadow-[0_0_8px_rgba(156,163,175,0.8)] disabled:hover:scale-100 disabled:hover:drop-shadow-none"
                                  >
                                    🗑️
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Wrong Call</p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                  <div className="flex-1" />
                    <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => navigateToSegment(currentSegmentIndex - 1)}
                              disabled={currentSegmentIndex <= 0}
                              variant="mono"
                              size="sm"
                              className="h-7 text-xs"
                            >
                              ← Prev
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Previous segment ({isMac ? '⌘' : 'Ctrl'} + ←)</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-xs text-zinc-400 min-w-[100px] text-center">
                          {currentSegmentIndex + 1} / {segments.length}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => navigateToSegment(currentSegmentIndex + 1)}
                              disabled={currentSegmentIndex >= segments.length - 1}
                              variant="mono"
                              size="sm"
                              className="h-7 text-xs"
                            >
                              Next →
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Next segment ({isMac ? '⌘' : 'Ctrl'} + →)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-[-20px]">
                      <Button
                        onClick={handleImplementAllFluff}
                        variant="mono"
                        size="md"
                        title="Grey out all FLUFF segments"
                        disabled={cutting || saving || segmentCounts.FLUFF === 0}
                        className="!bg-[#2563EB] hover:!bg-[#1D4ED8] !text-white !shadow-[0_6px_20px_rgba(0,0,0,0.25)] !rounded-[10px] !font-semibold transition-all duration-150 hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                      >
                        Implement All
                      </Button>
                      <Button
                        onClick={handleAcceptSegment}
                        variant="primary"
                        size="md"
                        className="!bg-[#DC2626] hover:!bg-[#B91C1C] !text-white !shadow-[0_6px_20px_rgba(0,0,0,0.25)] !rounded-[10px] !font-semibold transition-all duration-150 hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                        title="Delete - Press 'A'"
                        disabled={cutting || saving}
                      >
                        {cutting ? "Deleting..." : "Delete"}
                      </Button>
                      <Button
                        onClick={handleDeclineSegment}
                        variant="mono"
                        size="md"
                        className="!bg-[#16A34A] hover:!bg-[#15803D] !text-white !shadow-[0_6px_20px_rgba(0,0,0,0.25)] !rounded-[10px] !font-semibold transition-all duration-150 hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                        title="Keep - Press 'D'"
                      >
                        Keep
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={30} minSize={30}>
          <div className="flex flex-col h-full">
            <Timeline
            sequences={sequences}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            onPlayPause={handlePlayPause}
            isPlaying={isPlaying}
            className="h-full"
            activeSequenceId={activeSequenceId}
            onSequenceChange={handleSequenceChange}
            onTrackControlChange={handleTrackControlChange}
            segments={segments.filter(segment => {
              const segmentKey = `${segment.start_time}-${segment.end_time}`;
              return !acceptedSegments.has(segmentKey) && !keptSegments.has(segmentKey);
            })}
            onBladeTool={handleBladeTool}
            onSelectTool={handleSelectTool}
            onTrimTool={handleTrimTool}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomToFit={handleZoomToFit}
            onAddMarker={handleAddMarker}
            onExport={handleExport}
            onSave={handleSaveProject}
            onUndo={handleUndo}
            onRedo={handleRedo}
            activeTool={activeTool}
            canUndo={canUndo}
            canRedo={canRedo}
            isMac={isMac}
            segmentFilter={segmentFilter}
            onSegmentFilterChange={(filter: "FLUFF" | "HIGHLIGHTS" | "ALL") => {
              setSegmentFilter(filter);
              setCurrentSegmentIndex(0);
            }}
            segmentCounts={segmentCounts}
            onPlaybackRateChange={handlePlaybackRateChange}
            playbackRate={playbackRate}
            acceptedSegments={acceptedSegments}
            gaps={gaps}
            videoUrl={videoUrl}
            onSplitClip={handleSplitClip}
            onTrimClip={handleTrimClip}
            selectedItemIds={selectedItemIds}
            onItemSelect={handleItemSelect}
            onMoveItem={handleMoveItem}
          />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thanks for the feedback!</DialogTitle>
            <DialogDescription>
              Your feedback helps us improve clip selection.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExportVideo}
        pendingCutsCount={pendingCutsCount}
      />
    </TooltipProvider>
  );
}
