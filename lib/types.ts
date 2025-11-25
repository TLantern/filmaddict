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
  reason: string;
  score: number;
}

export interface ClipResponse {
  id: string;
  clip_url: string;
  start: number;
  end: number;
  thumbnail_url: string | null;
}

export interface VideoStatusResponse {
  video_id: string;
  status: VideoStatus;
  duration: number | null;
  created_at: string;
}

export interface HighlightsResponse {
  video_id: string;
  highlights: Highlight[];
}

export interface ClipsResponse {
  video_id: string;
  clips: ClipResponse[];
}

export interface UploadResponse {
  video_id: string;
  status: string;
  storage_path: string;
}

export interface ClipFeedbackRequest {
  rating: number;
  text_feedback?: string;
}

export interface ClipFeedbackResponse {
  id: string;
  status: string;
}

export interface SavedClip {
  id: string;
  clip_id: string;
  highlight_id: string | null;
  created_at: string;
}

export interface SavedClipResponse {
  id: string;
  clip_id: string;
  status: string;
}

