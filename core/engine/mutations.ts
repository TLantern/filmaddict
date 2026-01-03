/**
 * Timeline Engine - Mutations
 * Pure functions that apply mutations to the timeline graph
 */

import {
  Clip,
  Track,
  TimelineGraph,
  Mutation,
  ToggleClipMutation,
  EnableClipMutation,
  DisableClipMutation,
  SplitClipMutation,
  MoveClipMutation,
  TrimClipMutation,
  DeleteClipMutation,
  SetTrackLockedMutation,
  SetTrackMutedMutation,
  SetTrackVisibleMutation,
  BatchMutation,
} from './types';
import { getClipEnd, getClipDuration } from './resolver';

/**
 * Find a clip by ID across all tracks
 */
function findClip(graph: TimelineGraph, clipId: string): { clip: Clip; track: Track; index: number } | null {
  for (const track of graph.tracks) {
    const index = track.clips.findIndex(c => c.id === clipId);
    if (index !== -1) {
      return { clip: track.clips[index], track, index };
    }
  }
  return null;
}

/**
 * Find a track by ID
 */
function findTrack(graph: TimelineGraph, trackId: string): Track | null {
  return graph.tracks.find(t => t.id === trackId) || null;
}

/**
 * Deep clone the graph to ensure immutability
 */
function cloneGraph(graph: TimelineGraph): TimelineGraph {
  return {
    ...graph,
    tracks: graph.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip => ({
        ...clip,
        metadata: clip.metadata ? { ...clip.metadata } : undefined,
      })),
    })),
  };
}

// ============================================================================
// Mutation Handlers
// ============================================================================

function applyToggleClip(graph: TimelineGraph, mutation: ToggleClipMutation): TimelineGraph {
  const newGraph = cloneGraph(graph);
  const result = findClip(newGraph, mutation.clipId);
  
  if (result) {
    result.clip.enabled = !result.clip.enabled;
  }
  
  return newGraph;
}

function applyEnableClip(graph: TimelineGraph, mutation: EnableClipMutation): TimelineGraph {
  const newGraph = cloneGraph(graph);
  const result = findClip(newGraph, mutation.clipId);
  
  if (result) {
    result.clip.enabled = true;
  }
  
  return newGraph;
}

function applyDisableClip(graph: TimelineGraph, mutation: DisableClipMutation): TimelineGraph {
  const newGraph = cloneGraph(graph);
  const result = findClip(newGraph, mutation.clipId);
  
  if (result) {
    result.clip.enabled = false;
  }
  
  return newGraph;
}

function applySplitClip(graph: TimelineGraph, mutation: SplitClipMutation): TimelineGraph {
  const newGraph = cloneGraph(graph);
  const result = findClip(newGraph, mutation.clipId);
  
  if (!result) return newGraph;
  
  const { clip, track, index } = result;
  const clipEnd = getClipEnd(clip);
  
  // Validate split time is within clip bounds
  if (mutation.splitTime <= clip.start || mutation.splitTime >= clipEnd) {
    return newGraph;
  }
  
  // Calculate split point in source media
  const localSplitTime = mutation.splitTime - clip.start;
  const sourceSplitPoint = clip.in + localSplitTime;
  
  // Create first half (original clip, shortened)
  const firstClip: Clip = {
    ...clip,
    out: sourceSplitPoint,
  };
  
  // Create second half (new clip)
  const secondClip: Clip = {
    ...clip,
    id: `${clip.id}-split-${Date.now()}`,
    in: sourceSplitPoint,
    start: mutation.splitTime,
    metadata: clip.metadata ? { ...clip.metadata } : undefined,
  };
  
  // Replace original clip with the two halves
  track.clips.splice(index, 1, firstClip, secondClip);
  
  return newGraph;
}

function applyMoveClip(graph: TimelineGraph, mutation: MoveClipMutation): TimelineGraph {
  const newGraph = cloneGraph(graph);
  const result = findClip(newGraph, mutation.clipId);
  
  if (!result) return newGraph;
  
  const { clip, track } = result;
  
  // Don't allow moving locked track clips
  if (track.locked) return newGraph;
  
  // Ensure clip stays within timeline bounds
  const duration = getClipDuration(clip);
  const newStart = Math.max(0, mutation.newStart);
  
  clip.start = newStart;
  
  return newGraph;
}

