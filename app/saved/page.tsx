"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getSavedClips,
  getClipDownloadUrl,
  getClipPlaybackUrl,
  getClipThumbnailUrl,
  unsaveClip,
} from "../../lib/api";
import { ClipResponse } from "../../lib/types";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function SavedPage() {
  const router = useRouter();
  const [clips, setClips] = useState<ClipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<string, boolean>>({});
  const [thumbnailLoading, setThumbnailLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSavedClips();
  }, []);

  const loadSavedClips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSavedClips();
      setClips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved clips");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsaveClip = async (clipId: string) => {
    try {
      await unsaveClip(clipId);
      setClips(clips.filter((clip) => clip.id !== clipId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unsave clip");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 px-4 py-8 dark:bg-black">
      <main className="w-full max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-black dark:text-zinc-50">Saved Clips</h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              Your favorite clips
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
              href="/clips"
              className="rounded-full bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              All Clips
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
            <p className="text-zinc-600 dark:text-zinc-400">
              No saved clips yet. Save clips from the home page or clips page!
            </p>
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
                        src={getClipThumbnailUrl(clip.id)}
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
                          src={getClipPlaybackUrl(clip.id)}
                          className="h-full w-full object-contain pointer-events-auto"
                          preload="metadata"
                          muted
                          onMouseEnter={(e) => {
                            const video = e.currentTarget;
                            video.play().catch(() => {});
                          }}
                          onMouseLeave={(e) => {
                            const video = e.currentTarget;
                            video.pause();
                            video.currentTime = 0;
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <video
                      src={getClipPlaybackUrl(clip.id)}
                      className="h-full w-full object-contain"
                      preload="metadata"
                      playsInline
                      controls
                      onError={(e) => {
                        const video = e.currentTarget;
                        const error = video.error;
                        console.error(`Video load error for clip ${clip.id}:`, {
                          code: error?.code,
                          message: error?.message,
                          networkState: video.networkState,
                          readyState: video.readyState,
                          src: video.src.substring(0, 100),
                        });
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
                      href={getClipDownloadUrl(clip.id)}
                      download
                      className="flex-1 rounded-full bg-foreground px-4 py-2 text-center text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => handleUnsaveClip(clip.id)}
                      className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                    >
                      Unsave
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

