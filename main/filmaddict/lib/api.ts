import {
  UploadResponse,
  VideoStatusResponse,
  HighlightsResponse,
  MomentsResponse,
  SavedMomentResponse,
  MomentDetailResponse,
  MomentResponse,
  ProjectsResponse,
  TranscriptResponse,
  SegmentsResponse,
} from "./types";

// Use environment variable for API URL
// When using ngrok, set NEXT_PUBLIC_API_URL to your backend ngrok URL
// Example: NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL environment variable is required");
  }
  // Remove trailing slash to prevent double slashes in URLs
  return url.replace(/\/+$/, '');
}

// Helper to add ngrok bypass header if using ngrok
function getHeaders(additionalHeaders?: Record<string, string>, userId?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };
  
  // Add Clerk user ID header if provided
  if (userId) {
    headers["X-Clerk-User-Id"] = userId;
  }
  
  // Add ngrok-skip-browser-warning header when using ngrok
  if (getApiBaseUrl().includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "true";
  }
  
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

async function fetchWithErrorHandling(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      const isNgrok = getApiBaseUrl().includes("ngrok");
      const baseUrl = isNgrok ? "ngrok backend" : getApiBaseUrl();
      throw new Error(`Network error: Unable to connect to ${baseUrl}. Make sure the backend is running and accessible.`);
    }
    throw error;
  }
}

export async function uploadVideo(file: File, aspectRatio?: string, userId?: string | null): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (aspectRatio) {
    formData.append("aspect_ratio", aspectRatio);
  }

  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/videos/upload`, {
    method: "POST",
    headers: getHeaders(undefined, userId),
    body: formData,
  });

  return handleResponse<UploadResponse>(response);
}

export async function uploadYouTubeVideo(youtubeUrl: string, aspectRatio?: string, userId?: string | null): Promise<UploadResponse> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/videos/youtube`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
    }, userId),
    body: JSON.stringify({ youtube_url: youtubeUrl, aspect_ratio: aspectRatio }),
  });

  return handleResponse<UploadResponse>(response);
}

export async function getVideoStatus(videoId: string): Promise<VideoStatusResponse> {
  const url = `${getApiBaseUrl()}/videos/${videoId}/status`;
  console.log(`[API] Fetching video status from: ${url}`);
  const response = await fetchWithErrorHandling(url, {
    headers: getHeaders(),
  });
  const data = await handleResponse<VideoStatusResponse>(response);
  console.log(`[API] Video status response:`, data);
  return data;
}

export async function getHighlights(videoId: string): Promise<HighlightsResponse> {
  const url = `${getApiBaseUrl()}/videos/${videoId}/highlights`;
  console.log(`[API] Fetching highlights from: ${url}`);
  const response = await fetchWithErrorHandling(url, {
    headers: getHeaders(),
  });
  const data = await handleResponse<HighlightsResponse>(response);
  console.log(`[API] Highlights response:`, { count: data.highlights.length, highlights: data.highlights });
  return data;
}

export async function getMoments(videoId: string): Promise<MomentsResponse> {
  const url = `${getApiBaseUrl()}/videos/${videoId}/moments`;
  console.log(`[API] Fetching moments from: ${url}`);
  const response = await fetchWithErrorHandling(url, {
    headers: getHeaders(),
  });
  const data = await handleResponse<MomentsResponse>(response);
  console.log(`[API] Moments response:`, { count: data.moments.length, moments: data.moments });
  return data;
}

export function getMomentDownloadUrl(momentId: string): string {
  return `${getApiBaseUrl()}/moments/${momentId}/download`;
}

export function getMomentPlaybackUrl(momentId: string): string {
  return `${getApiBaseUrl()}/moments/${momentId}/download`;
}

export async function getMomentPlaybackUrlDirect(momentId: string): Promise<string> {
  // Fetch the redirect URL to get the actual S3 presigned URL
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/moments/${momentId}/download`, {
    method: "HEAD",
    headers: getHeaders(),
    redirect: "follow",
  });
  
  if (response.redirected && response.url) {
    return response.url;
  }
  
  // Fallback to the original URL if no redirect
  return getMomentPlaybackUrl(momentId);
}

export async function getMomentPlaybackBlobUrl(momentId: string): Promise<string> {
  // For ngrok, fetch video with headers and create blob URL
  // This bypasses ngrok's browser warning page and CORS issues
  const url = getMomentPlaybackUrl(momentId);
  try {
    const response = await fetchWithErrorHandling(url, {
      headers: getHeaders(),
      redirect: "follow",
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => `Status ${response.status}`);
      throw new Error(`Failed to load video: ${response.status} - ${errorText.substring(0, 100)}`);
    }
    
    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error("Received empty video blob");
    }
    return URL.createObjectURL(blob);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create blob URL for moment ${momentId}: ${error.message}`);
    }
    throw error;
  }
}

