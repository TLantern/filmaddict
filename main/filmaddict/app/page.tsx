"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignedIn, SignedOut, useSignIn } from "@clerk/nextjs";
import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button-1";
import ButtonIconHoverDemo from "@/components/shadcn-studio/button/button-04";

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Check subscription before redirecting
      const checkAndRedirect = async () => {
        try {
          const response = await fetch("/api/check-subscription");
          const data = await response.json();
          
          if (data.hasSubscription || data.bypassed) {
            router.push("/dashboard");
          } else {
            router.push("/upgrade");
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
          // On error, redirect to upgrade to be safe
          router.push("/upgrade");
        }
      };
      
      checkAndRedirect();
    }
  }, [isLoaded, isSignedIn, router]);


  useEffect(() => {
    // #region agent log
    const logVideoState = (event: string, video: HTMLVideoElement, extra: Record<string, any> = {}) => {
      const state = {
        event,
        readyState: video.readyState,
        networkState: video.networkState,
        currentTime: video.currentTime,
        duration: video.duration,
        muted: video.muted,
        autoplay: video.autoplay,
        src: video.src,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        error: video.error ? { code: video.error.code, message: video.error.message } : null,
        ...extra
      };
      // Debug logging removed - no longer needed
    };

    const logBrowserEnv = () => {
      const env = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        connection: (navigator as any).connection ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt
        } : null,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled
      };
      // Debug logging removed - no longer needed
    };

    const video = videoRef.current;
    if (!video) return;

    const attachListeners = () => {
      video.addEventListener('loadstart', () => logVideoState('loadstart', video));
      video.addEventListener('durationchange', () => logVideoState('durationchange', video));
      video.addEventListener('loadedmetadata', () => logVideoState('loadedmetadata', video));
      video.addEventListener('loadeddata', () => logVideoState('loadeddata', video));
      video.addEventListener('progress', () => logVideoState('progress', video, { buffered: Array.from({ length: video.buffered.length }, (_, i) => ({ start: video.buffered.start(i), end: video.buffered.end(i) })) }));
      video.addEventListener('canplay', () => logVideoState('canplay', video));
      video.addEventListener('canplaythrough', () => logVideoState('canplaythrough', video));
      video.addEventListener('playing', () => logVideoState('playing', video));
      video.addEventListener('waiting', () => logVideoState('waiting', video));
      video.addEventListener('seeking', () => logVideoState('seeking', video));
      video.addEventListener('seeked', () => logVideoState('seeked', video));
      video.addEventListener('ended', () => logVideoState('ended', video));
      video.addEventListener('pause', () => logVideoState('pause', video));
      video.addEventListener('play', () => logVideoState('play', video));
      video.addEventListener('ratechange', () => logVideoState('ratechange', video, { playbackRate: video.playbackRate }));
      video.addEventListener('volumechange', () => logVideoState('volumechange', video, { volume: video.volume }));
      video.addEventListener('timeupdate', () => {
        if (video.currentTime % 1 < 0.1) {
          logVideoState('timeupdate', video);
        }
      });
      video.addEventListener('error', (e) => {
        const err = video.error;
        logVideoState('error', video, { 
          errorCode: err?.code, 
          errorMessage: err?.message
        });
      });
      video.addEventListener('stalled', () => logVideoState('stalled', video));
      video.addEventListener('suspend', () => logVideoState('suspend', video));
      video.addEventListener('abort', () => logVideoState('abort', video));
      video.addEventListener('emptied', () => logVideoState('emptied', video));
    };

    attachListeners();

    const attemptAutoplay = async () => {
      if (!video) return;
      try {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
          logVideoState('autoplay-success', video);
        }
      } catch (error) {
        logVideoState('autoplay-failed', video, { 
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : 'Unknown'
        });
        video.muted = true;
        try {
          await video.play();
          logVideoState('autoplay-muted-success', video);
        } catch (mutedError) {
          logVideoState('autoplay-muted-failed', video, { 
            error: mutedError instanceof Error ? mutedError.message : String(mutedError)
          });
        }
      }
    };

    const checkDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Debug logging removed - no longer needed
      }
      if (video) {
        const rect = video.getBoundingClientRect();
        logVideoState('dimensions-check', video, { 
          displayWidth: rect.width, 
          displayHeight: rect.height 
        });
      }
    };

    checkDimensions();
    const timer = setTimeout(() => {
      checkDimensions();
      attemptAutoplay();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (video) {
        video.removeEventListener('loadstart', () => {});
        video.removeEventListener('error', () => {});
      }
    };
    // #endregion
  }, []);

  const handleGoogleAuth = async () => {
    if (!signInLoaded || !signIn) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/upgrade",
        redirectUrlComplete: "/upgrade",
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleTrialAuth = async () => {
    if (!signInLoaded || !signIn) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/upgrade",
        redirectUrlComplete: "/upgrade",
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <SignedOut>
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-24 pb-20 px-4 md:px-6 lg:px-8">
          <div className="container mx-auto max-w-5xl">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="text-white">Edit </span>
                <span className="text-[#FFD873]">long-form videos</span>
                <br />
                <span className="text-white">in minutes</span>
              </h1>
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-3 px-6 py-3 bg-black border border-gray-600 hover:border-gray-500 text-white font-bold"
                  onClick={handleGoogleAuth}
                  disabled={!signInLoaded}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
                <ButtonIconHoverDemo 
                  className="bg-[#e3b54a] hover:bg-[#d1a643] text-black border border-[#b8922f] font-bold [&>*]:[text-shadow:0_0_2px_white,0_0_4px_rgba(255,255,255,0.5)]"
                  style={{ 
                    textShadow: '0 0 2px white, 0 0 4px rgba(255, 255, 255, 0.5)'
                  }}
                  onClick={handleTrialAuth}
                  disabled={!signInLoaded}
                >
                  Start 3 day trial
                </ButtonIconHoverDemo>
              </div>
              <div ref={containerRef} className="relative bg-[#FFD873] border-2 border-[#e3b54a] rounded-lg w-full aspect-video max-w-4xl mx-auto p-4">
                <video 
                  ref={videoRef}
                  src="/landingpage.mp4"
                  preload="auto"
                  className="absolute top-4 left-4 right-4 bottom-4 object-cover rounded-lg shadow-2xl bg-black"
                  style={{ width: 'calc(100% - 2rem)', height: 'calc(100% - 2rem)' }}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* How It Works & Benefits - Right After Video */}
        <div className="py-20 px-4 md:px-6 lg:px-8">
          <div className="container mx-auto max-w-5xl">
            {/* Section: How It Works */}
            <section className="mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center">
                How Our <span className="text-[#FFD873]">AI Video Editor</span> Works
              </h2>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-[#FFD873] text-black rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
                  <h3 className="text-xl font-bold text-white mb-3">Upload Your Video</h3>
                  <p className="text-gray-300 text-sm">
                    Simply upload your long-form video file. Our platform supports all major video formats and automatically processes your content.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-[#FFD873] text-black rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
                  <h3 className="text-xl font-bold text-white mb-3">AI Analysis</h3>
                  <p className="text-gray-300 text-sm">
                    Our advanced AI analyzes your video using computer vision, audio processing, and natural language understanding to identify the best moments.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-[#FFD873] text-black rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
                  <h3 className="text-xl font-bold text-white mb-3">Review & Edit</h3>
                  <p className="text-gray-300 text-sm">
                    Review AI-suggested highlights and moments on an intuitive timeline. Fine-tune selections, remove unwanted segments, and arrange clips.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-[#FFD873] text-black rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">4</div>
                  <h3 className="text-xl font-bold text-white mb-3">Export & Share</h3>
                  <p className="text-gray-300 text-sm">
                    Export your edited video in high quality. Share directly to social platforms or download for further editing in professional video editing software.
                  </p>
                </div>
              </div>
            </section>

            {/* Section: Benefits */}
            <section className="mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center">
                Why Choose Our <span className="text-[#FFD873]">Video Editing Platform</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-[#FFD873] text-black rounded-lg p-2 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Save Time & Increase Productivity</h3>
                      <p className="text-gray-300">
                        Reduce video editing time from hours to minutes. Our automated video editing tools handle the heavy lifting, allowing you to focus on creating great content.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-[#FFD873] text-black rounded-lg p-2 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">AI-Powered Intelligence</h3>
                      <p className="text-gray-300">
                        Leverage cutting-edge machine learning and AI technology to automatically identify the most engaging moments in your videos. Our system learns from patterns to improve accuracy.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-[#FFD873] text-black rounded-lg p-2 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Cost-Effective Solution</h3>
                      <p className="text-gray-300">
                        No need for expensive video editing software or hiring professional editors. Our platform provides professional-grade editing capabilities at a fraction of the cost.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-[#FFD873] text-black rounded-lg p-2 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Easy to Use</h3>
                      <p className="text-gray-300">
                        Intuitive interface designed for both beginners and professionals. No complex video editing knowledge required—our AI handles the technical aspects.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-[#FFD873] text-black rounded-lg p-2 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Professional Quality Output</h3>
                      <p className="text-gray-300">
                        Export high-quality videos ready for any platform. Our video editing software maintains professional standards while streamlining your workflow.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-[#FFD873] text-black rounded-lg p-2 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Scale Your Content Production</h3>
                      <p className="text-gray-300">
                        Process multiple videos simultaneously and maintain a consistent content schedule. Perfect for content creators and businesses looking to scale their video production.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Features & Benefits Section */}
        <div className="py-20 px-4 md:px-6 lg:px-8">
          <div className="container mx-auto max-w-5xl">
            {/* Section 1: What We Do */}
            <section className="mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 text-center">
                Transform Long-Form Videos into <span className="text-[#FFD873]">Engaging Content</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <h3 className="text-2xl font-bold text-white mb-4">AI-Powered Video Editing</h3>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Our advanced AI video editing software automatically analyzes your long-form videos to identify the most engaging moments, highlights, and key segments. Save hours of manual video editing with intelligent content detection.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    Whether you're editing podcasts, webinars, tutorials, or live streams, our automated video editor uses machine learning to understand context, detect important moments, and create professional video clips in minutes.
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <h3 className="text-2xl font-bold text-white mb-4">Intelligent Moment Detection</h3>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Our video analysis engine uses semantic segmentation and retention scoring to identify the best moments in your content. No more scrubbing through hours of footage—let AI do the heavy lifting.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    The system analyzes visual elements, audio patterns, transcript content, and viewer engagement signals to automatically extract highlights that resonate with your audience.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Key Features */}
            <section className="mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center">
                Powerful <span className="text-[#FFD873]">Video Editing Features</span>
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold text-white mb-3">Automated Highlight Extraction</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Automatically extract the best moments from your videos using AI-powered highlight detection. Perfect for creating social media clips, promotional videos, and highlight reels.
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold text-white mb-3">Smart Filler Detection</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Remove ums, ahs, pauses, and repetitive content automatically. Our filler detection algorithm identifies and eliminates dead air, keeping your videos crisp and professional.
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold text-white mb-3">Semantic Segmentation</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Break down your videos into meaningful segments based on topic changes, scene transitions, and content themes. Organize your footage intelligently.
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold text-white mb-3">Retention Scoring</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Each moment is scored based on engagement potential, helping you prioritize the most valuable content. Focus on what matters most to your audience.
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold text-white mb-3">Timeline-Based Editing</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Professional timeline editor with drag-and-drop functionality. Arrange clips, add transitions, and fine-tune your edits with precision and ease.
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold text-white mb-3">Export & Share</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Export your edited videos in high quality. Share directly to social media platforms or download for further editing in your preferred video editing software.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Use Cases & Benefits */}
            <section className="mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center">
                Perfect for <span className="text-[#FFD873]">Content Creators</span>
              </h2>
              <div className="space-y-8">
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-lg p-8 border border-zinc-700">
                  <h3 className="text-3xl font-bold text-white mb-4">Podcast Editors</h3>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Transform your long-form podcast episodes into bite-sized clips for social media. Our AI video editor automatically identifies the most quotable moments, key discussions, and engaging segments. Perfect for podcasters who want to maximize their content reach across multiple platforms.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    Save countless hours of manual editing. Upload your podcast video, and our intelligent system will analyze the content, detect highlights, remove filler words, and create shareable clips ready for Instagram, TikTok, YouTube Shorts, and more.
                  </p>
                </div>
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-lg p-8 border border-zinc-700">
                  <h3 className="text-3xl font-bold text-white mb-4">Content Creators & YouTubers</h3>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Create engaging video content faster than ever. Whether you're producing tutorials, vlogs, or educational content, our automated video editing tools help you focus on creation while AI handles the tedious editing work.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    Our video editing software understands context, identifies key moments, and helps you create professional videos that keep viewers engaged. Perfect for content creators who want to maintain a consistent posting schedule without spending days on editing.
                  </p>
                </div>
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-lg p-8 border border-zinc-700">
                  <h3 className="text-3xl font-bold text-white mb-4">Business & Marketing Teams</h3>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Repurpose webinars, training sessions, and corporate videos into marketing content. Extract the most valuable insights and create promotional clips that drive engagement and conversions.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    Our AI-powered video editing platform helps marketing teams maximize ROI from video content. Turn one long-form video into dozens of social media posts, email campaign assets, and website content—all automatically.
                  </p>
                </div>
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-lg p-8 border border-zinc-700">
                  <h3 className="text-3xl font-bold text-white mb-4">Educators & Course Creators</h3>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Break down lengthy educational videos into digestible lessons and highlight reels. Our intelligent video editor identifies key concepts, important explanations, and engaging moments that help students learn more effectively.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    Create course previews, lesson highlights, and promotional content from your full-length educational videos. Perfect for online course creators who want to showcase their best content and improve student engagement.
                  </p>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="text-center py-12">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Transform Your <span className="text-[#FFD873]">Video Editing Workflow</span>?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                Join content creators, podcasters, and businesses who are already using AI-powered video editing to create engaging content faster.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-3 px-6 py-3 bg-black border border-gray-600 hover:border-gray-500 text-white font-bold"
                  onClick={handleGoogleAuth}
                  disabled={!signInLoaded}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Get Started Free
                </Button>
                <ButtonIconHoverDemo 
                  className="bg-[#e3b54a] hover:bg-[#d1a643] text-black border border-[#b8922f] font-bold [&>*]:[text-shadow:0_0_2px_white,0_0_4px_rgba(255,255,255,0.5)]"
                  style={{ 
                    textShadow: '0 0 2px white, 0 0 4px rgba(255, 255, 255, 0.5)'
                  }}
                  onClick={handleTrialAuth}
                  disabled={!signInLoaded}
                >
                  Start 3 Day Trial
                </ButtonIconHoverDemo>
              </div>
            </section>
          </div>
        </div>
      </div>
    </SignedOut>
  );
}
