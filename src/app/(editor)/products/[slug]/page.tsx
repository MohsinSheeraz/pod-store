import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProductEditor from "@/components/product/ProductEditor";
import type { DesignDTO, ProductDTO, ViewKey } from "@/components/product/types";

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
  const userId = session?.user?.id;

  const toDesign = (d: { id: string; name: string; imageUrl: string }): DesignDTO => ({
    id: d.id,
    name: d.name,
    imageUrl: d.imageUrl,
  });
  // Ready-made catalog art, plus whatever this shopper uploaded before.
  const [catalog, mine] = await Promise.all([
    prisma.design.findMany({ where: { isCatalog: true }, orderBy: { createdAt: "asc" }, take: 48 }),
    userId
      ? prisma.design.findMany({
          where: { ownerId: userId, isCatalog: false },
          orderBy: { createdAt: "desc" },
          take: 24,
        })
      : Promise.resolve([]),
  ]);

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
      view: (["back", "left", "right"].includes(z.view) ? z.view : "front") as ViewKey,
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
    <ProductEditor
      product={dto}
      loggedIn={!!session?.user}
      catalog={catalog.map(toDesign)}
      mine={mine.map(toDesign)}
    />
  );
}
