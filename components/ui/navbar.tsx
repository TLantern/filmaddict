"use client";

import Link from "next/link";
import Image from "next/image";
import {
  SignedIn,
  SignedOut,
  UserButton,
  useSignIn,
} from "@clerk/nextjs";

export function Navbar() {
  const { signIn, isLoaded: signInLoaded } = useSignIn();

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center text-white hover:opacity-80 transition-opacity ">
            <Image
              src="/logo.png"
              alt="YKlipp"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
              priority
              unoptimized
            />
            <span className="text-xl font-semibold">YKlipp</span>
          </Link>
          
          <div className="flex items-center gap-8">
            <Link 
              href="/moments" 
              className="text-sm font-medium text-white hover:text-gray-300 transition-colors"
            >
              Features
            </Link>
            {/*
            <Link 
              href="/pricing" 
              className="text-sm font-medium text-white hover:text-gray-300 transition-colors"
            >
              Pricing
            </Link>
            */}
            <SignedIn>
              <Link 
                href="/dashboard" 
                className="text-sm font-medium text-white hover:text-gray-300 transition-colors"
              >
                Dashboard
              </Link>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <button 
                className="px-4 py-2 bg-[#e3b54a] text-black border border-[#b8922f] rounded-lg hover:bg-[#d1a643] transition-colors text-sm font-bold disabled:opacity-50"
                style={{ 
                  textShadow: '0 0 2px white, 0 0 4px rgba(255, 255, 255, 0.5)'
                }}
                onClick={handleGoogleAuth}
                disabled={!signInLoaded}
              >
                Get Started
              </button>
            </SignedOut>
          </div>
        </div>
      </div>
    </nav>
  );
}
