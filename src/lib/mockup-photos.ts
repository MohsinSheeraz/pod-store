import type { Shape } from "@/components/product/ProductSilhouette";

// Photo mockups: a plain white garment photographed on a model or flat. A shopper's prints are
// placed into the "areas" below (pixels of the 1024 x 1024 photo), where the matching print area
// of the product lands on the real garment.
//
// To use your own photos, replace the files in /public/mockups with plain garments (any colour
// is fine, white tints best) and adjust the areas.

export type Box = { x: number; y: number; w: number; h: number };

export type PhotoTemplate = {
  id: string;
  label: string;
  src: string;
  size: number;
  // print area key -> where it lands on the photo
  areas: Record<string, Box>;
  // Rough rectangles around the garment. Tinting a coloured variant only touches pixels
  // inside these, so the background keeps its own colour.
  hull: Box[];
  // The garment outline, drawn a few pixels inside its real edge. Everything inside is tinted
  // (creases included); skin, jeans and hair are skipped by colour.
  outline: [number, number][];
};

const S = 1024;

export const PHOTO_MOCKUPS: Partial<Record<Shape, PhotoTemplate[]>> = {
  tee: [
    {
      id: "model-front",
      label: "On model · front",
      src: "/mockups/tee-model-front.webp",
      size: S,
      areas: {
        front: { x: 390, y: 345, w: 230, h: 268 },
        monogram: { x: 553, y: 352, w: 67, h: 66 },
      },
      hull: [
        { x: 340, y: 255, w: 330, h: 610 },
        { x: 255, y: 320, w: 115, h: 230 },
        { x: 650, y: 320, w: 115, h: 230 },
      ],
      outline: [[430,275],[322,345],[272,510],[366,528],[354,850],[656,850],[646,528],[748,500],[696,345],[592,272]],
    },
    {
      id: "model-back",
      label: "On model · back",
      src: "/mockups/tee-model-back.webp",
      size: S,
      areas: { back: { x: 395, y: 315, w: 230, h: 268 } },
      hull: [
        { x: 345, y: 255, w: 335, h: 620 },
        { x: 255, y: 320, w: 115, h: 230 },
        { x: 650, y: 320, w: 115, h: 230 },
      ],
      outline: [[438,268],[326,345],[272,510],[366,528],[360,860],[666,860],[646,528],[748,505],[698,348],[588,268]],
    },
    {
      id: "flat",
      label: "Flat",
      src: "/mockups/tee-flat.webp",
      size: S,
      areas: {
        front: { x: 335, y: 255, w: 354, h: 413 },
        monogram: { x: 548, y: 262, w: 103, h: 100 },
      },
      hull: [{ x: 30, y: 50, w: 960, h: 940 }],
      outline: [[418,82],[238,158],[66,303],[178,438],[224,414],[232,895],[796,895],[804,414],[846,438],[956,310],[790,158],[606,82]],
    },
  ],
  hoodie: [
    {
      id: "model-front",
      label: "On model · front",
      src: "/mockups/hoodie-model-front.webp",
      size: S,
      areas: {
        front: { x: 385, y: 343, w: 240, h: 262 },
        monogram: { x: 560, y: 340, w: 62, h: 66 },
      },
      hull: [{ x: 235, y: 200, w: 545, h: 680 }],
      outline: [[436,218],[590,218],[622,245],[626,298],[706,345],[765,795],[735,862],[692,858],[670,846],[345,846],[325,858],[266,866],[250,772],[306,356],[386,300],[405,240]],
    },
    {
      id: "model-back",
      label: "On model · back",
      src: "/mockups/hoodie-model-back.webp",
      size: S,
      areas: { back: { x: 395, y: 395, w: 235, h: 274 } },
      hull: [{ x: 270, y: 215, w: 490, h: 660 }],
      outline: [[404,232],[592,232],[626,305],[706,356],[745,795],[718,844],[690,842],[668,848],[358,848],[326,842],[296,840],[284,782],[310,358],[388,306]],
    },
    {
      id: "flat",
      label: "Flat",
      src: "/mockups/hoodie-flat.webp",
      size: S,
      areas: {
        front: { x: 385, y: 322, w: 255, h: 278 },
        monogram: { x: 565, y: 320, w: 70, h: 72 },
      },
      hull: [{ x: 110, y: 10, w: 800, h: 960 }],
      outline: [[512,32],[420,60],[362,170],[372,238],[268,312],[140,600],[135,910],[190,936],[262,870],[282,905],[715,905],[745,870],[815,935],[880,925],[890,610],[760,320],[650,240],[660,180],[600,60]],
    },
  ],
};
