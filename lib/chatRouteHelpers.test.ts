import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { CHAT_MESSAGE_MAX_LENGTH, isValidObjectId } from "./chatRouteHelpers";

describe("chatRouteHelpers", () => {
  it("isValidObjectId accepts valid 24-char hex ids", () => {
    const id = new mongoose.Types.ObjectId().toString();
    assert.equal(isValidObjectId(id), true);
  });

  it("isValidObjectId rejects invalid strings", () => {
    assert.equal(isValidObjectId(""), false);
    assert.equal(isValidObjectId("not-an-id"), false);
    assert.equal(isValidObjectId("507f1f77bcf86cd79943901"), false);
  });

  it("CHAT_MESSAGE_MAX_LENGTH is 8000", () => {
    assert.equal(CHAT_MESSAGE_MAX_LENGTH, 8000);
  });
});
