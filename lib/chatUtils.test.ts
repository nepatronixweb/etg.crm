import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatConversationListTime,
  formatMessageTimestamp,
  formatDateSeparator,
  shouldShowDateSeparator,
  isMessageReadByOthers,
  userReactedWith,
  isChatReactionEmoji,
} from "./chatUtils";

describe("chatUtils", () => {
  it("isChatReactionEmoji validates allowed emojis", () => {
    assert.equal(isChatReactionEmoji("👍"), true);
    assert.equal(isChatReactionEmoji("👍🏻"), false);
  });

  it("isMessageReadByOthers checks all other participants", () => {
    assert.equal(isMessageReadByOthers(["u1", "u2"], ["u2"]), true);
    assert.equal(isMessageReadByOthers(["u1"], ["u2"]), false);
  });

  it("userReactedWith detects reaction", () => {
    assert.equal(
      userReactedWith([{ emoji: "❤️", user: { _id: "u1", name: "A" } }], "u1", "❤️"),
      true
    );
  });

  it("shouldShowDateSeparator across days", () => {
    assert.equal(shouldShowDateSeparator("2026-05-20T10:00:00Z", "2026-05-19T10:00:00Z"), true);
    assert.equal(shouldShowDateSeparator("2026-05-20T10:00:00Z", "2026-05-20T09:00:00Z"), false);
  });

  it("formatDateSeparator returns Today for current date", () => {
    const now = new Date().toISOString();
    assert.equal(formatDateSeparator(now), "Today");
  });

  it("formatMessageTimestamp and formatConversationListTime return strings", () => {
    const iso = new Date().toISOString();
    assert.ok(formatMessageTimestamp(iso).length > 0);
    assert.ok(formatConversationListTime(iso).length > 0);
  });
});
