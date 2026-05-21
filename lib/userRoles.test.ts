import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeDefaultPermissionsForRoles,
  resolveUserRoles,
  resolvePrimaryRole,
  resolveEffectiveRole,
  resolvePrimaryFromSelection,
  userHasRole,
  validateUserRolesSelection,
  toggleUserRolesSelection,
  pickDefaultCreatableRole,
  MAX_USER_ROLES,
} from "./userRoles";

const AVAILABLE = [
  "super_admin",
  "org_admin",
  "counsellor",
  "telecaller",
  "front_desk",
  "application_team",
];

describe("userRoles", () => {
  it("resolveUserRoles unions roles array and legacy role field", () => {
    assert.deepEqual(resolveUserRoles({ role: "telecaller", roles: ["counsellor"] }), [
      "counsellor",
      "telecaller",
    ]);
  });

  it("resolveUserRoles falls back to legacy role only", () => {
    assert.deepEqual(resolveUserRoles({ role: "counsellor", roles: [] }), ["counsellor"]);
  });

  it("resolvePrimaryRole uses stored role field when in roles list", () => {
    assert.equal(
      resolvePrimaryRole({ role: "counsellor", roles: ["telecaller", "counsellor"], activeRole: "telecaller" }),
      "counsellor"
    );
  });

  it("resolveEffectiveRole uses activeRole when valid", () => {
    assert.equal(
      resolveEffectiveRole({ role: "counsellor", roles: ["counsellor", "telecaller"], activeRole: "telecaller" }),
      "telecaller"
    );
  });

  it("userHasRole checks merged roles", () => {
    assert.equal(userHasRole({ role: "counsellor", roles: ["telecaller"] }, "telecaller"), true);
  });

  it("mergeDefaultPermissionsForRoles unions permissions", () => {
    const merged = mergeDefaultPermissionsForRoles(["a", "b"], (slug) =>
      slug === "a" ? ["leads", "chat"] : ["students", "chat"]
    );
    assert.deepEqual(merged.sort(), ["chat", "leads", "students"]);
  });

  it("validateUserRolesSelection rejects super_admin combined with others", () => {
    assert.match(validateUserRolesSelection(["super_admin", "counsellor"]) ?? "", /cannot be combined/i);
  });

  it("validateUserRolesSelection allows org_admin with team roles", () => {
    assert.equal(validateUserRolesSelection(["org_admin", "counsellor"]), null);
  });

  it("pickDefaultCreatableRole prefers counsellor over org_admin", () => {
    assert.equal(pickDefaultCreatableRole(["org_admin", "counsellor", "telecaller"]), "counsellor");
  });

  it("toggleUserRolesSelection adds multiple team roles", () => {
    let roles = ["counsellor"];
    const a = toggleUserRolesSelection(roles, "telecaller", AVAILABLE);
    assert.equal(a.changed, true);
    roles = a.roles;
    const b = toggleUserRolesSelection(roles, "front_desk", AVAILABLE);
    assert.deepEqual(b.roles.sort(), ["counsellor", "front_desk", "telecaller"].sort());
  });

  it("toggleUserRolesSelection allows org_admin + team roles", () => {
    const r = toggleUserRolesSelection(["org_admin"], "counsellor", AVAILABLE);
    assert.deepEqual(r.roles.sort(), ["counsellor", "org_admin"].sort());
  });

  it("toggleUserRolesSelection enforces super_admin solo", () => {
    const r = toggleUserRolesSelection(["counsellor", "telecaller"], "super_admin", AVAILABLE);
    assert.deepEqual(r.roles, ["super_admin"]);
  });

  it("toggleUserRolesSelection exits super_admin back to counsellor default", () => {
    const r = toggleUserRolesSelection(["super_admin"], "super_admin", AVAILABLE);
    assert.equal(r.roles.includes("super_admin"), false);
    assert.equal(r.roles[0], "counsellor");
  });

  it("toggleUserRolesSelection blocks adding beyond MAX_USER_ROLES", () => {
    const full = ["org_admin", "counsellor", "telecaller", "front_desk"];
    assert.equal(full.length, MAX_USER_ROLES);
    const r = toggleUserRolesSelection(full, "application_team", AVAILABLE);
    assert.equal(r.changed, false);
    assert.deepEqual(r.roles, full);
  });

  it("toggleUserRolesSelection can remove a role when multiple selected", () => {
    const r = toggleUserRolesSelection(["counsellor", "telecaller"], "telecaller", AVAILABLE);
    assert.deepEqual(r.roles, ["counsellor"]);
  });

  it("resolvePrimaryFromSelection keeps primary when still assigned", () => {
    assert.equal(resolvePrimaryFromSelection(["counsellor", "telecaller"], "telecaller"), "telecaller");
  });

  it("resolvePrimaryFromSelection falls back when primary removed", () => {
    assert.equal(resolvePrimaryFromSelection(["counsellor"], "telecaller"), "counsellor");
  });
});
