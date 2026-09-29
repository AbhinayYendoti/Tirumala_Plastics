import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";

function allowedEmails() {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

type Profile = { email: string; name: string };

// Clerk's Backend API is only hit when the session token lacks our custom claims,
// and then only once per user per server instance.
const profiles = new Map<string, Profile>();

async function loadProfile(userId: string): Promise<Profile> {
  const cached = profiles.get(userId);
  if (cached) return cached;
  const user = await (await clerkClient()).users.getUser(userId);
  const email = (user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "").toLowerCase();
  const profile = { email, name: user.firstName ?? email.split("@")[0] };
  profiles.set(userId, profile);
  return profile;
}

/**
 * Every page, server action and route handler goes through this.
 * auth() verifies the session JWT locally (no network). Add these claims in
 * Clerk Dashboard → Sessions → Customize session token to skip the API call entirely:
 *   { "email": "{{user.primary_email_address}}", "name": "{{user.first_name}}" }
 */
export const requireUser = cache(async () => {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  const claims = sessionClaims as { email?: string; name?: string } | null;
  const profile: Profile = claims?.email
    ? { email: claims.email.toLowerCase(), name: claims.name || claims.email.split("@")[0] }
    : await loadProfile(userId);

  const allowed = allowedEmails();
  if (allowed.length > 0 && !allowed.includes(profile.email)) redirect("/not-allowed");

  return { id: userId, ...profile };
});
