/**
 * Timeline Engine - Public API
 * 
 * This module exports the Timeline Engine - a framework-agnostic
 * state management system for video timeline editing.
 * 
 * Usage:
 * ```typescript
 * import { TimelineEngine } from '@/core/engine';
 * 
 * // Create from segments
 * const engine = TimelineEngine.fromSegments(segments, videoId, duration);
 * 
 * // Subscribe to changes
 * const unsubscribe = engine.subscribe((snapshot) => {
 *   console.log('Timeline updated:', snapshot);
 * });
 * 
 * // Apply mutations
 * engine.mutate({ type: 'TOGGLE_CLIP', clipId: 'clip-1' });
 * 
 * // Resolve playback time
 * const frame = engine.resolve(currentTime);
 * if (frame.isGap) {
 *   const nextClip = engine.findNextEnabledClip(currentTime);
 *   if (nextClip) player.seek(nextClip.start);
 * }
 * 
 * // Get EDL for export
 * const edl = engine.toEDL();
 * const gaps = engine.toGaps();
 * ```
 */

// Main Engine Class
export { TimelineEngine } from './TimelineEngine';

// Types
export type {
  // Core data models
  Clip,
  ClipMetadata,
  Track,
  TimelineGraph,
  ResolvedFrame,
  
  // Mutation types
  Mutation,
  MutationType,
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
  
  // Utility types
  SnapshotListener,
  EDL,
  Gaps,
} from './types';

// Resolver utilities (for advanced use cases)
export {
  resolve,
  findNextEnabledClip,
  findPrevEnabledClip,
  isTimeInGap,
  getGapExitTime,
  getEnabledClips,
  getClipEnd,
  getClipDuration,
} from './resolver';

// Mutation utilities (for testing or custom mutation pipelines)
export { applyMutation } from './mutations';

