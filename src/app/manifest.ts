import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tirumala Plastics",
    short_name: "Tirumala",
    description: "Daily register for loads, salaries and expenses",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf8f0",
    theme_color: "#6b1a0e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
