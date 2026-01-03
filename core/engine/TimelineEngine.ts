/**
 * Timeline Engine - Main Class
 * Framework-agnostic timeline state management with pub/sub
 */

import {
  Clip,
  Track,
  TimelineGraph,
  ResolvedFrame,
  Mutation,
  SnapshotListener,
  EDL,
  Gaps,
} from './types';
import { resolve, findNextEnabledClip, findPrevEnabledClip, getClipEnd, getEnabledClips } from './resolver';
import { applyMutation } from './mutations';

/**
 * TimelineEngine is the single source of truth for timeline state.
 * 
 * React components subscribe to snapshots and dispatch mutations.
 * The engine handles all state updates and notifies subscribers.
 */
export class TimelineEngine {
  private graph: TimelineGraph;
  private listeners: Set<SnapshotListener> = new Set();

  constructor(initialGraph: TimelineGraph) {
    this.graph = initialGraph;
  }

  // ============================================================================
  // Core API
  // ============================================================================

  /**
   * Get a readonly snapshot of the current timeline state.
   * Used by React components to read state.
   */
  snapshot(): Readonly<TimelineGraph> {
    return this.graph;
  }

  /**
   * Apply a mutation to the timeline.
   * Notifies all subscribers after the mutation is applied.
   * 
   * @param mutation - The mutation to apply
   */
  mutate(mutation: Mutation): void {
    this.graph = applyMutation(this.graph, mutation);
    this.notifyListeners();
  }

  /**
   * Subscribe to timeline changes.
   * Callback is invoked immediately with current state, then on every mutation.
   * 
   * @param listener - Callback function receiving the snapshot
   * @returns Unsubscribe function
   */
  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.graph);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Resolve a timeline time to find the active clip.
   * 
   * @param time - Timeline time in seconds
   * @param trackType - Filter by track type (default: 'video')
   * @returns ResolvedFrame with clip and source time info
   */
  resolve(time: number, trackType: 'video' | 'audio' = 'video'): ResolvedFrame {
    return resolve(this.graph, time, trackType);
  }

  /**
   * Find the next enabled clip after the given time.
   * Used for gap-skipping during playback.
   */
  findNextEnabledClip(time: number, trackType: 'video' | 'audio' = 'video'): Clip | null {
    return findNextEnabledClip(this.graph, time, trackType);
  }

  /**
   * Find the previous enabled clip before the given time.
   * Used for backward navigation.
   */
  findPrevEnabledClip(time: number, trackType: 'video' | 'audio' = 'video'): Clip | null {
    return findPrevEnabledClip(this.graph, time, trackType);
  }

  // ============================================================================
  // EDL/Gaps Computation
  // ============================================================================

  /**
   * Convert timeline to EDL (Edit Decision List).
   * Returns array of [start, end] tuples for enabled regions.
   */
  toEDL(): EDL {
    const enabledClips = getEnabledClips(this.graph, 'video');
    return enabledClips.map(clip => [clip.start, getClipEnd(clip)] as [number, number]);
  }

  /**
   * Compute gaps (removed regions) from the timeline.
   * Returns array of [start, end] tuples for disabled/gap regions.
   */
  toGaps(): Gaps {
    const edl = this.toEDL();
    const duration = this.graph.duration;
    
    if (edl.length === 0) {
      return duration > 0 ? [[0, duration]] : [];
    }
    
    const sorted = [...edl].sort((a, b) => a[0] - b[0]);
    const gaps: Gaps = [];
    
    // Gap before first segment
    if (sorted[0][0] > 0) {
      gaps.push([0, sorted[0][0]]);
    }
    
    // Gaps between segments
    for (let i = 0; i < sorted.length - 1; i++) {
      const gapStart = sorted[i][1];
      const gapEnd = sorted[i + 1][0];
      if (gapEnd > gapStart) {
        gaps.push([gapStart, gapEnd]);
      }
    }
    
    // Gap after last segment
    const lastEnd = sorted[sorted.length - 1][1];
    if (lastEnd < duration) {
      gaps.push([lastEnd, duration]);
    }
    
    return gaps;
  }

  // ============================================================================
  // Convenience Accessors
  // ============================================================================

  /**
   * Get all enabled clips sorted by timeline position.
   */
  getEnabledClips(trackType?: 'video' | 'audio'): Clip[] {
    return getEnabledClips(this.graph, trackType);
  }

  /**
   * Get timeline duration.
   */
  getDuration(): number {
    return this.graph.duration;
  }

  /**
   * Get the source video ID.
   */
  getSourceId(): string {
    return this.graph.sourceId;
  }

  /**
   * Get all tracks.
   */
  getTracks(): readonly Track[] {
    return this.graph.tracks;
  }

  /**
   * Find a clip by ID.
   */
  findClipById(clipId: string): Clip | null {
    for (const track of this.graph.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) return clip;
    }
    return null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.graph);
    });
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  /**
   * Create a TimelineEngine from an array of clips.
   * Creates a single video track with the provided clips.
   */
  static fromClips(clips: Clip[], sourceId: string, duration: number): TimelineEngine {
    const videoTrack: Track = {
      id: 'video-track-0',
      type: 'video',
      clips: [...clips],
      index: 0,
      locked: false,
      muted: false,
      visible: true,
    };

    const audioTrack: Track = {
      id: 'audio-track-0',
      type: 'audio',
      clips: clips.map(c => ({
        ...c,
        id: `audio-${c.id}`,
        metadata: c.metadata ? { ...c.metadata } : undefined,
      })),
      index: 0,
      locked: false,
      muted: false,
      visible: true,
    };

    const graph: TimelineGraph = {
      tracks: [videoTrack, audioTrack],
      duration,
      sourceId,
    };

    return new TimelineEngine(graph);
  }

  /**
   * Create a TimelineEngine from legacy EditableSegment format.
   * Converts segments to clips with source positions matching timeline positions.
   */
  static fromSegments(
    segments: Array<{ id: string; start: number; end: number; text?: string; keep: boolean }>,
    sourceId: string,
    duration: number
  ): TimelineEngine {
    const clips: Clip[] = segments.map(seg => ({
      id: seg.id,
      source: sourceId,
      in: seg.start,
      out: seg.end,
      start: seg.start,
      enabled: seg.keep,
      metadata: {
        text: seg.text,
      },
    }));

    return TimelineEngine.fromClips(clips, sourceId, duration);
  }

  /**
   * Convert engine state back to legacy EditableSegment format.
   * Used for backward compatibility with existing components.
   */
  toEditableSegments(): Array<{ id: string; start: number; end: number; text: string; keep: boolean }> {
    const videoTrack = this.graph.tracks.find(t => t.type === 'video');
    if (!videoTrack) return [];

    return videoTrack.clips.map(clip => ({
      id: clip.id,
      start: clip.start,
      end: getClipEnd(clip),
      text: clip.metadata?.text || '',
      keep: clip.enabled,
    }));
  }
}

