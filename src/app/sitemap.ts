import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const fixed = ["", "/terms", "/privacy", "/shipping", "/returns"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.3,
  }));

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { slug: true, createdAt: true },
    });
    return [
      ...fixed,
      ...products.map((p) => ({
        url: `${base}/products/${p.slug}`,
        lastModified: p.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return fixed; // database unreachable: still serve the fixed pages
  }
}