export function getMomentThumbnailUrl(momentId: string): string {
  return `${getApiBaseUrl()}/moments/${momentId}/thumbnail`;
}


export async function saveMoment(momentId: string): Promise<SavedMomentResponse> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/moments/${momentId}/save`, {
    method: "POST",
    headers: getHeaders(),
  });
  return handleResponse<SavedMomentResponse>(response);
}

export async function unsaveMoment(momentId: string): Promise<{ status: string }> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/moments/${momentId}/save`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse<{ status: string }>(response);
}

export async function triggerLearning(): Promise<{
  status: string;
  calibration_updated: boolean;
  prompt_evaluated: boolean;
  prompt_promoted: boolean;
}> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/admin/learning/run`, {
    method: "POST",
    headers: getHeaders(),
  });
  return handleResponse<{
    status: string;
    calibration_updated: boolean;
    prompt_evaluated: boolean;
    prompt_promoted: boolean;
  }>(response);
}

export async function getAllMoments(): Promise<MomentsResponse> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/moments`, {
    headers: getHeaders(),
  });
  return handleResponse<MomentsResponse>(response);
}

export async function getSavedMoments(): Promise<MomentResponse[]> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/moments/saved`, {
    headers: getHeaders(),
  });
  return handleResponse<MomentResponse[]>(response);
}

export async function deleteAllClips(): Promise<{ status: string; count: number }> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/moments`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse<{ status: string; count: number }>(response);
}

export async function getMomentDetail(momentId: string): Promise<MomentDetailResponse> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/moments/${momentId}`, {
    headers: getHeaders(),
  });
  return handleResponse<MomentDetailResponse>(response);
}

export async function editMoment(
  momentId: string,
  newStart: number,
  newEnd: number
): Promise<MomentResponse> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/moments/${momentId}/edit`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      new_start: newStart,
      new_end: newEnd,
    }),
  });
  return handleResponse<MomentResponse>(response);
}

export async function getProjects(userId?: string | null): Promise<ProjectsResponse> {
  const url = `${getApiBaseUrl()}/projects`;
  console.log("[API] Fetching projects from:", url);
  const response = await fetchWithErrorHandling(url, {
    headers: getHeaders(undefined, userId),
  });
  const data = await handleResponse<ProjectsResponse>(response);
  console.log("[API] Projects response:", { count: data.projects.length, projects: data.projects });
  return data;
}

export async function getProject(videoId: string): Promise<MomentsResponse> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/projects/${videoId}`, {
    headers: getHeaders(),
  });
  return handleResponse<MomentsResponse>(response);
}

export function getVideoPlaybackUrl(videoId: string): string {
  return `${getApiBaseUrl()}/videos/${videoId}/download`;
}

export async function getTranscript(videoId: string): Promise<TranscriptResponse> {
  const url = `${getApiBaseUrl()}/videos/${videoId}/transcript`;
  console.log(`[API] Fetching transcript from: ${url}`);
  const response = await fetchWithErrorHandling(url, {
    headers: getHeaders(),
  });
  const data = await handleResponse<TranscriptResponse>(response);
  console.log(`[API] Transcript response:`, { count: data.segments.length });
  return data;
}

export async function getSegments(videoId: string, label?: string): Promise<SegmentsResponse> {
  const url = label 
    ? `${getApiBaseUrl()}/videos/${videoId}/segments?label=${label}`
    : `${getApiBaseUrl()}/videos/${videoId}/segments`;
  console.log(`[API] Fetching segments from: ${url}`);
  const response = await fetchWithErrorHandling(url, {
    headers: getHeaders(),
  });
  const data = await handleResponse<SegmentsResponse>(response);
  console.log(`[API] Segments response:`, { count: data.segments.length, label });
  return data;
}

export async function storePendingCuts(
  videoId: string,
  segments: Array<{ start_time: number; end_time: number }>
): Promise<{ status: string; video_id: string; pending_cuts: Array<{ start_time: number; end_time: number }>; total_pending: number }> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/videos/${videoId}/cut`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      segments_to_remove: segments.map(seg => ({
        start_time: seg.start_time,
        end_time: seg.end_time,
      })),
    }),
  });
  return handleResponse<{ status: string; video_id: string; pending_cuts: Array<{ start_time: number; end_time: number }>; total_pending: number }>(response);
}

