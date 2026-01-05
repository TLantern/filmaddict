import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/moments", "/pricing", "/landing"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req) && req.nextUrl.pathname !== "/upgrade") {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|mov|avi|ogg|mp3|wav|m4a|pdf)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

