"use client";

import { useState, useEffect } from "react";
import {
  uploadVideo,
  uploadYouTubeVideo,
  getVideoStatus,
  getHighlights,
  getClips,
  getClipDownloadUrl,
  getClipPlaybackUrl,
  getClipThumbnailUrl,
  submitClipFeedback,
  saveClip,
  unsaveClip,
  triggerLearning,
} from "../lib/api";
import {
  VideoStatus,
  Highlight,
  ClipResponse,
  VideoStatusResponse,
} from "../lib/types";
import { Slider } from "@/components/ui/slider-number-flow";

type UploadMethod = "file" | "youtube" | null;

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getStatusMessage(status: VideoStatus): string {
  const messages: Record<VideoStatus, string> = {
    [VideoStatus.UPLOADED]: "Uploaded",
    [VideoStatus.QUEUED]: "Queued for processing",
    [VideoStatus.PROCESSING]: "Processing video",
    [VideoStatus.TRANSCRIBED]: "Transcribing audio",
    [VideoStatus.HIGHLIGHTS_FOUND]: "Finding best moments",
    [VideoStatus.DONE]: "Complete",
    [VideoStatus.FAILED]: "Processing failed",
  };
  return messages[status] || "Unknown status";
}

export default function Home() {
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<VideoStatusResponse | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [clips, setClips] = useState<ClipResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Clip feedback state
  const [clipRatings, setClipRatings] = useState<Record<string, number>>({});
  const [clipTextFeedback, setClipTextFeedback] = useState<Record<string, string>>({});
  const [savedClips, setSavedClips] = useState<Record<string, boolean>>({});
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<Record<string, boolean>>({});
  const [learningStatus, setLearningStatus] = useState<{
    isLoading: boolean;
    message: string | null;
  }>({ isLoading: false, message: null });

  useEffect(() => {
    if (!videoId) return;

    let intervalId: NodeJS.Timeout | null = null;

    const pollStatus = async () => {
      try {
        const statusData = await getVideoStatus(videoId!);
        setStatus(statusData);

        if (statusData.status === VideoStatus.DONE) {
          const [highlightsData, clipsData] = await Promise.all([
            getHighlights(videoId!),
            getClips(videoId!),
          ]);
          setHighlights(highlightsData.highlights);
          setClips(clipsData.clips);
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        } else if (statusData.status === VideoStatus.FAILED) {
          setError("Video processing failed. Please try again.");
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check status");
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    pollStatus();
    intervalId = setInterval(pollStatus, 4000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [videoId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadMethod("file");
      setError(null);
    }
  };

  const handleYoutubeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeUrl(e.target.value);
    setUploadMethod("youtube");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHighlights([]);
    setClips([]);
    setStatus(null);

    try {
      let response;
      if (uploadMethod === "file" && selectedFile) {
        response = await uploadVideo(selectedFile);
      } else if (uploadMethod === "youtube" && youtubeUrl) {
        response = await uploadYouTubeVideo(youtubeUrl);
      } else {
        throw new Error("Please select a file or enter a YouTube URL");
      }

      setVideoId(response.video_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const getClipForHighlight = (highlight: Highlight): ClipResponse | undefined => {
    return clips.find(
      (clip) => Math.abs(clip.start - highlight.start) < 0.5 && Math.abs(clip.end - highlight.end) < 0.5
    );
  };

  const handleSubmitFeedback = async (clipId: string) => {
    try {
      setFeedbackSubmitting({ ...feedbackSubmitting, [clipId]: true });
      const rating = clipRatings[clipId] || 50;
      const textFeedback = clipTextFeedback[clipId];
      
      await submitClipFeedback(clipId, rating, textFeedback);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setFeedbackSubmitting({ ...feedbackSubmitting, [clipId]: false });
    }
  };

  const handleSaveClip = async (clipId: string) => {
    try {
      if (savedClips[clipId]) {
        await unsaveClip(clipId);
        setSavedClips({ ...savedClips, [clipId]: false });
      } else {
        await saveClip(clipId);
        setSavedClips({ ...savedClips, [clipId]: true });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save clip");
    }
  };

  const handleTriggerLearning = async () => {
    try {
      setLearningStatus({ isLoading: true, message: null });
      setError(null);
      
      const result = await triggerLearning();
      
      const messages = [];
      if (result.calibration_updated) {
        messages.push("Calibration updated");
      }
      if (result.prompt_evaluated) {
        messages.push("Prompts evaluated");
      }
      if (result.prompt_promoted) {
        messages.push("Best prompt version promoted");
      }
      
      if (messages.length > 0) {
        setLearningStatus({
          isLoading: false,
          message: `Learning completed: ${messages.join(", ")}`,
        });
      } else {
        setLearningStatus({
          isLoading: false,
          message: "Learning completed. No updates were needed.",
        });
      }
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setLearningStatus({ isLoading: false, message: null });
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger learning");
      setLearningStatus({ isLoading: false, message: null });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <main className="w-full max-w-4xl">
        <h1 className="mb-8 text-center text-4xl font-bold text-black dark:text-zinc-50">
          FilmAddict
        </h1>
        <p className="mb-12 text-center text-lg text-zinc-600 dark:text-zinc-400">
          Extract the best moments from your videos automatically
        </p>

        {!videoId && (
          <form onSubmit={handleSubmit} className="mb-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="file-upload"
                  className="mb-2 block text-sm font-medium text-black dark:text-zinc-50"
                  suppressHydrationWarning
                >
                  Upload Video File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background hover:file:bg-[#383838] dark:file:hover:bg-[#ccc]"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-300 dark:border-zinc-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-zinc-50 px-2 text-zinc-500 dark:bg-black dark:text-zinc-400">
                    OR
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="youtube-url"
                  className="mb-2 block text-sm font-medium text-black dark:text-zinc-50"
                >
                  YouTube URL
                </label>
                <input
                  id="youtube-url"
                  type="url"
                  value={youtubeUrl}
                  onChange={handleYoutubeUrlChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (!selectedFile && !youtubeUrl)}
              className="w-full rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              {loading ? "Uploading..." : "Process Video"}
            </button>
          </form>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {status && (
          <div className="mb-8 rounded-lg border border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Status</h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {getStatusMessage(status.status)}
                </p>
              </div>
              {status.status !== VideoStatus.DONE && status.status !== VideoStatus.FAILED && (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-foreground"></div>
              )}
            </div>
          </div>
        )}

        {highlights.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-zinc-50">Highlights</h2>
            <div className="space-y-6">
              {highlights.map((highlight, index) => {
                const clip = getClipForHighlight(highlight);
                return (
                  <div
                    key={index}
                    className="rounded-lg border border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                          {formatTime(highlight.start)} - {formatTime(highlight.end)}
                        </div>
                        <p className="text-black dark:text-zinc-50">{highlight.reason}</p>
                        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                          Score: {highlight.score.toFixed(1)}/10
                        </div>
                      </div>
                    </div>
                    {clip && (
                      <div className="mt-4 space-y-4">
                        <div className="rounded-lg overflow-hidden bg-black">
                          <video
                            src={getClipPlaybackUrl(clip.id)}
                            controls
                            className="w-full max-w-2xl"
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            {clip.thumbnail_url && (
                              <img
                                src={getClipThumbnailUrl(clip.id)}
                                alt="Clip thumbnail"
                                className="h-16 w-28 rounded object-cover"
                              />
                            )}
                            <div className="flex gap-2">
                              <a
                                href={getClipDownloadUrl(clip.id)}
                                download
                                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                              >
                                Download Clip
                              </a>
                              <button
                                onClick={() => handleSaveClip(clip.id)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                  savedClips[clip.id]
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                                }`}
                              >
                                {savedClips[clip.id] ? "✓ Saved" : "Save Clip"}
                              </button>
                            </div>
                          </div>
                          
                          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                            <h3 className="text-sm font-medium text-black dark:text-zinc-50 mb-3">
                              Rate this clip
                            </h3>
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                  Rating:
                                </span>
                                <Slider
                                  value={[clipRatings[clip.id] || 50]}
                                  onValueChange={(value) =>
                                    setClipRatings({ ...clipRatings, [clip.id]: value[0] })
                                  }
                                  min={0}
                                  max={100}
                                  step={1}
                                  aria-label="Clip rating"
                                />
                              </div>
                              
                              <div>
                                <label
                                  htmlFor={`feedback-${clip.id}`}
                                  className="block text-sm text-zinc-600 dark:text-zinc-400 mb-2"
                                >
                                  Feedback (optional):
                                </label>
                                <textarea
                                  id={`feedback-${clip.id}`}
                                  value={clipTextFeedback[clip.id] || ""}
                                  onChange={(e) =>
                                    setClipTextFeedback({
                                      ...clipTextFeedback,
                                      [clip.id]: e.target.value,
                                    })
                                  }
                                  placeholder="What did you think about this clip?"
                                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                                  rows={3}
                                />
                              </div>
                              
                              <button
                                onClick={() => handleSubmitFeedback(clip.id)}
                                disabled={feedbackSubmitting[clip.id]}
                                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
                              >
                                {feedbackSubmitting[clip.id] ? "Submitting..." : "Submit Feedback"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {highlights.length > 0 && (
          <div className="mt-12 flex flex-col items-center justify-center space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-700">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-2">
                Improve the System
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                After rating clips, click below to trigger the learning system to analyze your feedback and improve clip selection.
              </p>
            </div>
            <button
              onClick={handleTriggerLearning}
              disabled={learningStatus.isLoading}
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {learningStatus.isLoading ? "Learning..." : "Learn from Feedback"}
            </button>
            {learningStatus.message && (
              <div className="mt-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200">
                {learningStatus.message}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