export async function getPendingCuts(
  videoId: string
): Promise<{ status: string; video_id: string; pending_cuts: Array<{ start_time: number; end_time: number }>; total_pending: number }> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/videos/${videoId}/cut`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse<{ status: string; video_id: string; pending_cuts: Array<{ start_time: number; end_time: number }>; total_pending: number }>(response);
}

export async function clearPendingCuts(
  videoId: string
): Promise<{ status: string; video_id: string; message: string }> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/videos/${videoId}/cut`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse<{ status: string; video_id: string; message: string }>(response);
}

export async function saveVideoCuts(
  videoId: string
): Promise<{ status: string; video_id: string; storage_path: string; segments_removed: number; message: string }> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/videos/${videoId}/cut/save`, {
    method: "POST",
    headers: getHeaders(),
  });
  return handleResponse<{ status: string; video_id: string; storage_path: string; segments_removed: number; message: string }>(response);
}

export type ExportFormat = "mp4" | "mov_prores422" | "mov_prores4444" | "webm" | "xml" | "edl" | "aaf";

export async function exportVideo(
  videoId: string,
  format: ExportFormat,
  segmentsToRemove?: Array<{ start_time: number; end_time: number }>
): Promise<Blob> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/videos/${videoId}/export`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      format,
      segments_to_remove: segmentsToRemove,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Export failed" }));
    throw new Error(error.detail || "Export failed");
  }

  return response.blob();
}

export async function exportHighlight(
  videoId: string,
  start: number,
  end: number,
  aspectRatio: "9:16" | "1:1" | "16:9"
): Promise<Blob> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/videos/${videoId}/highlights/export`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_time: start,
      end_time: end,
      aspect_ratio: aspectRatio,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Export failed" }));
    throw new Error(error.detail || "Export failed");
  }

  return response.blob();
}

export async function reprocessVideo(
  videoId: string
): Promise<{ status: string; video_id: string; message: string }> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/videos/${videoId}/reprocess`, {
    method: "POST",
    headers: getHeaders(),
  });
  return handleResponse<{ status: string; video_id: string; message: string }>(response);
}

export async function submitSegmentFeedback(
  videoId: string,
  segmentId: string | null,
  feedbackType: "GREAT" | "FINE" | "WRONG",
  startTime?: number,
  endTime?: number
): Promise<{ id: string; video_segment_id: string; feedback_type: string; created_at: string }> {
  // Use "lookup" if no segment ID, otherwise use the provided ID
  const idOrLookup = segmentId || "lookup";
  const body: { feedback_type: string; start_time?: number; end_time?: number } = {
    feedback_type: feedbackType,
  };
  
  // Include time range if using lookup
  if (!segmentId && startTime !== undefined && endTime !== undefined) {
    body.start_time = startTime;
    body.end_time = endTime;
  }
  
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/videos/${videoId}/segments/${idOrLookup}/feedback`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  return handleResponse<{ id: string; video_segment_id: string; feedback_type: string; created_at: string }>(response);
}

export async function saveTimeline(
  videoId: string,
  state: {
    projectName?: string;
    markers?: Array<{ id: string; time: number; label?: string }>;
    selections?: string[];
    sequences?: any[];
    currentTime?: number;
    inPoint?: number;
    outPoint?: number;
    zoom?: number;
    viewPreferences?: {
      snapEnabled?: boolean;
      loopPlayback?: boolean;
    };
  },
  userId?: string | null
): Promise<{ status: string; video_id: string; timeline_id: string }> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/timelines/${videoId}`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
    }, userId),
    body: JSON.stringify(state),
  });
  return handleResponse<{ status: string; video_id: string; timeline_id: string }>(response);
}

export async function getTimeline(videoId: string): Promise<{
  video_id: string;
  project_name: string | null;
  markers: Array<{ id: string; time: number; label?: string }>;
  selections: string[];
  sequences: any[];
  current_time: number;
  in_point: number | null;
  out_point: number | null;
  zoom: number;
  view_preferences: {
    snapEnabled: boolean;
    loopPlayback: boolean;
  };
}> {
  const response = await fetchWithErrorHandling(`${getApiBaseUrl()}/timelines/${videoId}`, {
    headers: getHeaders(),
  });
  return handleResponse<{
    video_id: string;
    project_name: string | null;
    markers: Array<{ id: string; time: number; label?: string }>;
    selections: string[];
    sequences: any[];
    current_time: number;
    in_point: number | null;
    out_point: number | null;
    zoom: number;
    view_preferences: {
      snapEnabled: boolean;
      loopPlayback: boolean;
    };
  }>(response);
}

