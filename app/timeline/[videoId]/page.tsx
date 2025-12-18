"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getHighlights,
  getMoments,
  getVideoPlaybackUrl,
  getVideoStatus,
} from "@/lib/api";
import { Highlight, MomentResponse, Track, TimelineItem } from "@/lib/types";
import { VideoPlayer, VideoPlayerRef } from "@/components/ui/video-player";
import { Timeline } from "@/components/ui/timeline";
import { Button } from "@/components/ui/button-1";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;
  const playerRef = useRef<VideoPlayerRef>(null);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [moments, setMoments] = useState<MomentResponse[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoId) {
      loadVideoData();
    }
  }, [videoId]);

  const loadVideoData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusData, highlightsData] = await Promise.all([
        getVideoStatus(videoId),
        getHighlights(videoId),
      ]);

      setHighlights(highlightsData.highlights);
      setDuration(statusData.duration || 0);
      setVideoUrl(getVideoPlaybackUrl(videoId));

      // Try to get moments, but use highlights if moments don't exist
      try {
        const momentsData = await getMoments(videoId);
        setMoments(momentsData.moments);
        
        // Match moments to highlights and create tracks
        const timelineTracks = createTracks(
          momentsData.moments,
          highlightsData.highlights
        );
        setTracks(timelineTracks);
      } catch (momentsError) {
        console.log("Moments not available, using highlights instead:", momentsError);
        // Create tracks from highlights directly
        const timelineTracks = createTracksFromHighlights(highlightsData.highlights);
        setTracks(timelineTracks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load video data");
    } finally {
      setLoading(false);
    }
  };

  const createTracks = (
    moments: MomentResponse[],
    highlights: Highlight[]
  ): Track[] => {
    const tracks: Track[] = [];

    moments.forEach((moment, index) => {
      // Find matching highlight for this moment
      const matchingHighlight = highlights.find(
        (h) =>
          Math.abs(h.start - moment.start) < 0.5 &&
          Math.abs(h.end - moment.end) < 0.5
      );

      const item: TimelineItem = {
        id: moment.id,
        start: moment.start,
        end: moment.end,
        title: matchingHighlight?.title || `Moment ${index + 1}`,
        momentUrl: moment.moment_url,
      };

      // Create one track per moment
      tracks.push({
        id: `track-${moment.id}`,
        items: [item],
      });
    });

    return tracks;
  };

  const createTracksFromHighlights = (highlights: Highlight[]): Track[] => {
    const tracks: Track[] = [];

    highlights.forEach((highlight, index) => {
      const item: TimelineItem = {
        id: `highlight-${index}`,
        start: highlight.start,
        end: highlight.end,
        title: highlight.title || `Highlight ${index + 1}`,
        momentUrl: "",
      };

      // Create one track per highlight
      tracks.push({
        id: `track-highlight-${index}`,
        items: [item],
      });
    });

    return tracks;
  };

  const handleSeek = (time: number) => {
    if (playerRef.current) {
      playerRef.current.seek(time);
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleDurationChange = (dur: number) => {
    if (dur > 0) {
      setDuration(dur);
    }
  };

  const handlePlayPause = () => {
    if (playerRef.current) {
      if (playerRef.current.isPlaying()) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        playerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        setIsPlaying(playerRef.current.isPlaying());
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-purple-500 mx-auto mb-4"></div>
          <p className="text-zinc-300">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => router.push("/process")} variant="primary">
            Back to Process
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black overflow-x-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Timeline Editor</h1>
          <span className="text-sm text-zinc-400">Video ID: {videoId}</span>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/process")}
            variant="mono"
            size="sm"
          >
            Back to Process
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="mono"
            size="sm"
          >
            Home
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="vertical" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={50} minSize={30}>
          {videoUrl && (
            <VideoPlayer
              key={videoId}
              ref={playerRef}
              src={videoUrl}
              videoId={videoId}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              className="h-full"
            />
          )}
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <Timeline
            tracks={tracks}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            onPlayPause={handlePlayPause}
            isPlaying={isPlaying}
            className="h-full"
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
