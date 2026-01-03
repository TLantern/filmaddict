/**
 * Timeline Engine - Resolver
 * Finds the active clip at a given timeline time
 */

import { Clip, Track, TimelineGraph, ResolvedFrame } from './types';

/**
 * Binary search to find clip containing the given time.
 * Clips are assumed to be sorted by start time.
 * Returns the clip index or -1 if not found.
 */
function binarySearchClip(clips: Clip[], time: number): number {
  let left = 0;
  let right = clips.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const clip = clips[mid];
    const clipEnd = clip.start + (clip.out - clip.in);
    
    if (time >= clip.start && time < clipEnd) {
      return mid;
    } else if (time < clip.start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  
  return -1;
}

/**
 * Get the timeline end position of a clip
 */
export function getClipEnd(clip: Clip): number {
  return clip.start + (clip.out - clip.in);
}

/**
 * Get the duration of a clip
 */
export function getClipDuration(clip: Clip): number {
  return clip.out - clip.in;
}

/**
 * Resolve a timeline time to a specific frame/clip.
 * This is the core function that determines what should be playing at any given time.
 * 
 * @param graph - The timeline graph to resolve against
 * @param time - The timeline time to resolve (in seconds)
 * @param trackType - Optional filter for track type ('video' or 'audio')
 * @returns ResolvedFrame with the active clip and source time
 */
export function resolve(
  graph: TimelineGraph,
  time: number,
  trackType: 'video' | 'audio' = 'video'
): ResolvedFrame {
  // Filter to relevant tracks
  const tracks = graph.tracks.filter(t => t.type === trackType && t.visible);
  
  // Search each track for a clip at this time
  for (const track of tracks) {
    // Get only enabled clips, sorted by start time
    const enabledClips = track.clips
      .filter(c => c.enabled)
      .sort((a, b) => a.start - b.start);
    
    if (enabledClips.length === 0) continue;
    
    // Binary search for clip at this time
    const clipIndex = binarySearchClip(enabledClips, time);
    
    if (clipIndex !== -1) {
      const clip = enabledClips[clipIndex];
      // Calculate the corresponding source time
      const localTime = time - clip.start;
      const sourceTime = clip.in + localTime;
      
      return {
        clip,
        sourceTime,
        isGap: false,
        track,
      };
    }
  }
  
  // No clip found at this time - it's a gap
  return {
    clip: null,
    sourceTime: time, // Default to timeline time as source time
    isGap: true,
  };
}

/**
 * Find the next enabled clip after the given time.
 * Used for gap-skipping during playback.
 * 
 * @param graph - The timeline graph
 * @param time - Current timeline time
 * @param trackType - Optional filter for track type
 * @returns The next clip, or null if none exists
 */
export function findNextEnabledClip(
  graph: TimelineGraph,
  time: number,
  trackType: 'video' | 'audio' = 'video'
): Clip | null {
  const tracks = graph.tracks.filter(t => t.type === trackType && t.visible);
  
  let nextClip: Clip | null = null;
  let nextStart = Infinity;
  
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (clip.enabled && clip.start > time && clip.start < nextStart) {
        nextClip = clip;
        nextStart = clip.start;
      }
    }
  }
  
  return nextClip;
}

/**
 * Find the previous enabled clip before the given time.
 * Used for backward navigation.
 * 
 * @param graph - The timeline graph
 * @param time - Current timeline time
 * @param trackType - Optional filter for track type
 * @returns The previous clip, or null if none exists
 */
export function findPrevEnabledClip(
  graph: TimelineGraph,
  time: number,
  trackType: 'video' | 'audio' = 'video'
): Clip | null {
  const tracks = graph.tracks.filter(t => t.type === trackType && t.visible);
  
  let prevClip: Clip | null = null;
  let prevEnd = -Infinity;
  
  for (const track of tracks) {
    for (const clip of track.clips) {
      const clipEnd = getClipEnd(clip);
      if (clip.enabled && clipEnd <= time && clip.start > prevEnd) {
        prevClip = clip;
        prevEnd = clip.start;
      }
    }
  }
  
  return prevClip;
}

/**
 * Check if a given time falls within a gap (no enabled clips).
 * 
 * @param graph - The timeline graph
 * @param time - The timeline time to check
 * @param trackType - Optional filter for track type
 * @returns true if the time is in a gap
 */
export function isTimeInGap(
  graph: TimelineGraph,
  time: number,
  trackType: 'video' | 'audio' = 'video'
): boolean {
  return resolve(graph, time, trackType).isGap;
}

/**
 * Get the exit time for the current gap (end of gap).
 * Returns the start time of the next enabled clip, or null if at end of timeline.
 * 
 * @param graph - The timeline graph
 * @param time - Current timeline time (assumed to be in a gap)
 * @param trackType - Optional filter for track type
 * @returns The time to skip to, or null if no more clips
 */
export function getGapExitTime(
  graph: TimelineGraph,
  time: number,
  trackType: 'video' | 'audio' = 'video'
): number | null {
  const nextClip = findNextEnabledClip(graph, time, trackType);
  return nextClip ? nextClip.start : null;
}

/**
 * Get all enabled clips sorted by timeline position.
 * 
 * @param graph - The timeline graph
 * @param trackType - Optional filter for track type
 * @returns Array of enabled clips sorted by start time
 */
export function getEnabledClips(
  graph: TimelineGraph,
  trackType?: 'video' | 'audio'
): Clip[] {
  const tracks = trackType 
    ? graph.tracks.filter(t => t.type === trackType)
    : graph.tracks;
  
  const clips: Clip[] = [];
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (clip.enabled) {
        clips.push(clip);
      }
    }
  }
  
  return clips.sort((a, b) => a.start - b.start);
}

/**
 * Get all disabled clips sorted by timeline position.
 * 
 * @param graph - The timeline graph
 * @param trackType - Optional filter for track type
 * @returns Array of disabled clips sorted by start time
 */
export function getDisabledClips(
  graph: TimelineGraph,
  trackType?: 'video' | 'audio'
): Clip[] {
  const tracks = trackType 
    ? graph.tracks.filter(t => t.type === trackType)
    : graph.tracks;
  
  const clips: Clip[] = [];
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (!clip.enabled) {
        clips.push(clip);
      }
    }
  }
  
  return clips.sort((a, b) => a.start - b.start);
}

