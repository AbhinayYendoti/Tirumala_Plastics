import { clerkMiddleware } from "@clerk/nextjs/server";

// Only attaches the Clerk session. Access control lives next to the data: requireUser()
// runs in the (app) and print layouts, every server action and the export route.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
