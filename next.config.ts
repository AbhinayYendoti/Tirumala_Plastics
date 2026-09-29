import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Re-use recently visited pages from the client cache for 30s, so hopping
    // between tabs is instant. Every save calls revalidatePath, which clears it.
    staleTimes: { dynamic: 30 },
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
