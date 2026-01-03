"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, Youtube, Loader2, Sparkles, Zap, Video, Brain, Scissors } from "lucide-react";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { Button } from "@/components/ui/button-1";
import CleanupButton from "@/components/ui/cleanup-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Navbar } from "@/components/ui/mini-navbar";
import { uploadVideo, uploadYouTubeVideo, getProjects, getMoments, getMomentThumbnailUrl } from "@/lib/api";
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
      const projectsData = await getProjects(null);
      setProjects(projectsData.projects);

      for (const project of projectsData.projects) {
        if (project.moment_count > 0) {
          try {
            const clips = await getMoments(project.video_id);
            if (clips.moments.length > 0) {
              const thumbnailUrl = getMomentThumbnailUrl(clips.moments[0].id);
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
    router.push(`/timeline/${videoId}`);
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
      const uploadStartTime = Date.now();
      
      console.log('[Video Upload] Starting upload (landing page):', {
        method: uploadMethod,
        fileName: uploadMethod === "file" ? selectedFile?.name : undefined,
        fileSize: uploadMethod === "file" ? selectedFile?.size : undefined,
        youtubeUrl: uploadMethod === "youtube" ? youtubeUrl : undefined,
        timestamp: new Date().toISOString(),
      });
      
      if (uploadMethod === "file" && selectedFile) {
        response = await uploadVideo(selectedFile, undefined, null);
      } else if (uploadMethod === "youtube" && youtubeUrl) {
        response = await uploadYouTubeVideo(youtubeUrl, undefined, null);
      } else {
        throw new Error("Please select a file or enter a YouTube URL");
      }

      console.log('[Video Upload] Upload successful (landing page):', {
        videoId: response.video_id,
        uploadMethod,
        uploadDuration: Date.now() - uploadStartTime,
        timestamp: new Date().toISOString(),
      });

      // Wait for processing to complete before redirecting
      const { getVideoStatus } = await import("@/lib/api");
      const { VideoStatus } = await import("@/lib/types");
      
      const pollStatus = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
          const maxAttempts = 300; // 5 minutes max (2 second intervals)
          let attempts = 0;
          const statusHistory: Array<{ status: string; timestamp: number; duration?: number | null }> = [];
          let lastStatus: string | null = null;
          
          const checkStatus = async () => {
            try {
              attempts++;
              const statusData = await getVideoStatus(response.video_id);
              
              // Track status transitions
              if (statusData.status !== lastStatus) {
                statusHistory.push({
                  status: statusData.status,
                  timestamp: Date.now(),
                  duration: statusData.duration,
                });
                lastStatus = statusData.status;
                console.log(`[Video Processing] Status transition (landing page): ${statusData.status}`, {
                  videoId: response.video_id,
                  attempt: attempts,
                  elapsedTime: Date.now() - uploadStartTime,
                  duration: statusData.duration,
                });
              }
              
              if (statusData.status === VideoStatus.DONE) {
                console.log('[Video Processing] Processing completed successfully (landing page):', {
                  videoId: response.video_id,
                  totalAttempts: attempts,
                  totalTime: Date.now() - uploadStartTime,
                  duration: statusData.duration,
                  statusHistory: statusHistory.map(s => `${s.status}@${new Date(s.timestamp).toISOString()}`),
                  timestamp: new Date().toISOString(),
                });
                resolve();
              } else if (statusData.status === VideoStatus.FAILED) {
                // Analyze why it failed
                const timeToFailure = Date.now() - uploadStartTime;
                const lastSuccessfulStatus = statusHistory.length > 1 ? statusHistory[statusHistory.length - 2] : null;
                const failureAnalysis = {
                  failedAtStage: lastStatus || 'UNKNOWN',
                  lastSuccessfulStage: lastSuccessfulStatus?.status || 'UPLOADED',
                  timeInLastStage: lastSuccessfulStatus ? Date.now() - lastSuccessfulStatus.timestamp : null,
                  totalProcessingTime: timeToFailure,
                  statusProgression: statusHistory.map(s => s.status).join(' -> '),
                  possibleReasons: [] as string[],
                };
                
                // Analyze possible reasons
                if (lastStatus === VideoStatus.UPLOADED || lastStatus === VideoStatus.QUEUED) {
                  failureAnalysis.possibleReasons.push('Failed during upload/queuing - check file format, size, or server resources');
                } else if (lastStatus === VideoStatus.PROCESSING) {
                  failureAnalysis.possibleReasons.push('Failed during initial processing - check video codec compatibility');
                } else if (lastStatus === VideoStatus.TRANSCRIBED) {
                  failureAnalysis.possibleReasons.push('Failed after transcription - check audio quality or transcription service');
                } else if (lastStatus === VideoStatus.HIGHLIGHTS_FOUND) {
                  failureAnalysis.possibleReasons.push('Failed after highlights detection - check analysis pipeline');
                }
                
                if (timeToFailure < 10000) {
                  failureAnalysis.possibleReasons.push('Failed very quickly (<10s) - likely file format or upload issue');
                } else if (timeToFailure > 600000) {
                  failureAnalysis.possibleReasons.push('Failed after long processing (>10min) - possible timeout or resource exhaustion');
                }
                
                if (!statusData.duration) {
                  failureAnalysis.possibleReasons.push('No duration extracted - video file may be corrupted or unsupported format');
                }
                
                console.error('[Video Processing] Processing failed - detailed analysis (landing page):', {
                  videoId: response.video_id,
                  uploadMethod,
                  status: statusData.status,
                  duration: statusData.duration,
                  createdAt: statusData.created_at,
                  errorMessage: statusData.error_message || 'No error message from backend',
                  totalAttempts: attempts,
                  totalTime: timeToFailure,
                  statusData: JSON.stringify(statusData, null, 2),
                  failureAnalysis,
                  statusHistory: statusHistory.map(s => ({
                    status: s.status,
                    timestamp: new Date(s.timestamp).toISOString(),
                    duration: s.duration,
                  })),
                  timestamp: new Date().toISOString(),
                });
                reject(new Error("Video processing failed"));
              } else if (attempts >= maxAttempts) {
                console.warn('[Video Processing] Timeout reached (landing page):', {
                  videoId: response.video_id,
                  uploadMethod,
                  maxAttempts,
                  totalTime: Date.now() - uploadStartTime,
                  timestamp: new Date().toISOString(),
                });
                reject(new Error("Processing timeout - video is still processing"));
              } else {
                // Check again in 2 seconds
                setTimeout(checkStatus, 2000);
              }
            } catch (err) {
              console.warn(`[Video Processing] Status check failed (landing page, attempt ${attempts}/${maxAttempts}):`, {
                videoId: response.video_id,
                attempt: attempts,
                error: err instanceof Error ? err.message : String(err),
                errorStack: err instanceof Error ? err.stack : undefined,
                timestamp: new Date().toISOString(),
              });
              if (attempts >= maxAttempts) {
                console.error('[Video Processing] Max attempts reached (landing page):', {
                  videoId: response.video_id,
                  uploadMethod,
                  totalAttempts: attempts,
                  totalTime: Date.now() - uploadStartTime,
                  lastError: err instanceof Error ? err.message : String(err),
                  timestamp: new Date().toISOString(),
                });
                reject(err);
              } else {
                // Retry on error
                setTimeout(checkStatus, 2000);
              }
            }
          };
          
          // Start checking after 2 seconds
          setTimeout(checkStatus, 2000);
        });
      };

      // Show loading message while waiting
      setError("Processing video... This may take a few minutes.");
      
      await pollStatus();
      
      // Redirect once processing is complete
      router.push(`/?video_id=${response.video_id}`);
    } catch (err) {
      console.error('[Video Upload] Upload failed (landing page):', {
        uploadMethod,
        fileName: uploadMethod === "file" ? selectedFile?.name : undefined,
        youtubeUrl: uploadMethod === "youtube" ? youtubeUrl : undefined,
        error: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <HeroGeometric
        badge="YKlipp"
        title1="Cut long-form editing"
        title2="time by 50%"
        subtitle="For long-form videos before you open Premiere or Adobe"
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
                    : "Drop your video here"}
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
                    placeholder="Drop your YouTube URL here"
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-indigo-400"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <CleanupButton
                type="submit"
                disabled={loading || (!selectedFile && !youtubeUrl)}
                loading={loading}
                active={!!(selectedFile || youtubeUrl)}
              />
            </form>
          </CardContent>
        </Card>

        <div className="w-full max-w-6xl mx-auto mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Identify Your Best Moments
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-rose-300"> Before You Edit</span>
            </h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              Enable long-form creators and editors to identify the most valuable moments, structure, and cut points in a video before editing begins, so time is spent editing, not scrubbing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-indigo-400/50 transition-all">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20 mb-4">
                  <Brain className="h-6 w-6 text-indigo-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Analysis</h3>
                <p className="text-white/60 text-sm">
                  Advanced AI identifies the most engaging, emotionally intense, and information-dense moments in your videos.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-indigo-400/50 transition-all">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/20 mb-4">
                  <Video className="h-6 w-6 text-rose-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Auto Transcription</h3>
                <p className="text-white/60 text-sm">
                  Automatically transcribe your videos with precise timestamps for every spoken word and segment.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-indigo-400/50 transition-all">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-500/20 mb-4">
                  <Scissors className="h-6 w-6 text-violet-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Identified Cut Points</h3>
                <p className="text-white/60 text-sm">
                  Get precise timestamps and markers for the best moments to cut and edit in your NLE.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-indigo-400/50 transition-all">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/20 mb-4">
                  <Zap className="h-6 w-6 text-cyan-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
                <p className="text-white/60 text-sm">
                  Process videos quickly with our optimized pipeline that handles transcription and analysis in parallel.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500/20 to-rose-500/20">
                    <Sparkles className="h-6 w-6 text-indigo-300" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-3">How It Works</h3>
                  <div className="space-y-4 text-white/70">
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 text-sm font-semibold flex items-center justify-center">1</span>
                      <p><span className="font-semibold text-white">Upload</span> your video file or paste a YouTube URL. We support all major video formats including MP4, MOV, and MKV.</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 text-sm font-semibold flex items-center justify-center">2</span>
                      <p><span className="font-semibold text-white">Transcribe</span> audio is automatically extracted and transcribed with precise timestamps using advanced speech recognition.</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 text-sm font-semibold flex items-center justify-center">3</span>
                      <p><span className="font-semibold text-white">Analyze</span> AI reviews your transcript to identify the top 5-10 most engaging moments based on emotional intensity, information density, and engagement potential.</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 text-sm font-semibold flex items-center justify-center">4</span>
                      <p><span className="font-semibold text-white">Edit</span> take the identified timestamps and cut points into Premiere, Final Cut, or your preferred NLE to start editing the best parts immediately.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full max-w-4xl mx-auto">
          <h2 className="mb-6 text-3xl font-bold text-white">Your Videos</h2>
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
                        <div>{project.moment_count} moment{project.moment_count !== 1 ? "s" : ""}</div>
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

