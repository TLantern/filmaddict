"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  getProject,
  getMomentDownloadUrl,
  getMomentPlaybackUrl,
  getMomentPlaybackBlobUrl,
  getMomentThumbnailUrl,
  saveMoment,
  unsaveMoment,
} from "../../../lib/api";
import { MomentResponse } from "../../../lib/types";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;
  
  const [clips, setClips] = useState<MomentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedClips, setSavedClips] = useState<Record<string, boolean>>({});
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<string, boolean>>({});
  const [thumbnailLoading, setThumbnailLoading] = useState<Record<string, boolean>>({});
  const [clipVideoUrls, setClipVideoUrls] = useState<Record<string, string>>({});
  const [clipVideoErrors, setClipVideoErrors] = useState<Record<string, boolean>>({});
  const [blobUrlsLoading, setBlobUrlsLoading] = useState(false);

  const isUsingNgrok = typeof window !== "undefined" && 
    (process.env.NEXT_PUBLIC_API_URL?.includes("ngrok") || 
     window.location.hostname.includes("ngrok"));

  useEffect(() => {
    if (videoId) {
      loadProject();
    }
  }, [videoId]);

  // Load blob URLs for ngrok to avoid browser warning and CORS issues
  useEffect(() => {
    if (!isUsingNgrok || clips.length === 0) return;
    
    const loadBlobUrls = async () => {
      setBlobUrlsLoading(true);
      const newUrls: Record<string, string> = {};
      
      for (const clip of clips) {
        if (!clipVideoUrls[clip.id]) {
          try {
            const blobUrl = await getMomentPlaybackBlobUrl(clip.id);
            newUrls[clip.id] = blobUrl;
          } catch (err) {
            console.error(`Failed to load blob URL for clip ${clip.id}:`, err);
            setClipVideoErrors(prev => ({ ...prev, [clip.id]: true }));
          }
        }
      }
      
      if (Object.keys(newUrls).length > 0) {
        setClipVideoUrls(prev => ({ ...prev, ...newUrls }));
      }
      setBlobUrlsLoading(false);
    };
    
    loadBlobUrls();
  }, [clips, isUsingNgrok]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(clipVideoUrls).forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [clipVideoUrls]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProject(videoId);
      setClips(data.moments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClip = async (clipId: string) => {
    try {
      if (savedClips[clipId]) {
        await unsaveMoment(clipId);
        setSavedClips({ ...savedClips, [clipId]: false });
      } else {
        await saveMoment(clipId);
        setSavedClips({ ...savedClips, [clipId]: true });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save clip");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 px-4 py-8 dark:bg-black">
      <main className="w-full max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-black dark:text-zinc-50">Project</h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              {clips.length} clip{clips.length !== 1 ? "s" : ""} in this project
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Home
            </Link>
            <Link
              href="/moments"
              className="rounded-full bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              Videos
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-foreground"></div>
          </div>
        ) : clips.length === 0 ? (
          <div className="rounded-lg border border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">No clips found in this project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="group rounded-lg border border-zinc-300 bg-white overflow-hidden transition-shadow hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="relative aspect-video bg-black">
                  {!thumbnailErrors[clip.id] ? (
                    <>
                      {thumbnailLoading[clip.id] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-purple-500"></div>
                        </div>
                      )}
                      <img
                        src={getMomentThumbnailUrl(clip.id)}
                        alt="Clip thumbnail"
                        className="h-full w-full object-cover"
                        onLoad={() => {
                          setThumbnailLoading({ ...thumbnailLoading, [clip.id]: false });
                        }}
                        onLoadStart={() => {
                          setThumbnailLoading({ ...thumbnailLoading, [clip.id]: true });
                        }}
                        onError={() => {
                          setThumbnailLoading({ ...thumbnailLoading, [clip.id]: false });
                          setThumbnailErrors({ ...thumbnailErrors, [clip.id]: true });
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                        <video
                          key={clipVideoUrls[clip.id] || clip.id}
                          src={clipVideoUrls[clip.id] || getMomentPlaybackUrl(clip.id)}
                          className="h-full w-full object-contain pointer-events-auto"
                          preload={isUsingNgrok && !clipVideoUrls[clip.id] ? "none" : "metadata"}
                          muted
                          crossOrigin="anonymous"
                          onMouseEnter={(e) => {
                            const video = e.currentTarget;
                            video.play().catch(() => {});
                          }}
                          onMouseLeave={(e) => {
                            const video = e.currentTarget;
                            video.pause();
                            video.currentTime = 0;
                          }}
                          onError={(e) => {
                            const video = e.currentTarget;
                            const error = video.error;
                            console.error(`Video hover preview error for clip ${clip.id}:`, {
                              code: error?.code,
                              message: error?.message,
                              networkState: video.networkState,
                              readyState: video.readyState,
                              src: video.src.substring(0, 100),
                              usingBlob: video.src.startsWith("blob:"),
                            });
                          }}
                        />
                      </div>
                    </>
                  ) : clipVideoErrors[clip.id] && !clipVideoUrls[clip.id] ? (
                    <div className="w-full aspect-video flex items-center justify-center bg-zinc-800 text-zinc-400">
                      <div className="text-center">
                        <p className="text-sm">Failed to load video</p>
                        <p className="text-xs mt-1">Try refreshing the page</p>
                      </div>
                    </div>
                  ) : isUsingNgrok && !clipVideoUrls[clip.id] && blobUrlsLoading ? (
                    <div className="w-full aspect-video flex items-center justify-center bg-zinc-800 text-zinc-400">
                      <div className="text-center">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-purple-500 mx-auto mb-3"></div>
                        <p className="text-sm">Loading video...</p>
                      </div>
                    </div>
                  ) : (
                    <video
                      key={clipVideoUrls[clip.id] || clip.id}
                      src={clipVideoUrls[clip.id] || getMomentPlaybackUrl(clip.id)}
                      className="h-full w-full object-contain"
                      preload={isUsingNgrok && !clipVideoUrls[clip.id] ? "none" : "metadata"}
                      playsInline
                      controls
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const video = e.currentTarget;
                        const error = video.error;
                        const errorInfo = {
                          code: error?.code,
                          message: error?.message,
                          networkState: video.networkState,
                          readyState: video.readyState,
                          src: video.src.substring(0, 100),
                          usingBlob: video.src.startsWith("blob:"),
                        };
                        console.error(`Video load error for clip ${clip.id}:`, errorInfo);
                        setClipVideoErrors((prev) => ({ ...prev, [clip.id]: true }));
                        
                        // Try to reload with blob URL if not already using one
                        if (!video.src.startsWith("blob:") && isUsingNgrok && !clipVideoUrls[clip.id]) {
                          getMomentPlaybackBlobUrl(clip.id)
                            .then((blobUrl) => {
                              setClipVideoUrls((prev) => ({ ...prev, [clip.id]: blobUrl }));
                              setClipVideoErrors((prev => {
                                const updated = { ...prev };
                                delete updated[clip.id];
                                return updated;
                              }));
                            })
                            .catch((err) => {
                              console.error(`Failed to load blob URL for clip ${clip.id}:`, err);
                            });
                        }
                      }}
                    />
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {formatTime(clip.start)} - {formatTime(clip.end)}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={getMomentDownloadUrl(clip.id)}
                      download
                      className="flex-1 rounded-full bg-foreground px-4 py-2 text-center text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => handleSaveClip(clip.id)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        savedClips[clip.id]
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                      }`}
                    >
                      {savedClips[clip.id] ? "✓ Saved" : "Save"}
                    </button>
                    <button
                      onClick={() => router.push(`/edit-clip/${clip.id}`)}
                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

