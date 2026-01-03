/**
 * Timeline Engine - Type Definitions
 * Framework-agnostic data models for timeline editing
 */

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * A Clip represents a segment of source media placed on the timeline.
 * Follows NLE conventions: source in/out points are separate from timeline position.
 */
export interface Clip {
  id: string;
  /** Source video/audio identifier (video ID or URL) */
  source: string;
  /** In-point in source media (seconds) */
  in: number;
  /** Out-point in source media (seconds) */
  out: number;
  /** Position on timeline where clip starts (seconds) */
  start: number;
  /** Whether this clip is enabled (true) or cut (false) */
  enabled: boolean;
  /** Optional metadata for UI and analysis */
  metadata?: ClipMetadata;
}

export interface ClipMetadata {
  /** Transcript text for this clip */
  text?: string;
  /** Classification label (e.g., "FLUFF", "HIGHLIGHT") */
  label?: string;
  /** Analysis rating score */
  rating?: number;
  /** Human-readable title */
  title?: string;
}

/**
 * A Track is a lane on the timeline containing clips.
 * Video tracks and audio tracks are separate.
 */
export interface Track {
  id: string;
  type: 'video' | 'audio';
  clips: Clip[];
  /** Track index (0 = V1/A1, 1 = V2/A2, etc.) */
  index: number;
  /** Locked tracks cannot be edited */
  locked: boolean;
  /** Muted tracks don't play audio */
  muted: boolean;
  /** Track visibility (for video tracks) */
  visible: boolean;
}

/**
 * TimelineGraph is the complete state of the timeline.
 * This is the "document" that the engine manages.
 */
export interface TimelineGraph {
  /** All tracks in the timeline */
  tracks: Track[];
  /** Total timeline duration (seconds) */
  duration: number;
  /** Primary source video ID */
  sourceId: string;
  /** Project name */
  name?: string;
}

// ============================================================================
// Resolution Types
// ============================================================================

/**
 * Result of resolving a timeline time to a specific frame/clip.
 * Used by the playback loop to determine what to display.
 */
export interface ResolvedFrame {
  /** The clip at this time, or null if in a gap */
  clip: Clip | null;
  /** The corresponding time in the source media */
  sourceTime: number;
  /** Whether this time falls in a gap (disabled/cut region) */
  isGap: boolean;
  /** Track this clip belongs to (if clip is not null) */
  track?: Track;
}

// ============================================================================
// Mutation Types
// ============================================================================

export type MutationType =
  | 'TOGGLE_CLIP'
  | 'ENABLE_CLIP'
  | 'DISABLE_CLIP'
  | 'SPLIT_CLIP'
  | 'MOVE_CLIP'
  | 'TRIM_CLIP'
  | 'DELETE_CLIP'
  | 'SET_TRACK_LOCKED'
  | 'SET_TRACK_MUTED'
  | 'SET_TRACK_VISIBLE'
  | 'BATCH';

export interface ToggleClipMutation {
  type: 'TOGGLE_CLIP';
  clipId: string;
}

export interface EnableClipMutation {
  type: 'ENABLE_CLIP';
  clipId: string;
}

export interface DisableClipMutation {
  type: 'DISABLE_CLIP';
  clipId: string;
}

export interface SplitClipMutation {
  type: 'SPLIT_CLIP';
  clipId: string;
  /** Time at which to split (timeline time) */
  splitTime: number;
}

export interface MoveClipMutation {
  type: 'MOVE_CLIP';
  clipId: string;
  /** New start position on timeline */
  newStart: number;
}

export interface TrimClipMutation {
  type: 'TRIM_CLIP';
  clipId: string;
  /** New in-point in source (optional) */
  newIn?: number;
  /** New out-point in source (optional) */
  newOut?: number;
  /** New timeline start (optional) */
  newStart?: number;
}

export interface DeleteClipMutation {
  type: 'DELETE_CLIP';
  clipId: string;
}

export interface SetTrackLockedMutation {
  type: 'SET_TRACK_LOCKED';
  trackId: string;
  locked: boolean;
}

export interface SetTrackMutedMutation {
  type: 'SET_TRACK_MUTED';
  trackId: string;
  muted: boolean;
}

export interface SetTrackVisibleMutation {
  type: 'SET_TRACK_VISIBLE';
  trackId: string;
  visible: boolean;
}

export interface BatchMutation {
  type: 'BATCH';
  mutations: Mutation[];
}

export type Mutation =
  | ToggleClipMutation
  | EnableClipMutation
  | DisableClipMutation
  | SplitClipMutation
  | MoveClipMutation
  | TrimClipMutation
  | DeleteClipMutation
  | SetTrackLockedMutation
  | SetTrackMutedMutation
  | SetTrackVisibleMutation
  | BatchMutation;

// ============================================================================
// Listener Types
// ============================================================================

export type SnapshotListener = (snapshot: Readonly<TimelineGraph>) => void;

// ============================================================================
// Utility Types
// ============================================================================

/** EDL (Edit Decision List) - array of [start, end] tuples for kept regions */
export type EDL = [number, number][];

/** Gaps - array of [start, end] tuples for removed/disabled regions */
export type Gaps = [number, number][];

