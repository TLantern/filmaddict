"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Youtube, Loader2 } from "lucide-react";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { Button } from "@/components/ui/button-1";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadVideo, uploadYouTubeVideo } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"file" | "youtube" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      router.push(`/?video_id=${response.video_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <HeroGeometric
        badge="FilmAddict"
        title1="Best Moments"
        title2="Auto-Extracted"
      />

      <div className="relative z-20 -mt-16 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/5 backdrop-blur-md border-white/10">
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
          </div>
        </div>
      </div>
    </div>
  );
}

