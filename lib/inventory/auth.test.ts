import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canManageInventory } from "./auth";

describe("inventory auth", () => {
  it("canManageInventory allows super_admin", () => {
    assert.equal(
      canManageInventory({ user: { role: "super_admin", permissions: [] } } as never),
      true
    );
  });

  it("canManageInventory allows org_admin without explicit permission", () => {
    assert.equal(
      canManageInventory({ user: { role: "org_admin", permissions: [] } } as never),
      true
    );
  });

  it("canManageInventory requires inventory permission for team roles", () => {
    assert.equal(
      canManageInventory({ user: { role: "counsellor", permissions: [] } } as never),
      false
    );
    assert.equal(
      canManageInventory({ user: { role: "counsellor", permissions: ["inventory"] } } as never),
      true
    );
  });
});
