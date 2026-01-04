"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignedIn, SignedOut, useSignIn } from "@clerk/nextjs";
import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button-1";
import ButtonIconHoverDemo from "@/components/shadcn-studio/button/button-04";

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { signIn, isLoaded: signInLoaded } = useSignIn();

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
            </div>
          </div>
        </div>
      </div>
    </SignedOut>
  );
}
