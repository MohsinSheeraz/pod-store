import { test } from "node:test";
import assert from "node:assert/strict";
import { ORDER_STATUSES, canCancel, isOrderStatus, orderItemViews, orderRef, type OrderItemWithPrints } from "@/lib/order-views";

test("a shopper can cancel only until production starts", () => {
  assert.equal(canCancel("PENDING"), true);
  assert.equal(canCancel("PAID"), true);
  for (const s of ["IN_PRODUCTION", "SHIPPED", "DELIVERED", "CANCELLED"]) {
    assert.equal(canCancel(s), false, s);
  }
});

test("isOrderStatus accepts every status and nothing else", () => {
  for (const s of ORDER_STATUSES) assert.equal(isOrderStatus(s), true);
  assert.equal(isOrderStatus("BOGUS"), false);
  assert.equal(isOrderStatus(undefined), false);
  assert.equal(isOrderStatus(3), false);
});

test("orderRef is a short upper-case reference", () => {
  assert.equal(orderRef("cmwj8y4kv0003uvpwa0zcbzuv"), "#A0ZCBZUV");
});

const print = (over: Record<string, unknown>) =>
  ({
    id: "p",
    orderItemId: "i",
    zoneLabel: "Front",
    kind: "IMAGE",
    view: "front",
    zoneX: 28,
    zoneY: 27,
    zoneW: 44,
    zoneH: 42,
    designId: null,
    designImageUrl: null,
    text: null,
    font: null,
    color: null,
    placement: { x: 0.5, y: 0.5, scale: 0.5, rotation: 0 },
    fee: 0,
    ...over,
  }) as unknown as OrderItemWithPrints["prints"][number];

test("orderItemViews groups prints by view and keeps design and text apart", () => {
  const item = {
    prints: [
      print({ id: "a", designImageUrl: "/designs/x.svg" }),
      print({
        id: "b",
        kind: "TEXT",
        text: "HI",
        font: "pacifico",
        color: "#FFFFFF",
        placement: { x: 0.5, y: 0.5, scale: 0.4, rotation: 0, curve: 40, bold: true, italic: false },
      }),
      print({ id: "c", view: "back", designImageUrl: "/designs/y.svg" }),
      print({ id: "d", view: "left" }), // nothing to draw: dropped
    ],
  } as unknown as OrderItemWithPrints;

  const views = orderItemViews(item);
  assert.deepEqual(views.map((v) => v.view), ["front", "back"]);
  const front = views[0].zones;
  assert.equal(front.length, 2);
  assert.equal(front[0].layer.kind, "image");
  assert.equal(front[1].layer.kind, "text");
  if (front[1].layer.kind === "text") {
    assert.equal(front[1].layer.font, "pacifico");
    assert.equal(front[1].layer.style.curve, 40);
    assert.equal(front[1].layer.style.bold, true);
  }
});
