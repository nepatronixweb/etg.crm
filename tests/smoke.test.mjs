import test from "node:test";
import assert from "node:assert/strict";

test("environment can run tests", () => {
  assert.equal(typeof process.version, "string");
  assert.ok(process.version.startsWith("v"));
});

test("basic arithmetic sanity", () => {
  assert.equal(2 + 2, 4);
});
