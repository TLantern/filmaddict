import {
  UploadResponse,
  VideoStatusResponse,
  HighlightsResponse,
  ClipsResponse,
  ClipFeedbackRequest,
  ClipFeedbackResponse,
  SavedClipResponse,
  ClipDetailResponse,
  ClipResponse,
  ProjectsResponse,
} from "./types";

// Use environment variable for API URL
// When using ngrok, set NEXT_PUBLIC_API_URL to your backend ngrok URL
// Example: NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app
if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL environment variable is required");
}
const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL;

// Helper to add ngrok bypass header if using ngrok
function getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };
  
  // Add ngrok-skip-browser-warning header when using ngrok
  if (API_BASE_URL.includes("ngrok")) {
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
      const isNgrok = API_BASE_URL.includes("ngrok");
      const baseUrl = isNgrok ? "ngrok backend" : API_BASE_URL;
      throw new Error(`Network error: Unable to connect to ${baseUrl}. Make sure the backend is running and accessible.`);
    }
    throw error;
  }
}

export async function uploadVideo(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithErrorHandling(`${API_BASE_URL}/videos/upload`, {
    method: "POST",
    headers: getHeaders(),
    body: formData,
  });

  return handleResponse<UploadResponse>(response);
}

export async function uploadYouTubeVideo(youtubeUrl: string): Promise<UploadResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/videos/youtube`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ youtube_url: youtubeUrl }),
  });

  return handleResponse<UploadResponse>(response);
}

export async function getVideoStatus(videoId: string): Promise<VideoStatusResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/videos/${videoId}/status`, {
    headers: getHeaders(),
  });
  return handleResponse<VideoStatusResponse>(response);
}

export async function getHighlights(videoId: string): Promise<HighlightsResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/videos/${videoId}/highlights`, {
    headers: getHeaders(),
  });
  return handleResponse<HighlightsResponse>(response);
}

export async function getClips(videoId: string): Promise<ClipsResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/videos/${videoId}/clips`, {
    headers: getHeaders(),
  });
  return handleResponse<ClipsResponse>(response);
}

export function getClipDownloadUrl(clipId: string): string {
  return `${API_BASE_URL}/clips/${clipId}/download`;
}

export function getClipPlaybackUrl(clipId: string): string {
  return `${API_BASE_URL}/clips/${clipId}/download`;
}

export async function getClipPlaybackUrlDirect(clipId: string): Promise<string> {
  // Fetch the redirect URL to get the actual S3 presigned URL
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/clips/${clipId}/download`, {
    method: "HEAD",
    headers: getHeaders(),
    redirect: "follow",
  });
  
  if (response.redirected && response.url) {
    return response.url;
  }
  
  // Fallback to the original URL if no redirect
  return getClipPlaybackUrl(clipId);
}

export async function getClipPlaybackBlobUrl(clipId: string): Promise<string> {
  // For ngrok, fetch video with headers and create blob URL
  // This bypasses ngrok's browser warning page and CORS issues
  const url = getClipPlaybackUrl(clipId);
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
      throw new Error(`Failed to create blob URL for clip ${clipId}: ${error.message}`);
    }
    throw error;
  }
}

export function getClipThumbnailUrl(clipId: string): string {
  return `${API_BASE_URL}/clips/${clipId}/thumbnail`;
}

export async function submitClipFeedback(
  clipId: string,
  rating: number,
  textFeedback?: string
): Promise<ClipFeedbackResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/clips/${clipId}/feedback`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      rating,
      text_feedback: textFeedback,
    }),
  });
  return handleResponse<ClipFeedbackResponse>(response);
}

export async function saveClip(clipId: string): Promise<SavedClipResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/clips/${clipId}/save`, {
    method: "POST",
    headers: getHeaders(),
  });
  return handleResponse<SavedClipResponse>(response);
}

export async function unsaveClip(clipId: string): Promise<{ status: string }> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/clips/${clipId}/save`, {
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
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/admin/learning/run`, {
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

export async function getAllClips(): Promise<ClipsResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/clips`, {
    headers: getHeaders(),
  });
  return handleResponse<ClipsResponse>(response);
}

export async function getSavedClips(): Promise<ClipResponse[]> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/clips/saved`, {
    headers: getHeaders(),
  });
  return handleResponse<ClipResponse[]>(response);
}

export async function deleteAllClips(): Promise<{ status: string; count: number }> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/clips`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse<{ status: string; count: number }>(response);
}

export async function getClipDetail(clipId: string): Promise<ClipDetailResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/clips/${clipId}`, {
    headers: getHeaders(),
  });
  return handleResponse<ClipDetailResponse>(response);
}

export async function editClip(
  clipId: string,
  newStart: number,
  newEnd: number
): Promise<ClipResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/clips/${clipId}/edit`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      new_start: newStart,
      new_end: newEnd,
    }),
  });
  return handleResponse<ClipResponse>(response);
}

export async function getProjects(): Promise<ProjectsResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects`, {
    headers: getHeaders(),
  });
  return handleResponse<ProjectsResponse>(response);
}

export async function getProject(videoId: string): Promise<ClipsResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects/${videoId}`, {
    headers: getHeaders(),
  });
  return handleResponse<ClipsResponse>(response);
}

