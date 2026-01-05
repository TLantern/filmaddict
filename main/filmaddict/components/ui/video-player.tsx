"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { Button } from "./button-1";
import { Play, Pause } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranscript } from "@/lib/api";
import { TranscriptSegment, VerdictExplanation } from "@/lib/types";
import { VerdictPanel } from "./verdict-panel";

interface VideoPlayerProps {
  src: string;
  videoId?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  className?: string;
  explanation?: VerdictExplanation;
  currentSegment?: {
    label: string;
    reason: string;
    explanation?: VerdictExplanation;
    start_time?: number;
    end_time?: number;
    rating?: number;
  };
}

export interface VideoPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
  stepForward: (frames?: number) => void;
  stepBackward: (frames?: number) => void;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ src, videoId, onTimeUpdate, onDurationChange, className = "", explanation, currentSegment }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const transcriptScrollRef = useRef<HTMLDivElement>(null);
    const isAutoScrollingRef = useRef(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
    const [transcriptLoading, setTranscriptLoading] = useState(false);
    const [showScrollbars, setShowScrollbars] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const FRAME_RATE = 30;
    const FRAME_DURATION = 1 / FRAME_RATE;

    useImperativeHandle(ref, () => ({
      play: () => {
        const video = videoRef.current;
        if (video) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              // Ignore AbortError - it's expected when play() is interrupted by pause()
              if (error.name !== 'AbortError') {
                console.error('Error playing video:', error);
              }
            });
          }
        }
      },
      pause: () => {
        videoRef.current?.pause();
      },
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      getCurrentTime: () => {
        return videoRef.current?.currentTime || 0;
      },
      getDuration: () => {
        return videoRef.current?.duration || 0;
      },
      isPlaying: () => {
        return !videoRef.current?.paused || false;
      },
      stepForward: (frames: number = 1) => {
        if (videoRef.current) {
          const currentTime = videoRef.current.currentTime;
          videoRef.current.currentTime = currentTime + (frames * FRAME_DURATION);
        }
      },
      stepBackward: (frames: number = 1) => {
        if (videoRef.current) {
          const currentTime = videoRef.current.currentTime;
          videoRef.current.currentTime = Math.max(0, currentTime - (frames * FRAME_DURATION));
        }
      },
      setPlaybackRate: (rate: number) => {
        if (videoRef.current) {
          videoRef.current.playbackRate = rate;
        }
      },
      getPlaybackRate: () => {
        return videoRef.current?.playbackRate || 1;
      },
    }));

    const togglePlayPause = useCallback(() => {
      if (videoRef.current) {
        if (videoRef.current.paused) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              // Ignore AbortError - it's expected when play() is interrupted by pause()
              if (error.name !== 'AbortError') {
                console.error('Error playing video:', error);
              }
            });
          }
        } else {
          videoRef.current.pause();
        }
      }
    }, []);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        const time = video.currentTime;
        setCurrentTime(time);
        onTimeUpdate?.(time);
      };

      const handleDurationChange = () => {
        const dur = video.duration;
        setDuration(dur);
        onDurationChange?.(dur);
      };

      const handlePlay = () => {
        setIsPlaying(true);
      };
      const handlePause = () => {
        setIsPlaying(false);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === "Space" && e.target === document.body) {
          e.preventDefault();
          togglePlayPause();
        }
      };

      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("durationchange", handleDurationChange);
      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("loadedmetadata", handleDurationChange);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("durationchange", handleDurationChange);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("loadedmetadata", handleDurationChange);
        document.removeEventListener("keydown", handleKeyDown);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onTimeUpdate, onDurationChange]);

    useEffect(() => {
      if (videoId) {
        setTranscriptLoading(true);
        getTranscript(videoId)
          .then((data) => {
            setTranscript(data.segments);
            setTranscriptLoading(false);
          })
          .catch((error) => {
            if (error instanceof Error && error.message === "Transcript not found") {
              setTranscript([]);
            } else {
              console.error("Failed to load transcript:", error);
            }
            setTranscriptLoading(false);
          });
      }
    }, [videoId]);

    const getCurrentTranscriptSegment = () => {
      return transcript.find(
        (segment) => currentTime >= segment.start && currentTime <= segment.end
      );
    };

    useEffect(() => {
      const activeSegment = getCurrentTranscriptSegment();
      if (activeSegment) {
        const segmentIndex = transcript.findIndex((s) => s === activeSegment);
        const segmentElement = segmentRefs.current.get(segmentIndex);
        if (segmentElement) {
          isAutoScrollingRef.current = true;
          segmentElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          setTimeout(() => {
            isAutoScrollingRef.current = false;
          }, 500);
        }
      }
    }, [currentTime, transcript]);

    const handleTranscriptScroll = () => {
      setShowScrollbars(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setShowScrollbars(false);
      }, 1500);
    };

    return (
      <ResizablePanelGroup direction="horizontal" className={`bg-black h-full ${className}`}>
        <ResizablePanel defaultSize={25} minSize={10}>
          <div className="h-full bg-black p-4">
            <Card className="h-full bg-zinc-900 border-zinc-700 w-full box-border overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white">Transcript</CardTitle>
              </CardHeader>
              <CardContent className="p-0 w-full box-border overflow-hidden">
                <div
                  ref={transcriptScrollRef}
                  onScroll={handleTranscriptScroll}
                  onMouseEnter={() => setShowScrollbars(true)}
                  onMouseLeave={() => {
                    if (scrollTimeoutRef.current) {
                      clearTimeout(scrollTimeoutRef.current);
                    }
                    scrollTimeoutRef.current = setTimeout(() => {
                      setShowScrollbars(false);
                    }, 500);
                  }}
                  className={`overflow-y-auto overflow-x-hidden max-h-[calc(100%-4rem)] p-5 w-full box-border ${
                    showScrollbars 
                      ? '[&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-zinc-900 [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-zinc-500 [&::-webkit-scrollbar-thumb]:border-[1px] [&::-webkit-scrollbar-thumb]:border-zinc-700' 
                      : '[&::-webkit-scrollbar]:w-0'
                  }`}
                  style={{ 
                    scrollbarColor: showScrollbars ? '#52525b #27272a' : 'transparent transparent',
                    scrollbarWidth: showScrollbars ? 'thin' : 'none',
                    minWidth: 0,
                    maxWidth: '100%'
                  }}
                >
                  {transcriptLoading ? (
                    <div className="text-zinc-400 text-sm">Loading transcript...</div>
                  ) : transcript.length === 0 ? (
                    <div className="text-zinc-400 text-sm">No transcript available</div>
                  ) : (
                    <div className="space-y-3">
                      {transcript.map((segment, index) => {
                        const isActive = getCurrentTranscriptSegment() === segment;
                        return (
                          <div
                            key={index}
                            ref={(el) => {
                              if (el) {
                                segmentRefs.current.set(index, el);
                              } else {
                                segmentRefs.current.delete(index);
                              }
                            }}
                            className={`text-sm leading-relaxed break-words w-full box-border ${
                              isActive
                                ? "text-white bg-zinc-800 p-2 rounded"
                                : "text-zinc-300"
                            }`}
                            style={{ 
                              wordBreak: 'break-word', 
                              overflowWrap: 'anywhere', 
                              maxWidth: '100%',
                              overflow: 'hidden',
                              minWidth: 0
                            }}
                          >
                            <div className="text-xs text-zinc-500 mb-1 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                              {formatTime(segment.start)} - {formatTime(segment.end)}
                            </div>
                            <div className="break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{segment.text}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex h-full items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={src}
              className="max-h-full max-w-full object-contain"
              crossOrigin="anonymous"
              onError={(e) => {
                const video = e.currentTarget;
                const error = video.error;
                console.error('Video playback error:', {
                  src: video.src,
                  errorCode: error?.code,
                  errorMessage: error?.message,
                  networkState: video.networkState,
                  readyState: video.readyState,
                });
              }}
              onLoadStart={() => console.log('Video load started:', src)}
              onLoadedMetadata={() => console.log('Video metadata loaded:', src)}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={25} minSize={10}>
          <div className="h-full bg-black p-4 overflow-hidden">
            <Card className="h-full bg-zinc-900 border-zinc-700 w-full box-border overflow-hidden flex flex-col">
              <CardHeader>
                <CardTitle className="text-white">Explanation</CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-y-auto">
                {currentSegment && (
                  <div className="flex flex-col gap-4">
                    {/* Explanation or Reason */}
                    {explanation ? (
                      <VerdictPanel 
                        explanation={explanation}
                        videoId={videoId}
                        startTime={currentSegment?.start_time}
                        endTime={currentSegment?.end_time}
                      />
                    ) : currentSegment?.explanation ? (
                      <VerdictPanel 
                        explanation={currentSegment.explanation}
                        videoId={videoId}
                        startTime={currentSegment?.start_time}
                        endTime={currentSegment?.end_time}
                      />
                    ) : (
                      <div className="flex flex-col gap-4 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
                        <div className="pt-2 border-t border-zinc-700">
                          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Reason</p>
                          <p className="text-sm text-zinc-200">{currentSegment.reason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!currentSegment && (
                  <div className="text-zinc-400 text-sm">No explanation available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
