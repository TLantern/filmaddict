"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/ui/dashboard-with-collapsible-sidebar";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const checkSubscription = async () => {
      try {
        const response = await fetch("/api/check-subscription");
        const data = await response.json();

        if (!data.hasSubscription && !data.bypassed) {
          // User doesn't have subscription, redirect to upgrade page
          router.push("/upgrade");
        } else {
          setCheckingSubscription(false);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        // On error, redirect to upgrade to be safe
        router.push("/upgrade");
      }
    };

    checkSubscription();
  }, [isLoaded, user, router]);

  if (!isLoaded || checkingSubscription) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <Dashboard />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

