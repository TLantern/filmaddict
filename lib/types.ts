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

export interface MomentFeedbackRequest {
  rating: number;
  text_feedback?: string;
}

export interface MomentFeedbackResponse {
  id: string;
  status: string;
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
}

export interface Track {
  id: string;
  items: TimelineItem[];
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

