export type ViewKey = "front" | "back";
export type ZoneKind = "IMAGE" | "TEXT";
export type FontKey = "sans" | "display" | "serif";

export type ZoneDTO = {
  id: string;
  key: string;
  label: string;
  view: ViewKey;
  kind: ZoneKind;
  // percent of the 400 x 420 mockup
  x: number;
  y: number;
  w: number;
  h: number;
  widthIn: number;
  heightIn: number;
  fee: number;
};

export type VariantDTO = {
  id: string;
  color: string;
  colorHex: string;
  size: string;
  priceDelta: number;
  available: boolean;
};

export type ProductDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  categorySlug: string;
  zones: ZoneDTO[];
  variants: VariantDTO[];
};

// x, y: center of the layer as a fraction (0 to 1) of the zone.
// scale: image width as a fraction of zone width; for text, a relative font size.
export type Placement = { x: number; y: number; scale: number; rotation: number };

export type DesignDTO = { id: string; name: string; imageUrl: string };

export type ImageLayer = {
  kind: "image";
  design: DesignDTO;
  aspect: number;
  pixelW: number;
  placement: Placement;
};

export type TextLayer = {
  kind: "text";
  text: string;
  font: FontKey;
  color: string;
  placement: Placement;
};

export type Layer = ImageLayer | TextLayer;