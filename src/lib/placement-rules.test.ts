import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONTAIN_TOLERANCE,
  constrainPlacement,
  estimateUnitBox,
  isContained,
  layerKindAllowed,
  scaleLimit,
  usableZones,
  validatePlacement,
  zoneFrame,
  zoneProblem,
  zoneRole,
  type ZoneLike,
} from "@/lib/placement-rules";

// Same shapes as prisma/seed.ts
const teeMonogram: ZoneLike = { key: "monogram", label: "Left chest monogram", view: "front", kind: "TEXT", x: 54, y: 22, w: 14, h: 13 };
const teeFront: ZoneLike = { key: "front", label: "Front", view: "front", kind: "IMAGE", x: 28, y: 25, w: 44, h: 42 };
const leftSleeve: ZoneLike = { key: "left-sleeve", label: "Left sleeve", view: "front", kind: "IMAGE", x: 82.5, y: 22, w: 9, h: 8.5 };
const rightSleeve: ZoneLike = { key: "right-sleeve", label: "Right sleeve", view: "front", kind: "IMAGE", x: 8.5, y: 22, w: 9, h: 8.5 };
// The pre-fix monogram zone: bottom center of the garment.
const oldCenterMonogram: ZoneLike = { key: "monogram", label: "Monogram", view: "front", kind: "TEXT", x: 40, y: 76, w: 20, h: 8 };

const centered = { x: 0.5, y: 0.5, scale: 0.5, rotation: 0 };
const text3 = { kind: "text", chars: 3 } as const;

test("monogram zones are left-chest zones", () => {
  assert.equal(zoneRole(teeMonogram), "left-chest");
  assert.equal(zoneRole({ key: "left-chest", kind: "IMAGE" }), "left-chest");
  assert.equal(zoneRole(leftSleeve), "left");
  assert.equal(zoneRole(rightSleeve), "right");
  assert.equal(zoneRole(teeFront), "free");
});

test("seeded monogram zone sits on the wearer's left chest (right side of the front view)", () => {
  assert.equal(zoneProblem(teeMonogram), null);
  assert.ok(teeMonogram.x >= 50, "must be entirely on the right-hand half of the front mockup");
});

test("a monogram zone at the center of the garment is rejected", () => {
  assert.match(zoneProblem(oldCenterMonogram) ?? "", /left chest/);
  const straddlesCenter = { ...teeMonogram, x: 43 };
  assert.match(zoneProblem(straddlesCenter) ?? "", /not the center/);
  const touchingCenterOnWrongSide = { ...teeMonogram, x: 30 };
  assert.ok(zoneProblem(touchingCenterOnWrongSide));
});

test("a mirrored monogram zone (wearer's right) is rejected", () => {
  assert.ok(zoneProblem({ ...teeMonogram, x: 28 }));
});

test("a monogram zone low on the garment or on the back view is rejected", () => {
  assert.match(zoneProblem({ ...teeMonogram, y: 60 }) ?? "", /upper chest/);
  assert.match(zoneProblem({ ...teeMonogram, view: "back" }) ?? "", /front view/);
});

test("zones that run off the mockup or have bad numbers are rejected", () => {
  assert.ok(zoneProblem({ ...teeMonogram, x: 90 }));
  assert.ok(zoneProblem({ ...teeMonogram, w: 0 }));
  assert.ok(zoneProblem({ ...teeMonogram, y: Number.NaN }));
});

test("left/right sleeves follow the wearer's orientation in both views", () => {
  assert.equal(zoneProblem(leftSleeve), null);
  assert.equal(zoneProblem(rightSleeve), null);
  assert.ok(zoneProblem({ ...leftSleeve, x: 8.5 }), "left sleeve drawn on the screen-left is mirrored");
  assert.ok(zoneProblem({ ...rightSleeve, x: 82.5 }));
  // Back view mirrors: wearer's left is the left-hand side.
  assert.equal(zoneProblem({ ...leftSleeve, view: "back", x: 8.5 }), null);
  assert.ok(zoneProblem({ ...leftSleeve, view: "back" }));
});

test("existing valid zones are preserved by usableZones", () => {
  const all = [teeFront, teeMonogram, leftSleeve, rightSleeve, oldCenterMonogram];
  assert.deepEqual(
    usableZones(all).map((z) => z.label),
    ["Front", "Left chest monogram", "Left sleeve", "Right sleeve"]
  );
});

test("text only goes in the monogram zone, artwork only in image zones", () => {
  assert.equal(layerKindAllowed(teeMonogram, "text"), true);
  assert.equal(layerKindAllowed(teeMonogram, "image"), false);
  assert.equal(layerKindAllowed(teeFront, "image"), true);
  assert.equal(layerKindAllowed(teeFront, "text"), false);
});

test("validatePlacement accepts a monogram inside the left-chest zone", () => {
  assert.equal(validatePlacement(teeMonogram, text3, centered), null);
});

test("validatePlacement rejects a perfect placement in a center-garment monogram zone", () => {
  const err = validatePlacement(oldCenterMonogram, text3, { ...centered, scale: 0.2 });
  assert.match(err ?? "", /left chest/);
});

