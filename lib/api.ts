import {
  UploadResponse,
  VideoStatusResponse,
  HighlightsResponse,
  ClipsResponse,
  ClipFeedbackRequest,
  ClipFeedbackResponse,
  SavedClipResponse,
} from "./types";

const API_BASE_URL = "http://localhost:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function uploadVideo(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/videos/upload`, {
    method: "POST",
    body: formData,
  });

  return handleResponse<UploadResponse>(response);
}

export async function uploadYouTubeVideo(youtubeUrl: string): Promise<UploadResponse> {
  const response = await fetch(`${API_BASE_URL}/videos/youtube`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ youtube_url: youtubeUrl }),
  });

  return handleResponse<UploadResponse>(response);
}

export async function getVideoStatus(videoId: string): Promise<VideoStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/status`);
  return handleResponse<VideoStatusResponse>(response);
}

export async function getHighlights(videoId: string): Promise<HighlightsResponse> {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/highlights`);
  return handleResponse<HighlightsResponse>(response);
}

export async function getClips(videoId: string): Promise<ClipsResponse> {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/clips`);
  return handleResponse<ClipsResponse>(response);
}

export function getClipDownloadUrl(clipId: string): string {
  return `${API_BASE_URL}/clips/${clipId}/download`;
}

export function getClipPlaybackUrl(clipId: string): string {
  return `${API_BASE_URL}/clips/${clipId}/download`;
}

export function getClipThumbnailUrl(clipId: string): string {
  return `${API_BASE_URL}/clips/${clipId}/thumbnail`;
}

export async function submitClipFeedback(
  clipId: string,
  rating: number,
  textFeedback?: string
): Promise<ClipFeedbackResponse> {
  const response = await fetch(`${API_BASE_URL}/clips/${clipId}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rating,
      text_feedback: textFeedback,
    }),
  });
  return handleResponse<ClipFeedbackResponse>(response);
}

export async function saveClip(clipId: string): Promise<SavedClipResponse> {
  const response = await fetch(`${API_BASE_URL}/clips/${clipId}/save`, {
    method: "POST",
  });
  return handleResponse<SavedClipResponse>(response);
}

export async function unsaveClip(clipId: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/clips/${clipId}/save`, {
    method: "DELETE",
  });
  return handleResponse<{ status: string }>(response);
}

export async function triggerLearning(): Promise<{
  status: string;
  calibration_updated: boolean;
  prompt_evaluated: boolean;
  prompt_promoted: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/admin/learning/run`, {
    method: "POST",
  });
  return handleResponse<{
    status: string;
    calibration_updated: boolean;
    prompt_evaluated: boolean;
    prompt_promoted: boolean;
  }>(response);
}

