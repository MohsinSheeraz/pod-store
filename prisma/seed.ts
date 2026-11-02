import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedZone = {
  key: string;
  label: string;
  view: "front" | "back";
  kind?: "IMAGE" | "TEXT";
  x: number;
  y: number;
  w: number;
  h: number;
  widthIn: number;
  heightIn: number;
  fee?: number;
};

type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
  zones: SeedZone[];
  colors: { name: string; hex: string }[];
  sizes: { name: string; delta: number }[];
};

const categories = [
  { name: "Apparel", slug: "apparel" },
  { name: "Drinkware", slug: "drinkware" },
  { name: "Bags", slug: "bags" },
  { name: "Wall art", slug: "wall-art" },
];

const tshirtSizes = [
  { name: "S", delta: 0 },
  { name: "M", delta: 0 },
  { name: "L", delta: 0 },
  { name: "XL", delta: 0 },
  { name: "XXL", delta: 2 },
];

// Fees: back +4, sleeve +2.50, monogram +3. Change them here.
const teeZones: SeedZone[] = [
  { key: "front", label: "Front", view: "front", x: 28, y: 25, w: 44, h: 42, widthIn: 12, heightIn: 14 },
  { key: "back", label: "Back", view: "back", x: 27, y: 22, w: 46, h: 46, widthIn: 12, heightIn: 14, fee: 4 },
  { key: "right-sleeve", label: "Right sleeve", view: "front", x: 8.5, y: 22, w: 9, h: 8.5, widthIn: 3, heightIn: 3, fee: 2.5 },
  { key: "left-sleeve", label: "Left sleeve", view: "front", x: 82.5, y: 22, w: 9, h: 8.5, widthIn: 3, heightIn: 3, fee: 2.5 },
  { key: "monogram", label: "Monogram", view: "front", kind: "TEXT", x: 40, y: 76, w: 20, h: 8, widthIn: 3.5, heightIn: 1.5, fee: 3 },
];

const hoodieZones: SeedZone[] = [
  { key: "front", label: "Front", view: "front", x: 30, y: 38, w: 40, h: 32, widthIn: 11, heightIn: 12 },
  { key: "back", label: "Back", view: "back", x: 28, y: 26, w: 44, h: 46, widthIn: 12, heightIn: 14, fee: 4.5 },
  { key: "right-sleeve", label: "Right sleeve", view: "front", x: 10.5, y: 27, w: 9, h: 8.5, widthIn: 3, heightIn: 3, fee: 2.5 },
  { key: "left-sleeve", label: "Left sleeve", view: "front", x: 80.5, y: 27, w: 9, h: 8.5, widthIn: 3, heightIn: 3, fee: 2.5 },
  { key: "monogram", label: "Monogram", view: "front", kind: "TEXT", x: 42, y: 72, w: 16, h: 6, widthIn: 3, heightIn: 1.2, fee: 3 },
];

const products: SeedProduct[] = [
  {
    slug: "classic-tee",
    name: "Classic Tee",
    description:
      "Midweight 100% ring-spun cotton with a relaxed fit. Direct-to-garment print that stays soft after washing.",
    basePrice: 22,
    category: "apparel",
    zones: teeZones,
    colors: [
      { name: "Chalk", hex: "#F1F0EC" },
      { name: "Ink", hex: "#1B1D23" },
      { name: "Navy", hex: "#22305A" },
      { name: "Stone", hex: "#B9BDC6" },
      { name: "Sage", hex: "#9CB19A" },
    ],
    sizes: tshirtSizes,
  },
  {
    slug: "pullover-hoodie",
    name: "Pullover Hoodie",
    description:
      "Heavyweight fleece hoodie with a lined hood and kangaroo pocket. Print on the chest, back, or sleeves.",
    basePrice: 42,
    category: "apparel",
    zones: hoodieZones,
    colors: [
      { name: "Chalk", hex: "#F1F0EC" },
      { name: "Ink", hex: "#1B1D23" },
      { name: "Navy", hex: "#22305A" },
    ],
    sizes: tshirtSizes,
  },
  {
    slug: "ceramic-mug",
    name: "Ceramic Mug",
    description:
      "11 oz glossy ceramic mug, dishwasher and microwave safe. Your artwork prints on one side.",
    basePrice: 14,
    category: "drinkware",
    zones: [
      { key: "side", label: "Print area", view: "front", x: 30, y: 33, w: 40, h: 38, widthIn: 4, heightIn: 3.5 },
    ],
    colors: [{ name: "White", hex: "#FFFFFF" }],
    sizes: [{ name: "11 oz", delta: 0 }],
  },
  {
    slug: "canvas-tote",
    name: "Canvas Tote",
    description:
      "Sturdy 12 oz cotton canvas tote with reinforced handles and room for a large, centered print on each side.",
    basePrice: 18,
    category: "bags",
    zones: [
      { key: "front", label: "Front", view: "front", x: 28, y: 45, w: 44, h: 38, widthIn: 11, heightIn: 11 },
      { key: "back", label: "Back", view: "back", x: 28, y: 45, w: 44, h: 38, widthIn: 11, heightIn: 11, fee: 3 },
    ],
    colors: [
      { name: "Natural", hex: "#E6DCC8" },
      { name: "Ink", hex: "#1B1D23" },
    ],
    sizes: [{ name: "One size", delta: 0 }],
  },
  {
    slug: "art-poster",
    name: "Art Poster",
    description:
      "Museum-weight matte paper with archival inks. Printed edge to edge, ships rolled in a tube.",
    basePrice: 16,
    category: "wall-art",
    zones: [
      { key: "poster", label: "Poster", view: "front", x: 15, y: 7, w: 70, h: 86, widthIn: 18, heightIn: 23 },
    ],
    colors: [{ name: "White", hex: "#FFFFFF" }],
    sizes: [
      { name: "18 × 24 in", delta: 0 },
      { name: "24 × 36 in", delta: 10 },
    ],
  },
];

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-123";
  const hashed = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: "admin@pressroom.test" },
    update: {},
    create: { name: "Admin", email: "admin@pressroom.test", password: hashed, role: "ADMIN" },
  });

  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: { name: c.name }, create: c });
  }

  for (const p of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.category } });

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        categoryId: category.id,
      },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        categoryId: category.id,
      },
    });

    for (const [i, z] of p.zones.entries()) {
      const data = {
        label: z.label,
        view: z.view,
        kind: z.kind ?? "IMAGE",
        x: z.x,
        y: z.y,
        w: z.w,
        h: z.h,
        widthIn: z.widthIn,
        heightIn: z.heightIn,
        fee: z.fee ?? 0,
        sortOrder: i,
      } as const;

      await prisma.printZone.upsert({
        where: { productId_key: { productId: product.id, key: z.key } },
        update: data,
        create: { productId: product.id, key: z.key, ...data },
      });
    }

    for (const color of p.colors) {
      for (const size of p.sizes) {
        await prisma.productVariant.upsert({
          where: {
            productId_color_size: { productId: product.id, color: color.name, size: size.name },
          },
          update: { colorHex: color.hex, priceDelta: size.delta },
          create: {
            productId: product.id,
            color: color.name,
            colorHex: color.hex,
            size: size.name,
            priceDelta: size.delta,
          },
        });
      }
    }
  }

  console.log("Seeded. Admin login: admin@pressroom.test /", adminPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });