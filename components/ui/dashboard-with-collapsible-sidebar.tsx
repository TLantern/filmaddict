"use client"
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Home,
  BarChart3,
  ChevronDown,
  ChevronsRight,
  Moon,
  Sun,
  Settings,
  Play,
  Loader2,
  Upload,
} from "lucide-react";
import { getProjects, uploadVideo, uploadYouTubeVideo, getVideoStatus, getApiBaseUrl } from "@/lib/api";
import { ProjectResponse, VideoStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CleanupButton from "@/components/ui/cleanup-button";
import { cn } from "@/lib/utils";
import DropdownMenuUserMenuDemo from "@/components/shadcn-studio/dropdown-menu/dropdown-menu-07";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";

export const Dashboard = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className={`flex min-h-screen w-full ${isDark ? 'dark' : ''}`}>
      <div className="flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Sidebar />
        <DashboardContent isDark={isDark} setIsDark={setIsDark} />
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState("Dashboard");

  return (
    <nav
      className={`sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${
        open ? 'w-64' : 'w-16'
      } border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm`}
    >
      <TitleSection open={open} />

      <div className="space-y-1 mb-8">
        <Option
          Icon={Home}
          title="Dashboard"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={BarChart3}
          title="Analytics"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={Settings}
          title="Settings"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
      </div>

      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  );
};

interface OptionProps {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  selected: string;
  setSelected: (title: string) => void;
  open: boolean;
  notifs?: number;
}

const Option = ({ Icon, title, selected, setSelected, open, notifs }: OptionProps) => {
  const isSelected = selected === title;
  
  return (
    <button
      onClick={() => setSelected(title)}
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
        isSelected 
          ? "bg-[#FFD873]/20 dark:bg-[#FFD873]/10 text-[#e3b54a] dark:text-[#FFD873] shadow-sm border-l-2 border-[#e3b54a] dark:border-[#FFD873]" 
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      <div className="grid h-full w-12 place-content-center">
        <Icon className="h-4 w-4" />
      </div>
      
      {open && (
        <span
          className={`text-sm font-medium transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {title}
        </span>
      )}

      {notifs && open && (
        <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#e3b54a] dark:bg-[#FFD873] text-xs text-white font-medium">
          {notifs}
        </span>
      )}
    </button>
  );
};

interface TitleSectionProps {
  open: boolean;
}

const TitleSection = ({ open }: TitleSectionProps) => {
  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
        <div className="flex items-center gap-3">
          <Logo />
          {open && (
            <div className={`transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2">
                <div>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    YKlipp
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Pro Plan
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {open && (
          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-[#e3b54a] to-[#d1a643] shadow-sm">
      <Image
        src="/logo.png"
        alt="YKlipp"
        width={24}
        height={24}
        className="w-6 h-6 object-contain"
        unoptimized
      />
    </div>
  );
};

interface ToggleCloseProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ToggleClose = ({ open, setOpen }: ToggleCloseProps) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div className="flex items-center p-3">
        <div className="grid size-10 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 transition-transform duration-300 text-gray-500 dark:text-gray-400 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        {open && (
          <span
            className={`text-sm font-medium text-gray-600 dark:text-gray-300 transition-opacity duration-200 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Hide
          </span>
        )}
      </div>
    </button>
  );
};

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

interface DashboardContentProps {
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

const DashboardContent = ({ isDark, setIsDark }: DashboardContentProps) => {
  const router = useRouter();
  const { user } = useUser();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"file" | "youtube" | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showYoutubeAdvisor, setShowYoutubeAdvisor] = useState(false);

  const username = user?.firstName || user?.username || user?.fullName || "there";

  useEffect(() => {
    loadProjects();
    const interval = setInterval(() => {
      checkNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkNotifications = async () => {
    try {
      const projectsData = await getProjects(user?.id);
      let count = 0;
      
      for (const project of projectsData.projects) {
        try {
          const statusData = await getVideoStatus(project.video_id);
          if (statusData.status === VideoStatus.QUEUED || statusData.status === VideoStatus.DONE) {
            count++;
          }
        } catch (err) {
          console.error(`Failed to check status for video ${project.video_id}:`, err);
        }
      }
      
      setNotificationCount(count);
    } catch (err) {
      console.error("Failed to check notifications:", err);
    }
  };

  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      const projectsData = await getProjects(user?.id);
      const sortedProjects = [...projectsData.projects].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setProjects(sortedProjects);

      let notificationCount = 0;
      for (const project of sortedProjects) {
        try {
          const statusData = await getVideoStatus(project.video_id);
          if (statusData.status === VideoStatus.QUEUED || statusData.status === VideoStatus.DONE) {
            notificationCount++;
          }
        } catch (err) {
          console.error(`Failed to get status for video ${project.video_id}:`, err);
        }
      }
      setNotificationCount(notificationCount);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setProjects([]);
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
      setUploadError(null);
    } else {
      setUploadError("Please select a valid video file");
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

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadLoading(true);
    setUploadError(null);

    try {
      let response;
      const uploadStartTime = Date.now();
      
      console.log('[Video Upload] Starting upload:', {
        method: uploadMethod,
        userId: user?.id,
        fileName: uploadMethod === "file" ? selectedFile?.name : undefined,
        fileSize: uploadMethod === "file" ? selectedFile?.size : undefined,
        youtubeUrl: uploadMethod === "youtube" ? youtubeUrl : undefined,
        timestamp: new Date().toISOString(),
      });
      
      if (uploadMethod === "file" && selectedFile) {
        response = await uploadVideo(selectedFile, undefined, user?.id);
      } else if (uploadMethod === "youtube" && youtubeUrl) {
        response = await uploadYouTubeVideo(youtubeUrl, undefined, user?.id);
      } else {
        throw new Error("Please select a file or enter a YouTube URL");
      }

      console.log('[Video Upload] Upload successful:', {
        videoId: response.video_id,
        uploadMethod,
        uploadDuration: Date.now() - uploadStartTime,
        timestamp: new Date().toISOString(),
      });

      // Wait for processing to complete before redirecting
      const { getVideoStatus } = await import("@/lib/api");
      const { VideoStatus } = await import("@/lib/types");
      
      // Poll for status without showing error messages
      const maxAttempts = 600; // 20 minutes max
      let attempts = 0;
      const statusHistory: Array<{ status: string; timestamp: number; duration?: number | null }> = [];
      let lastStatus: string | null = null;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
        attempts++;
        
        try {
          const statusData = await getVideoStatus(response.video_id);
          
          // Track status transitions
          if (statusData.status !== lastStatus) {
            statusHistory.push({
              status: statusData.status,
              timestamp: Date.now(),
              duration: statusData.duration,
            });
            lastStatus = statusData.status;
            console.log(`[Video Processing] Status transition: ${statusData.status}`, {
              videoId: response.video_id,
              attempt: attempts,
              elapsedTime: Date.now() - uploadStartTime,
              duration: statusData.duration,
            });
          }
          
          if (statusData.status === VideoStatus.DONE) {
            // Processing complete - redirect
            console.log('[Video Processing] Processing completed successfully:', {
              videoId: response.video_id,
              totalAttempts: attempts,
              totalTime: Date.now() - uploadStartTime,
              duration: statusData.duration,
              statusHistory: statusHistory.map(s => `${s.status}@${new Date(s.timestamp).toISOString()}`),
              timestamp: new Date().toISOString(),
            });
            setUploadLoading(false);
            router.push(`/timeline/${response.video_id}`);
            return;
          } else if (statusData.status === VideoStatus.FAILED) {
            // Processing failed - analyze why
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
            
            // Analyze possible reasons based on where it failed
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
            
            console.error('[Video Processing] Processing failed - detailed analysis:', {
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
            setUploadError("Video processing failed. Please try uploading again.");
            setUploadLoading(false);
            return;
          }
          // Otherwise continue polling (PROCESSING, QUEUED, etc.)
        } catch (err) {
          // Network error - continue polling, don't fail immediately
          console.warn(`[Video Processing] Status check failed (attempt ${attempts}/${maxAttempts}):`, {
            videoId: response.video_id,
            attempt: attempts,
            error: err instanceof Error ? err.message : String(err),
            errorStack: err instanceof Error ? err.stack : undefined,
            timestamp: new Date().toISOString(),
          });
          if (attempts >= maxAttempts) {
            // Final attempt failed
            console.error('[Video Processing] Max attempts reached, unable to verify status:', {
              videoId: response.video_id,
              uploadMethod,
              totalAttempts: attempts,
              totalTime: Date.now() - uploadStartTime,
              lastError: err instanceof Error ? err.message : String(err),
              timestamp: new Date().toISOString(),
            });
            setUploadError("Unable to verify processing status. Please check the video later.");
            setUploadLoading(false);
            return;
          }
        }
      }
      
      // Timeout reached
      console.warn('[Video Processing] Timeout reached:', {
        videoId: response.video_id,
        uploadMethod,
        maxAttempts,
        totalTime: Date.now() - uploadStartTime,
        timestamp: new Date().toISOString(),
      });
      setUploadError("Processing is taking longer than expected. The video is still processing in the background.");
      setUploadLoading(false);
      router.push(`/timeline/${response.video_id}`);
    } catch (err) {
      console.error('[Video Upload] Upload failed:', {
        uploadMethod,
        userId: user?.id,
        fileName: uploadMethod === "file" ? selectedFile?.name : undefined,
        youtubeUrl: uploadMethod === "youtube" ? youtubeUrl : undefined,
        error: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back, {username}!</p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationDropdown notificationCount={notificationCount} />
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <DropdownMenuUserMenuDemo />
        </div>
      </div>

      {projectsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Upload Card */}
          <div className="mb-8">
            <div className="flex items-center justify-center">
              <Card className="relative w-full max-w-2xl bg-gradient-to-br from-gray-50/90 via-white/80 to-gray-100/90 dark:from-gray-900/90 dark:via-gray-800/80 dark:to-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/20 dark:shadow-gray-950/50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_50%)] pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <CardContent className="relative p-8">
                  <form onSubmit={handleUploadSubmit} className="space-y-6">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all backdrop-blur-sm",
                        isDragging
                          ? "border-[#e3b54a] dark:border-[#FFD873] bg-[#e3b54a]/10 dark:bg-[#FFD873]/10 shadow-lg shadow-[#e3b54a]/20 dark:shadow-[#FFD873]/20"
                          : "border-gray-300 dark:border-gray-600 hover:border-[#e3b54a]/50 dark:hover:border-[#FFD873]/50 bg-white/30 dark:bg-gray-800/30",
                        selectedFile && "border-[#e3b54a] dark:border-[#FFD873] bg-[#e3b54a]/10 dark:bg-[#FFD873]/10"
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      <Upload className="h-12 w-12 mx-auto mb-4 text-gray-600 dark:text-gray-400" />
                      <p className="text-gray-700 dark:text-gray-300 text-lg font-medium mb-2">
                        {selectedFile
                          ? selectedFile.name
                          : "Drop your video here"}
                      </p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-gradient-to-br from-gray-50/90 to-gray-100/90 dark:from-gray-900/90 dark:to-gray-800/90 px-2 text-gray-500 dark:text-gray-400">OR</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ isolation: 'isolate' }}>
                          <Image 
                            src="/youtube.png" 
                            alt="YouTube" 
                            width={20} 
                            height={20} 
                            className="h-5 w-5 object-contain opacity-100"
                            style={{ filter: 'none' }}
                            unoptimized
                          />
                        </div>
                        <Input
                          type="url"
                          value={youtubeUrl}
                          onChange={(e) => {
                            setYoutubeUrl(e.target.value);
                            setUploadMethod("youtube");
                            setUploadError(null);
                            if (e.target.value.length > 0) {
                              setShowYoutubeAdvisor(true);
                            }
                          }}
                          onFocus={() => setShowYoutubeAdvisor(true)}
                          onBlur={() => {
                            if (!youtubeUrl) {
                              setShowYoutubeAdvisor(false);
                            }
                          }}
                          placeholder="Drop your YouTube URL here"
                          className="pl-10 bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:ring-[#e3b54a] dark:focus-visible:ring-[#FFD873] backdrop-blur-sm"
                        />
                      </div>
                      <div 
                        className={`mt-3 px-4 py-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 dark:border-blue-500/40 rounded-md backdrop-blur-sm transition-all duration-300 ease-in-out ${
                          showYoutubeAdvisor 
                            ? 'opacity-100 translate-y-0' 
                            : 'opacity-0 -translate-y-2 pointer-events-none h-0 mt-0 py-0 overflow-hidden'
                        }`}
                      >
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          ⏱️ Processing may take 5-10 minutes. You can leave and come back - we'll notify you when it's ready!
                        </p>
                      </div>
                    </div>

                    {uploadError && (
                      <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 backdrop-blur-sm">
                        <AlertDescription className="text-red-600 dark:text-red-400">{uploadError}</AlertDescription>
                      </Alert>
                    )}

                    <CleanupButton
                      type="submit"
                      disabled={uploadLoading || (!selectedFile && !youtubeUrl)}
                      loading={uploadLoading}
                      active={!!(selectedFile || youtubeUrl)}
                    />
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Your Projects - Cards below main processing box */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Your Projects</h2>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projects.map((project) => {
                  const thumbnailUrl = project.thumbnail_url 
                    ? `${getApiBaseUrl()}${project.thumbnail_url}`
                    : null;
                  return (
                    <Card
                      key={project.video_id}
                      onClick={() => handleProjectClick(project.video_id)}
                      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-[#e3b54a]/50 dark:hover:border-[#FFD873]/50"
                    >
                      <div className="relative w-full aspect-video bg-gray-800 dark:bg-gray-950 overflow-hidden">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={`Project ${project.video_id}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                            No thumbnail
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors">
                          <div className="rounded-full bg-white/90 dark:bg-gray-900/90 p-2 hover:scale-110 transition-transform shadow-lg">
                            <Play className="h-5 w-5 text-[#e3b54a] dark:text-[#FFD873] ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                            {project.project_name || "Untitled Project"}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center justify-between">
                            <span>{project.moment_count} moment{project.moment_count !== 1 ? "s" : ""}</span>
                            {project.duration && (
                              <span className="text-gray-500 dark:text-gray-500">{formatTime(project.duration)}</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No projects yet. Upload and process a video above to get started!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