function applyTrimClip(graph: TimelineGraph, mutation: TrimClipMutation): TimelineGraph {
  const newGraph = cloneGraph(graph);
  const result = findClip(newGraph, mutation.clipId);
  
  if (!result) return newGraph;
  
  const { clip, track } = result;
  
  // Don't allow trimming locked track clips
  if (track.locked) return newGraph;
  
  // Apply new values if provided
  if (mutation.newIn !== undefined) {
    clip.in = Math.max(0, mutation.newIn);
  }
  if (mutation.newOut !== undefined) {
    clip.out = mutation.newOut;
  }
  if (mutation.newStart !== undefined) {
    clip.start = Math.max(0, mutation.newStart);
  }
  
  // Validate: in must be less than out
  if (clip.in >= clip.out) {
    // Revert to original values
    const original = findClip(graph, mutation.clipId);
    if (original) {
      clip.in = original.clip.in;
      clip.out = original.clip.out;
    }
  }
  
  return newGraph;
}

function applyDeleteClip(graph: TimelineGraph, mutation: DeleteClipMutation): TimelineGraph {
  const newGraph = cloneGraph(graph);
  
  for (const track of newGraph.tracks) {
    const index = track.clips.findIndex(c => c.id === mutation.clipId);
    if (index !== -1) {
      // Don't allow deleting from locked tracks
      if (track.locked) return newGraph;
      track.clips.splice(index, 1);
      break;
    }
  }
  
  return newGraph;
}

function applySetTrackLocked(graph: TimelineGraph, mutation: SetTrackLockedMutation): TimelineGraph {
  const newGraph = cloneGraph(graph);
  const track = findTrack(newGraph, mutation.trackId);
  
  if (track) {
    track.locked = mutation.locked;
  }
  
  return newGraph;
}

function applySetTrackMuted(graph: TimelineGraph, mutation: SetTrackMutedMutation): TimelineGraph {
  const newGraph = cloneGraph(graph);
  const track = findTrack(newGraph, mutation.trackId);
  
  if (track) {
    track.muted = mutation.muted;
  }
  
  return newGraph;
}

function applySetTrackVisible(graph: TimelineGraph, mutation: SetTrackVisibleMutation): TimelineGraph {
  const newGraph = cloneGraph(graph);
  const track = findTrack(newGraph, mutation.trackId);
  
  if (track) {
    track.visible = mutation.visible;
  }
  
  return newGraph;
}

function applyBatch(graph: TimelineGraph, mutation: BatchMutation): TimelineGraph {
  let result = graph;
  for (const m of mutation.mutations) {
    result = applyMutation(result, m);
  }
  return result;
}

// ============================================================================
// Main Mutation Dispatcher
// ============================================================================

/**
 * Apply a mutation to the timeline graph.
 * Returns a new graph instance (immutable update).
 * 
 * @param graph - Current timeline graph
 * @param mutation - The mutation to apply
 * @returns New timeline graph with mutation applied
 */
export function applyMutation(graph: TimelineGraph, mutation: Mutation): TimelineGraph {
  switch (mutation.type) {
    case 'TOGGLE_CLIP':
      return applyToggleClip(graph, mutation);
    case 'ENABLE_CLIP':
      return applyEnableClip(graph, mutation);
    case 'DISABLE_CLIP':
      return applyDisableClip(graph, mutation);
    case 'SPLIT_CLIP':
      return applySplitClip(graph, mutation);
    case 'MOVE_CLIP':
      return applyMoveClip(graph, mutation);
    case 'TRIM_CLIP':
      return applyTrimClip(graph, mutation);
    case 'DELETE_CLIP':
      return applyDeleteClip(graph, mutation);
    case 'SET_TRACK_LOCKED':
      return applySetTrackLocked(graph, mutation);
    case 'SET_TRACK_MUTED':
      return applySetTrackMuted(graph, mutation);
    case 'SET_TRACK_VISIBLE':
      return applySetTrackVisible(graph, mutation);
    case 'BATCH':
      return applyBatch(graph, mutation);
    default:
      // Exhaustive check - should never reach here
      const _exhaustive: never = mutation;
      return graph;
  }
}

