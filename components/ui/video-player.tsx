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
import { TranscriptSegment } from "@/lib/types";

interface VideoPlayerProps {
  src: string;
  videoId?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  className?: string;
}

export interface VideoPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
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
  ({ src, videoId, onTimeUpdate, onDurationChange, className = "" }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const transcriptScrollRef = useRef<HTMLDivElement>(null);
    const isAutoScrollingRef = useRef(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
    const [transcriptLoading, setTranscriptLoading] = useState(false);
    const [userHasScrolled, setUserHasScrolled] = useState(false);

    useImperativeHandle(ref, () => ({
      play: () => {
        videoRef.current?.play();
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
    }));

    const togglePlayPause = useCallback(() => {
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play();
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
        setUserHasScrolled(false);
      };
      const handlePause = () => {
        setIsPlaying(false);
        setUserHasScrolled(false);
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
            console.error("Failed to load transcript:", error);
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
      if (userHasScrolled) return;
      
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
    }, [currentTime, transcript, userHasScrolled]);

    const handleTranscriptScroll = () => {
      if (!isAutoScrollingRef.current) {
        setUserHasScrolled(true);
      }
    };

    return (
      <ResizablePanelGroup direction="horizontal" className={`bg-black h-full ${className}`}>
        <ResizablePanel defaultSize={25} minSize={10}>
          <div className="h-full bg-black p-4">
            <Card className="h-full bg-zinc-900 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white">Transcript</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  ref={transcriptScrollRef}
                  onScroll={handleTranscriptScroll}
                  className="overflow-y-auto max-h-[calc(100%-4rem)] p-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-zinc-900 [&::-webkit-scrollbar-thumb]:bg-white [&::-webkit-scrollbar-thumb]:rounded-full"
                  style={{ scrollbarColor: 'white #18181b', scrollbarWidth: 'thin' }}
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
                            className={`text-sm leading-relaxed ${
                              isActive
                                ? "text-white bg-zinc-800 p-2 rounded"
                                : "text-zinc-300"
                            }`}
                          >
                            <div className="text-xs text-zinc-500 mb-1">
                              {formatTime(segment.start)} - {formatTime(segment.end)}
                            </div>
                            <div>{segment.text}</div>
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
          <div className="flex h-full items-center justify-center bg-black">
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
