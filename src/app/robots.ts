import type { MetadataRoute } from "next";

// Private business register: no search engine should crawl it.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
