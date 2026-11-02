import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProductEditor from "@/components/product/ProductEditor";
import type { ProductDTO } from "@/components/product/types";

const getProduct = cache((slug: string) =>
  prisma.product.findFirst({
    where: { slug, active: true },
    include: {
      category: true,
      variants: { orderBy: { id: "asc" } },
      zones: { orderBy: { sortOrder: "asc" } },
    },
  })
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product?.name ?? "Product" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, session] = await Promise.all([getProduct(slug), auth()]);

  if (!product || product.variants.length === 0 || product.zones.length === 0) {
    notFound();
  }

  const dto: ProductDTO = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    basePrice: Number(product.basePrice),
    categorySlug: product.category.slug,
    zones: product.zones.map((z) => ({
      id: z.id,
      key: z.key,
      label: z.label,
      view: z.view === "back" ? "back" : "front",
      kind: z.kind,
      x: z.x,
      y: z.y,
      w: z.w,
      h: z.h,
      widthIn: z.widthIn,
      heightIn: z.heightIn,
      fee: Number(z.fee),
    })),
    variants: product.variants.map((v) => ({
      id: v.id,
      color: v.color,
      colorHex: v.colorHex,
      size: v.size,
      priceDelta: Number(v.priceDelta),
      available: v.available,
    })),
  };

  return (
    <div className="container product-page">
      <Link href="/#products" className="back-link">
        Back to products
      </Link>
      <ProductEditor product={dto} loggedIn={!!session?.user} />
    </div>
  );
}