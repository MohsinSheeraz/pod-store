import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private or useless to search engines
        disallow: ["/api/", "/admin", "/cart", "/checkout", "/orders", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
