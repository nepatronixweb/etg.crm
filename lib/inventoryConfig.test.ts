import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeInventoryCategories,
  normalizeInventoryUnits,
  isInventoryCategoryAllowed,
  inventoryCategoryLabel,
  DEFAULT_INVENTORY_CATEGORIES,
} from "./inventoryConfig";

describe("inventoryConfig", () => {
  it("normalizeInventoryCategories returns defaults when empty", () => {
    const cats = normalizeInventoryCategories([]);
    assert.equal(cats.length, DEFAULT_INVENTORY_CATEGORIES.length);
    assert.equal(cats[0]?.slug, "electronics");
  });

  it("normalizeInventoryCategories dedupes slugs", () => {
    const cats = normalizeInventoryCategories([
      { slug: "electronics", label: "Electronics" },
      { slug: "electronics", label: "Dup" },
    ]);
    assert.equal(cats.length, 1);
  });

  it("normalizeInventoryUnits returns defaults when empty", () => {
    assert.deepEqual(normalizeInventoryUnits(null), normalizeInventoryUnits(undefined));
    assert.ok(normalizeInventoryUnits([]).includes("pcs"));
  });

  it("isInventoryCategoryAllowed accepts legacy slugs", () => {
    const cats = normalizeInventoryCategories([{ slug: "marketing", label: "Marketing" }]);
    assert.equal(isInventoryCategoryAllowed("furniture", cats), true);
    assert.equal(isInventoryCategoryAllowed("marketing", cats), true);
    assert.equal(isInventoryCategoryAllowed("unknown_xyz", cats), false);
  });

  it("inventoryCategoryLabel resolves label", () => {
    const cats = [{ slug: "visa_supplies", label: "Visa supplies" }];
    assert.equal(inventoryCategoryLabel("visa_supplies", cats), "Visa supplies");
  });
});
