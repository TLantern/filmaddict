"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  uploadVideo,
  uploadYouTubeVideo,
  getVideoStatus,
  getHighlights,
  getMoments,
  getMomentDownloadUrl,
  getMomentPlaybackUrl,
  getMomentThumbnailUrl,
  getMomentPlaybackBlobUrl,
  saveMoment,
  unsaveMoment,
  triggerLearning,
  getProjects,
  getProject,
} from "../../lib/api";
import {
  VideoStatus,
  Highlight,
  MomentResponse,
  VideoStatusResponse,
  ProjectResponse,
} from "../../lib/types";
import { Slider } from "@/components/ui/slider-number-flow";
import { Button } from "@/components/ui/button-1";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home as HomeIcon } from "lucide-react";

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

function ProcessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<VideoStatusResponse | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [clips, setClips] = useState<MomentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [savedClips, setSavedClips] = useState<Record<string, boolean>>({});
  const [learningStatus, setLearningStatus] = useState<{
    isLoading: boolean;
    message: string | null;
  }>({ isLoading: false, message: null });
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectThumbnails, setProjectThumbnails] = useState<Record<string, string | null>>({});
  const [clipVideoUrls, setClipVideoUrls] = useState<Record<string, string>>({});
  const [clipVideoErrors, setClipVideoErrors] = useState<Record<string, boolean>>({});
  const [blobUrlsLoading, setBlobUrlsLoading] = useState(false);
  const clipsPollingStarted = useRef(false);
  const loadedClipIds = useRef<Set<string>>(new Set());
  const statusHistoryRef = useRef<Array<{ status: string; timestamp: number; duration?: number | null }>>([]);
  const lastStatusRef = useRef<string | null>(null);
  const processingStartTimeRef = useRef<number | null>(null);
  
  const isUsingNgrok = typeof window !== "undefined" && 
    (process.env.NEXT_PUBLIC_API_URL?.includes("ngrok") || 
     window.location.hostname.includes("ngrok"));

  useEffect(() => {
    loadProjects();
    const videoIdParam = searchParams.get("video_id");
    if (videoIdParam) {
      setVideoId(videoIdParam);
    }
  }, [searchParams]);

  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      const data = await getProjects(null);
      setProjects(data.projects);
      
      // Fetch thumbnails for each project
      const thumbnailPromises = data.projects.map(async (project) => {
        try {
          const clipsData = await getProject(project.video_id);
          if (clipsData.moments && clipsData.moments.length > 0) {
            const firstClip = clipsData.moments[0];
            // Always try to get thumbnail URL - backend will generate on-demand if needed
            const thumbnailUrl = getMomentThumbnailUrl(firstClip.id);
            return { videoId: project.video_id, thumbnailUrl };
          }
          return { videoId: project.video_id, thumbnailUrl: null };
        } catch (err) {
          console.error(`Failed to fetch clips for project ${project.video_id}:`, err);
          return { videoId: project.video_id, thumbnailUrl: null };
        }
      });
      
      const thumbnailResults = await Promise.all(thumbnailPromises);
      const thumbnailsMap: Record<string, string | null> = {};
      thumbnailResults.forEach(({ videoId, thumbnailUrl }) => {
        thumbnailsMap[videoId] = thumbnailUrl;
      });
      setProjectThumbnails(thumbnailsMap);
    } catch (err) {
      // Silently fail - projects are optional
      // Handle 404 or "Not Found" errors gracefully
      if (err instanceof Error && (err.message.includes("404") || err.message.includes("Not Found"))) {
        // Endpoint might not exist yet or backend not running, set empty projects
        setProjects([]);
      } else {
        console.error("Failed to load projects:", err);
        setProjects([]);
      }
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleProjectClick = async (projectVideoId: string) => {
    try {
      setError(null);
      setVideoId(projectVideoId);
      const [highlightsData, clipsData, statusData] = await Promise.all([
        getHighlights(projectVideoId),
        getMoments(projectVideoId),
        getVideoStatus(projectVideoId),
      ]);
      setHighlights(highlightsData.highlights);
      setClips(clipsData.moments);
      setStatus(statusData);
      // Scroll to highlights section
      setTimeout(() => {
        const highlightsSection = document.querySelector('[data-highlights-section]');
        if (highlightsSection) {
          highlightsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    }
  };

  useEffect(() => {
    if (!videoId) {
      clipsPollingStarted.current = false;
      statusHistoryRef.current = [];
      lastStatusRef.current = null;
      processingStartTimeRef.current = null;
      return;
    }

    // Initialize processing start time when videoId is set
    if (!processingStartTimeRef.current) {
      processingStartTimeRef.current = Date.now();
    }

    let intervalId: NodeJS.Timeout | null = null;
    let clipsIntervalId: NodeJS.Timeout | null = null;

    const pollStatus = async () => {
      try {
        console.log(`[Process] Polling status for video ${videoId}...`);
        const statusData = await getVideoStatus(videoId!);
        
        // Track status transitions
        if (statusData.status !== lastStatusRef.current) {
          statusHistoryRef.current.push({
            status: statusData.status,
            timestamp: Date.now(),
            duration: statusData.duration,
          });
          lastStatusRef.current = statusData.status;
          console.log(`[Process] Status transition: ${statusData.status}`, {
            videoId: videoId,
            elapsedTime: processingStartTimeRef.current ? Date.now() - processingStartTimeRef.current : 0,
            duration: statusData.duration,
          });
        }
        
        console.log(`[Process] Status received:`, {
          video_id: statusData.video_id,
          status: statusData.status,
          duration: statusData.duration,
          created_at: statusData.created_at
        });
        setStatus(statusData);

        if (statusData.status === VideoStatus.DONE) {
          console.log(`[Process] Video ${videoId} is DONE, fetching highlights...`);
          const highlightsData = await getHighlights(videoId!);
          console.log(`[Process] Highlights received:`, {
            count: highlightsData.highlights.length,
            highlights: highlightsData.highlights.map(h => ({ start: h.start, end: h.end, score: h.score }))
          });
          setHighlights(highlightsData.highlights);
          
          // Try to fetch moments (they may not exist if moment generation is disabled)
          try {
            const clipsData = await getMoments(videoId!);
            console.log(`[Process] Clips received:`, {
              count: clipsData.moments.length,
              clips: clipsData.moments.map(c => ({ id: c.id, start: c.start, end: c.end }))
            });
            setClips(clipsData.moments);
          } catch (err) {
            console.log(`[Process] Moments not available (moment generation may be disabled)`);
            setClips([]);
          }
          // Reload projects after a short delay to ensure backend has saved clips
          setTimeout(() => {
            loadProjects();
          }, 1000);
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (clipsIntervalId) {
            clearInterval(clipsIntervalId);
            clipsIntervalId = null;
          }
          clipsPollingStarted.current = false;
          
          // Redirect to timeline editor after a brief delay to ensure data is ready
          setTimeout(() => {
            router.push(`/timeline/${videoId}`);
          }, 500);
        } else if (statusData.status === VideoStatus.FAILED) {
          // Analyze why it failed
          const timeToFailure = processingStartTimeRef.current ? Date.now() - processingStartTimeRef.current : 0;
          const lastSuccessfulStatus = statusHistoryRef.current.length > 1 ? statusHistoryRef.current[statusHistoryRef.current.length - 2] : null;
          const failureAnalysis = {
            failedAtStage: lastStatusRef.current || 'UNKNOWN',
            lastSuccessfulStage: lastSuccessfulStatus?.status || 'UPLOADED',
            timeInLastStage: lastSuccessfulStatus ? Date.now() - lastSuccessfulStatus.timestamp : null,
            totalProcessingTime: timeToFailure,
            statusProgression: statusHistoryRef.current.map(s => s.status).join(' -> '),
            possibleReasons: [] as string[],
          };
          
          // Analyze possible reasons
          if (lastStatusRef.current === VideoStatus.UPLOADED || lastStatusRef.current === VideoStatus.QUEUED) {
            failureAnalysis.possibleReasons.push('Failed during upload/queuing - check file format, size, or server resources');
          } else if (lastStatusRef.current === VideoStatus.PROCESSING) {
            failureAnalysis.possibleReasons.push('Failed during initial processing - check video codec compatibility');
          } else if (lastStatusRef.current === VideoStatus.TRANSCRIBED) {
            failureAnalysis.possibleReasons.push('Failed after transcription - check audio quality or transcription service');
          } else if (lastStatusRef.current === VideoStatus.HIGHLIGHTS_FOUND) {
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
          
          console.error('[Video Processing] Processing failed - detailed analysis (process page):', {
            videoId: videoId,
            status: statusData.status,
            duration: statusData.duration,
            createdAt: statusData.created_at,
            errorMessage: statusData.error_message || 'No error message from backend',
            statusData: JSON.stringify(statusData, null, 2),
            failureAnalysis,
            statusHistory: statusHistoryRef.current.map(s => ({
              status: s.status,
              timestamp: new Date(s.timestamp).toISOString(),
              duration: s.duration,
            })),
            timestamp: new Date().toISOString(),
          });
          setError("Video processing failed. Please try again.");
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (clipsIntervalId) {
            clearInterval(clipsIntervalId);
            clipsIntervalId = null;
          }
          clipsPollingStarted.current = false;
        } else if (statusData.status === VideoStatus.HIGHLIGHTS_FOUND) {
          // Fetch highlights if not already loaded (check current state)
          getHighlights(videoId!).then((highlightsData) => {
            setHighlights((prev) => {
              // Only update if we don't have highlights yet
              if (prev.length === 0) {
                return highlightsData.highlights;
              }
              return prev;
            });
          }).catch((err) => {
            console.error("Failed to fetch highlights:", err);
          });
          
          // Note: Moment generation is currently disabled in the backend
          // Moments are virtual references based on highlights
          // Skip polling for clips since they won't be generated
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check status");
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        if (clipsIntervalId) {
          clearInterval(clipsIntervalId);
          clipsIntervalId = null;
        }
        clipsPollingStarted.current = false;
      }
    };

    pollStatus();
    intervalId = setInterval(pollStatus, 4000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (clipsIntervalId) clearInterval(clipsIntervalId);
      clipsPollingStarted.current = false;
    };
  }, [videoId]);

  useEffect(() => {
    if (!isUsingNgrok || clips.length === 0) return;
    
    const loadBlobUrls = async () => {
      setBlobUrlsLoading(true);
      const newUrls: Record<string, string> = {};
      const errors: Record<string, boolean> = {};
      
      for (const clip of clips) {
        if (!loadedClipIds.current.has(clip.id)) {
          loadedClipIds.current.add(clip.id);
          try {
            const blobUrl = await getMomentPlaybackBlobUrl(clip.id);
            newUrls[clip.id] = blobUrl;
          } catch (err) {
            console.error(`Failed to load blob URL for clip ${clip.id}:`, err);
            errors[clip.id] = true;
            loadedClipIds.current.delete(clip.id);
          }
        }
      }
      
      if (Object.keys(newUrls).length > 0) {
        setClipVideoUrls((prev) => ({ ...prev, ...newUrls }));
      }
      if (Object.keys(errors).length > 0) {
        setClipVideoErrors((prev) => ({ ...prev, ...errors }));
      }
      setBlobUrlsLoading(false);
    };
    
    loadBlobUrls();
  }, [clips, isUsingNgrok]);
  
  useEffect(() => {
    return () => {
      Object.values(clipVideoUrls).forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

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
        response = await uploadVideo(selectedFile, undefined, null);
      } else if (uploadMethod === "youtube" && youtubeUrl) {
        response = await uploadYouTubeVideo(youtubeUrl, undefined, null);
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

  const getClipForHighlight = (highlight: Highlight): MomentResponse | undefined => {
    return clips.find(
      (clip) => Math.abs(clip.start - highlight.start) < 0.5 && Math.abs(clip.end - highlight.end) < 0.5
    );
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black px-4 py-16 overflow-hidden">
      {/* Background Layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,rgba(0,0,0,0)_80%)]" />
      </div>
      {/* Twinkling Stars Background */}
      <StarsBackground
        starDensity={0.00015}
        allStarsTwinkle={true}
        twinkleProbability={0.7}
        minTwinkleSpeed={0.5}
        maxTwinkleSpeed={1}
      />
      {/* Shooting Stars */}
      <ShootingStars
        starColor="#9E00FF"
        trailColor="#2EB9DF"
        minSpeed={15}
        maxSpeed={35}
        minDelay={1000}
        maxDelay={3000}
      />
      <ShootingStars
        starColor="#FF0099"
        trailColor="#FFB800"
        minSpeed={10}
        maxSpeed={25}
        minDelay={2000}
        maxDelay={4000}
      />
      <ShootingStars
        starColor="#00FF9E"
        trailColor="#00B8FF"
        minSpeed={20}
        maxSpeed={40}
        minDelay={1500}
        maxDelay={3500}
      />
      
      <main className="relative z-10 w-full max-w-4xl">
        <div className="mb-8 flex flex-col items-center gap-6">
          <h1 className="text-4xl font-bold text-white text-center">
            YKlipp
          </h1>
          <Breadcrumb>
            <BreadcrumbList className="text-zinc-300">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/yklipp/">
                    <HomeIcon className="size-4" />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <div className="mx-1 rounded-full size-1 bg-zinc-400 dark:bg-zinc-600" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">New Video</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <div className="mx-1 rounded-full size-1 bg-zinc-400 dark:bg-zinc-600" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/moments">Videos</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <div className="mx-1 rounded-full size-1 bg-zinc-400 dark:bg-zinc-600" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/saved">Saved Clips</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {!videoId && (
          <Card className="mb-8 border-2 border-zinc-700 hover:border-zinc-500 transition-all duration-300 bg-zinc-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Upload Video</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="file-upload"
                      className="mb-2 block text-sm font-medium"
                      suppressHydrationWarning
                    >
                      Upload Video File
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background hover:file:bg-[#383838] dark:file:hover:bg-[#ccc]"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-300 dark:border-zinc-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-background px-2 text-muted-foreground">
                        OR
                      </span>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="youtube-url"
                      className="mb-2 block text-sm font-medium"
                    >
                      YouTube URL
                    </label>
                    <Input
                      id="youtube-url"
                      type="url"
                      value={youtubeUrl}
                      onChange={handleYoutubeUrlChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || (!selectedFile && !youtubeUrl)}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Uploading..." : "Process Video"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-900/30 border-red-500 backdrop-blur-sm">
            <AlertDescription className="text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        {videoId && status && (
          (status.status !== VideoStatus.DONE && status.status !== VideoStatus.FAILED) ||
          (status.status === VideoStatus.DONE && highlights.length > 0 && clips.length < highlights.length)
        ) && (
          <Card className="mb-8 border-2 border-zinc-700 bg-zinc-900/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-700 border-t-purple-500"></div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {getStatusMessage(status.status)}
                  </h3>
                  <div className="mb-3 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md inline-block">
                    <p className="text-sm text-yellow-400">
                      ⚠️ Processing may take 5-10 minutes. Please wait...
                    </p>
                  </div>
                  {status.duration && (
                    <p className="text-sm text-zinc-400">
                      Video duration: {formatTime(status.duration)}
                    </p>
                  )}
                  {status.status === VideoStatus.HIGHLIGHTS_FOUND && highlights.length > 0 && (
                    <p className="text-sm text-zinc-300 mt-2">
                      {clips.length > 0 
                        ? `Generating clips... (${clips.length}/${highlights.length} ready)`
                        : `Found ${highlights.length} highlights. Generating clips...`}
                    </p>
                  )}
                  {status.status === VideoStatus.DONE && highlights.length > 0 && clips.length < highlights.length && (
                    <p className="text-sm text-zinc-300 mt-2">
                      Finalizing clips... ({clips.length}/{highlights.length} ready)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {highlights.length > 0 && (
          <div className="space-y-4" data-highlights-section>
            <h2 className="text-2xl font-bold text-white">
              Top {highlights.length} Clips
              {status?.status === VideoStatus.HIGHLIGHTS_FOUND && clips.length < highlights.length && (
                <span className="ml-3 text-sm font-normal text-zinc-400">
                  ({clips.length}/{highlights.length} clips ready)
                </span>
              )}
            </h2>
            <div className="space-y-6">
              {highlights.map((highlight, index) => {
                const clip = getClipForHighlight(highlight);
                const isProcessing = !clip && status?.status === VideoStatus.HIGHLIGHTS_FOUND;
                return (
                  <Card key={index} className="border-2 border-zinc-700 hover:border-zinc-500 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.02] bg-zinc-900/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 text-sm font-medium text-zinc-400">
                          {formatTime(highlight.start)} - {formatTime(highlight.end)}
                        </div>
                        {highlight.title && <h4 className="text-zinc-100 font-semibold mb-1">{highlight.title}</h4>}
                        {highlight.summary && <p className="text-zinc-300 text-sm">{highlight.summary}</p>}
                        <div className="mt-2 text-sm text-zinc-400">
                          Score: {highlight.score.toFixed(1)}/10
                        </div>
                      </div>
                    </div>
                    {isProcessing && (
                      <div className="mt-4 flex flex-col items-center justify-center py-12 bg-zinc-800/50 rounded-lg">
                        <div className="relative">
                          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-purple-500"></div>
                        </div>
                        <p className="mt-4 text-sm text-zinc-400">Processing clip...</p>
                      </div>
                    )}
                    {clip && (
                      <div className="mt-4 space-y-4">
                        <div className="flex justify-center">
                          <div className="rounded-lg overflow-hidden bg-black max-w-2xl w-full relative">
                            {clipVideoErrors[clip.id] && !clipVideoUrls[clip.id] ? (
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
                                controls
                                className="w-full h-auto"
                                preload={isUsingNgrok && !clipVideoUrls[clip.id] ? "none" : "metadata"}
                                poster={getMomentThumbnailUrl(clip.id)}
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
                                  console.error(`Video load error for clip: ${clip.id}`, JSON.stringify(errorInfo, null, 2));
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
                              >
                                Your browser does not support the video tag.
                              </video>
                            )}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-3 flex-1">
                              <Button asChild variant="mono" size="md" className="flex-1 min-w-[140px]">
                                <a href={getMomentDownloadUrl(clip.id)} download>
                                  Download Clip
                                </a>
                              </Button>
                              <Button
                                onClick={() => handleSaveClip(clip.id)}
                                variant={savedClips[clip.id] ? "primary" : "mono"}
                                size="md"
                                className={savedClips[clip.id] ? "bg-green-600 hover:bg-green-700 flex-1 min-w-[120px]" : "flex-1 min-w-[120px]"}
                              >
                                {savedClips[clip.id] ? "✓ Saved" : "Save Clip"}
                              </Button>
                              <Button
                                onClick={() => router.push(`/edit-clip/${clip.id}`)}
                                variant="primary"
                                size="md"
                                className="bg-blue-600 hover:bg-blue-700 flex-1 min-w-[100px]"
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {highlights.length > 0 && (
          <div className="mt-12 flex flex-col items-center justify-center space-y-4 border-t border-zinc-700 pt-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">
                Improve the System
              </h3>
              <p className="text-sm text-zinc-300 mb-4">
                After rating clips, click below to trigger the learning system to analyze your feedback and improve clip selection.
              </p>
            </div>
            <Button
              onClick={handleTriggerLearning}
              disabled={learningStatus.isLoading}
              className="bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {learningStatus.isLoading ? "Learning..." : "Learn from Feedback"}
            </Button>
            {learningStatus.message && (
              <Alert className="mt-2 border-green-500 bg-green-900/30 backdrop-blur-sm">
                <AlertDescription className="text-green-200">
                  {learningStatus.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="mt-12">
          <h2 className="mb-4 text-2xl font-bold text-white">Your Videos</h2>
          {projectsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-zinc-700 border-t-white"></div>
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const thumbnailUrl = projectThumbnails[project.video_id];
                const videoId = project.video_id;
                return (
                  <Card
                    key={videoId}
                    className="overflow-hidden border-2 border-zinc-700 hover:border-zinc-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] cursor-pointer bg-zinc-900/80 backdrop-blur-sm"
                    onClick={() => handleProjectClick(videoId)}
                  >
                    <div className="w-full aspect-video bg-zinc-800 overflow-hidden relative">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={`Video ${videoId}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.parentElement) {
                              const placeholder = e.currentTarget.parentElement.querySelector('.thumbnail-placeholder');
                              if (placeholder) {
                                (placeholder as HTMLElement).style.display = 'flex';
                              }
                            }
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center text-zinc-500 text-sm ${thumbnailUrl ? 'hidden thumbnail-placeholder' : ''}`}>
                        No thumbnail
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-2 text-lg font-semibold text-white">
                        Video Project
                      </div>
                      <div className="space-y-1 text-sm text-zinc-400">
                        <div className="font-mono text-xs text-zinc-300 break-all">
                          ID: {videoId}
                        </div>
                        <div>{project.moment_count} moment{project.moment_count !== 1 ? "s" : ""}</div>
                        {project.duration && (
                          <div>Duration: {formatTime(project.duration)}</div>
                        )}
                        <div className="text-xs text-zinc-500">
                          Created: {new Date(project.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-2 border-zinc-700 bg-zinc-900/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <p className="text-center text-zinc-300">
                  No projects yet.{" "}
                  <Link href="/" className="text-primary hover:underline">
                    Upload and process a video
                  </Link>{" "}
                  to get started!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ProcessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black"><div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-white"></div></div>}>
      <ProcessPageContent />
    </Suspense>
  );
}