test("validatePlacement rejects text in an image zone and artwork in the monogram zone", () => {
  assert.match(validatePlacement(teeFront, text3, centered) ?? "", /only takes artwork/);
  assert.match(
    validatePlacement(teeMonogram, { kind: "image", aspect: 1 }, centered) ?? "",
    /only takes text/
  );
});

test("validatePlacement rejects prints dragged outside the zone", () => {
  const spec = { kind: "image", aspect: 1 } as const;
  assert.match(validatePlacement(teeFront, spec, { x: 1, y: 0.5, scale: 0.5, rotation: 0 }) ?? "", /inside/);
  assert.match(validatePlacement(teeFront, spec, { x: -0.2, y: 0.5, scale: 0.2, rotation: 0 }) ?? "", /inside/);
  assert.match(validatePlacement(teeFront, spec, { x: 0.5, y: 1.4, scale: 0.2, rotation: 0 }) ?? "", /inside/);
});

test("validatePlacement rejects oversized and NaN placements", () => {
  const spec = { kind: "image", aspect: 1 } as const;
  assert.ok(validatePlacement(teeFront, spec, { x: 0.5, y: 0.5, scale: 3, rotation: 0 }));
  assert.ok(validatePlacement(teeFront, spec, { x: Number.NaN, y: 0.5, scale: 0.5, rotation: 0 }));
  assert.ok(validatePlacement(teeFront, spec, { x: 0.5, y: 0.5, scale: Number.NaN, rotation: 0 }));
});

test("boundary: touching the edge is valid, slightly past tolerance is not", () => {
  const unit = { w: 100, h: 50 };
  const frame = { w: 200, h: 100 };
  // At scale 1 the layer is 100x50 px => half extents 0.25 x 0.25 of the zone.
  const edge = { x: 0.25, y: 0.75, scale: 1, rotation: 0 };
  assert.equal(isContained(edge, unit, frame), true);
  assert.equal(isContained({ ...edge, x: 0.25 - CONTAIN_TOLERANCE / 2 }, unit, frame), true);
  assert.equal(isContained({ ...edge, x: 0.25 - CONTAIN_TOLERANCE * 2 }, unit, frame), false);
});

test("a rotated layer needs more room", () => {
  const frame = { w: 100, h: 100 };
  const flat = { x: 0.5, y: 0.5, scale: 1, rotation: 0 };
  // A wide strip fits flat and turned on its side, which is exactly the zone height.
  const strip = { w: 100, h: 20 };
  assert.equal(isContained(flat, strip, frame), true);
  assert.equal(isContained({ ...flat, rotation: 90 }, strip, frame), true);
  // A square that fills the zone sticks out of its corners once it is turned 45 degrees.
  const square = { w: 100, h: 100 };
  assert.equal(isContained(flat, square, frame), true);
  assert.equal(isContained({ ...flat, rotation: 45 }, square, frame), false);
});

test("constrainPlacement pulls a dragged layer back inside and is idempotent", () => {
  const unit = { w: 80, h: 40 };
  const frame = { w: 200, h: 200 };
  const dragged = { x: 1.3, y: -0.4, scale: 1, rotation: 0 };
  const fixed = constrainPlacement(dragged, unit, frame);
  assert.equal(isContained(fixed, unit, frame), true);
  assert.equal(fixed.x, 1 - 0.2); // half width = 80/2/200
  assert.equal(fixed.y, 0.1); // half height = 40/2/200
  assert.equal(constrainPlacement(fixed, unit, frame), fixed);
});

test("constrainPlacement shrinks a layer that is too big and returns the same object when valid", () => {
  const unit = { w: 100, h: 100 };
  const frame = { w: 100, h: 100 };
  const huge = { x: 0.5, y: 0.5, scale: 2.5, rotation: 0 };
  const fixed = constrainPlacement(huge, unit, frame);
  assert.equal(fixed.scale, 1);
  assert.equal(isContained(fixed, unit, frame), true);

  const fine = { x: 0.5, y: 0.5, scale: 0.4, rotation: 0 };
  assert.equal(constrainPlacement(fine, unit, frame), fine);
});

test("rotating a layer that no longer fits shrinks it instead of cutting it off", () => {
  const unit = { w: 100, h: 100 };
  const frame = { w: 100, h: 100 };
  const rotated = constrainPlacement({ x: 0.5, y: 0.5, scale: 1, rotation: 45 }, unit, frame);
  assert.ok(rotated.scale < 1);
  assert.equal(isContained(rotated, unit, frame), true);
  assert.ok(Math.abs(rotated.scale - scaleLimit(unit, 45, frame)) < 1e-9);
});

test("an unmeasured layer is left alone", () => {
  const p = { x: 2, y: 2, scale: 1, rotation: 0 };
  assert.equal(constrainPlacement(p, { w: 0, h: 0 }, { w: 100, h: 100 }), p);
});

test("a monogram sized for the zone stays valid, one that is too wide is rejected", () => {
  const frame = zoneFrame(teeMonogram);
  const unit = estimateUnitBox(teeMonogram, text3);
  const limit = scaleLimit(unit, 0, frame);
  assert.ok(limit > 0.1);
  assert.equal(validatePlacement(teeMonogram, text3, { ...centered, scale: limit * 0.95 }), null);
  assert.ok(validatePlacement(teeMonogram, text3, { ...centered, scale: limit * 1.5 }));
});