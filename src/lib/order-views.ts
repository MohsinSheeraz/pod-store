import type { Prisma } from "@prisma/client";
import { asFont, asPlacement, asTextStyle } from "@/lib/cart";
import type { ExportView } from "@/lib/mockup-export";
import type { ViewKey } from "@/components/product/types";

export type OrderStatusKey = "PENDING" | "PAID" | "IN_PRODUCTION" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export const ORDER_STATUSES: OrderStatusKey[] = [
  "PENDING",
  "PAID",
  "IN_PRODUCTION",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export const ORDER_STATUS_LABEL: Record<OrderStatusKey, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  IN_PRODUCTION: "In production",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const isOrderStatus = (v: unknown): v is OrderStatusKey =>
  typeof v === "string" && (ORDER_STATUSES as string[]).includes(v);

// A shopper may still cancel until the order goes into production.
export const canCancel = (status: string) => status === "PENDING" || status === "PAID";

/** Short, readable reference for an order id. */
export const orderRef = (id: string) => `#${id.slice(-8).toUpperCase()}`;

export type OrderItemWithPrints = Prisma.OrderItemGetPayload<{ include: { prints: true } }>;

const VIEWS: ViewKey[] = ["front", "back", "left", "right"];

/** The prints of an order item, grouped by the mockup view they appear on. */
export function orderItemViews(item: OrderItemWithPrints): ExportView[] {
  return VIEWS.map((view) => ({
    view,
    zones: item.prints
      .filter((p) => p.view === view && (p.text || p.designImageUrl))
      .map((p) => ({
        key: undefined,
        x: p.zoneX,
        y: p.zoneY,
        w: p.zoneW,
        h: p.zoneH,
        layer: p.text
          ? {
              kind: "text" as const,
              text: p.text,
              font: asFont(p.font),
              color: p.color ?? "#14161B",
              style: asTextStyle(p.placement),
              placement: asPlacement(p.placement),
            }
          : {
              kind: "image" as const,
              imageUrl: p.designImageUrl as string,
              placement: asPlacement(p.placement),
            },
      })),
  })).filter((v) => v.zones.length > 0);
}
