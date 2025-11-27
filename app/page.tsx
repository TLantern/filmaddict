"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, Youtube, Loader2 } from "lucide-react";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { Button } from "@/components/ui/button-1";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Navbar } from "@/components/ui/mini-navbar";
import { uploadVideo, uploadYouTubeVideo, getProjects, getClips, getClipThumbnailUrl } from "@/lib/api";
import { ProjectResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function LandingPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"file" | "youtube" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectThumbnails, setProjectThumbnails] = useState<Record<string, string | null>>({});

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      const projectsData = await getProjects();
      setProjects(projectsData.projects);

      for (const project of projectsData.projects) {
        if (project.clip_count > 0) {
          try {
            const clips = await getClips(project.video_id);
            if (clips.clips.length > 0) {
              const thumbnailUrl = getClipThumbnailUrl(clips.clips[0].id);
              setProjectThumbnails((prev) => ({
                ...prev,
                [project.video_id]: thumbnailUrl,
              }));
            }
          } catch (err) {
            setProjectThumbnails((prev) => ({
              ...prev,
              [project.video_id]: null,
            }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleProjectClick = (videoId: string) => {
    router.push(`/projects/${videoId}`);
  };

  const handleFileSelect = useCallback((file: File) => {
    if (file.type.startsWith("video/")) {
      setSelectedFile(file);
      setUploadMethod("file");
      setError(null);
    } else {
      setError("Please select a valid video file");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      if (uploadMethod === "file" && selectedFile) {
        response = await uploadVideo(selectedFile);
      } else if (uploadMethod === "youtube" && youtubeUrl) {
        response = await uploadYouTubeVideo(youtubeUrl);
      } else {
        throw new Error("Please select a file or enter a YouTube URL");
      }

      router.push(`/process?video_id=${response.video_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <HeroGeometric
        badge="FilmAddict"
        title1="Best Moments"
        title2="Auto-Extracted"
      >
        <Card className="bg-white/5 backdrop-blur-md border-white/10 mb-12">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
                  isDragging
                    ? "border-indigo-400 bg-indigo-500/10"
                    : "border-white/20 hover:border-white/40",
                  selectedFile && "border-indigo-400 bg-indigo-500/10"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Upload className="h-12 w-12 mx-auto mb-4 text-white/60" />
                <p className="text-white/80 text-lg font-medium mb-2">
                  {selectedFile
                    ? selectedFile.name
                    : "Drop your video here or click to browse"}
                </p>
                <p className="text-white/50 text-sm">
                  Supports MP4, MOV, MKV and other video formats
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-transparent px-2 text-white/50">OR</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                  <Input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => {
                      setYoutubeUrl(e.target.value);
                      setUploadMethod("youtube");
                      setError(null);
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-indigo-400"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading || (!selectedFile && !youtubeUrl)}
                className="w-full bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white border-0 h-12 text-lg font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Get Started"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="w-full max-w-4xl mx-auto">
          <h2 className="mb-6 text-3xl font-bold text-white">Your Projects</h2>
          {projectsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const thumbnailUrl = projectThumbnails[project.video_id];
                return (
                  <Card
                    key={project.video_id}
                    className="overflow-hidden border-2 border-white/10 hover:border-white/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 hover:scale-[1.02] cursor-pointer bg-white/5 backdrop-blur-md"
                    onClick={() => handleProjectClick(project.video_id)}
                  >
                    <div className="w-full aspect-video bg-zinc-800 overflow-hidden relative">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={`Project ${project.video_id}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                          No thumbnail
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-2 text-lg font-semibold text-white">
                        Project
                      </div>
                      <div className="space-y-1 text-sm text-white/60">
                        <div className="font-mono text-xs truncate">
                          {project.video_id}
                        </div>
                        <div>{project.clip_count} clip{project.clip_count !== 1 ? "s" : ""}</div>
                        {project.duration && (
                          <div>Duration: {formatTime(project.duration)}</div>
                        )}
                        <div className="text-xs">
                          Created: {new Date(project.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-2 border-white/10 bg-white/5 backdrop-blur-md">
              <CardContent className="p-8 text-center">
                <p className="text-white/80">
                  No projects yet. Upload and process a video above to get started!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </HeroGeometric>
    </>
  );
}

