import type { NextConfig } from "next";

// Sent with every response. The app is private and never embedded elsewhere.
const securityHeaders = [
  // SAMEORIGIN: other sites can never embed the app; the app itself may (e.g. layout checks).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Internal register: keep it out of Google even if the link leaks.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  // `npm run dev` and `npm run build` write to different folders, so running the dev
  // server can never corrupt a production build (and vice versa). Vercel still uses .next.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Re-use recently visited pages from the client cache for 30s, so hopping
    // between tabs is instant. Every save calls revalidatePath, which clears it.
    staleTimes: { dynamic: 30 },
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
