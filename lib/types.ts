export enum VideoStatus {
  UPLOADED = "UPLOADED",
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  TRANSCRIBED = "TRANSCRIBED",
  HIGHLIGHTS_FOUND = "HIGHLIGHTS_FOUND",
  DONE = "DONE",
  FAILED = "FAILED",
}

export interface Highlight {
  start: number;
  end: number;
  title: string | null;
  summary: string | null;
  score: number;
  explanation?: VerdictExplanation;
}

export interface MomentResponse {
  id: string;
  moment_url: string;
  start: number;
  end: number;
  thumbnail_url: string | null;
}

export interface VideoStatusResponse {
  video_id: string;
  status: VideoStatus;
  duration: number | null;
  created_at: string;
  error_message?: string | null;
}

export interface HighlightsResponse {
  video_id: string;
  highlights: Highlight[];
}

export interface MomentsResponse {
  video_id: string;
  moments: MomentResponse[];
}

export interface UploadResponse {
  video_id: string;
  status: string;
  storage_path: string;
}

export interface SavedMoment {
  id: string;
  moment_id: string;
  highlight_id: string | null;
  created_at: string;
}

export interface SavedMomentResponse {
  id: string;
  moment_id: string;
  status: string;
}

export interface MomentDetailResponse {
  id: string;
  video_id: string;
  start: number;
  end: number;
  video_url: string;
  video_duration: number;
  thumbnail_url: string | null;
}

export interface ProjectResponse {
  video_id: string;
  created_at: string;
  duration: number | null;
  moment_count: number;
  thumbnail_url: string | null;
  project_name: string | null;
}

export interface ProjectsResponse {
  projects: ProjectResponse[];
}

export interface TimelineItem {
  id: string;
  start: number;
  end: number;
  title: string;
  momentUrl: string;
  isHighlight?: boolean; // Mark highlights for purple color on timeline
  rank?: number; // Rank number for highlights (1 = best, 2 = second best, etc.)
}

export interface Track {
  id: string;
  items: TimelineItem[];
  trackType: 'video' | 'audio';
  trackIndex: number; // V1=0, V2=1, V3=2 for video; A1=0, A2=1, A3=2 for audio
  locked: boolean;
  visible: boolean;
  muted: boolean;
  soloed: boolean;
}

export interface Sequence {
  id: string;
  name: string;
  videoTracks: Track[]; // Exactly 3 tracks
  audioTracks: Track[]; // Exactly 3 tracks
  duration: number; // In seconds
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResponse {
  video_id: string;
  segments: TranscriptSegment[];
}

// EDL-based segment with keep toggle for instant timeline editing
export interface EditableSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  keep: boolean;
}

export type EDL = [number, number][];  // kept regions
export type Gaps = [number, number][]; // removed regions (inverse of EDL)

export type VerdictType = "FLUFF" | "HIGHLIGHT";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface VerdictExplanation {
  verdict: VerdictType;
  confidence: ConfidenceLevel;
  evidence: string[]; // max 3 items
  action_hint: string;
}

export interface SegmentAnalysis {
  id?: string;
  start_time: number;
  end_time: number;
  label: "FLUFF" | "HIGHLIGHTS";
  rating: number;
  grade?: string;
  reason: string;
  repetition_score: number;
  filler_density: number;
  visual_change_score: number;
  usefulness_score: number;
  explanation?: VerdictExplanation;
}

export interface SegmentsResponse {
  video_id: string;
  segments: SegmentAnalysis[];
}

