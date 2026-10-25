import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  clamp,
  nodeToScrollPosition,
  normalizeLikeCount,
  scrollToNodePosition,
  validateMessage,
} from "../scripts/core.js";

test("clamp keeps scene values inside bounds", () => {
  assert.equal(clamp(-4, 0, 6), 0);
  assert.equal(clamp(3.4, 0, 6), 3.4);
  assert.equal(clamp(12, 0, 6), 6);
});

test("scroll progress maps the full journey to seven nodes", () => {
  assert.equal(scrollToNodePosition(0, 7000, 1000, 7), 0);
  assert.equal(scrollToNodePosition(3000, 7000, 1000, 7), 3);
  assert.equal(scrollToNodePosition(6000, 7000, 1000, 7), 6);
  assert.equal(scrollToNodePosition(50, 1000, 1000, 7), 0);
});

test("node position maps back to the same scene", () => {
  for (let index = 0; index < 7; index += 1) {
    const scroll = nodeToScrollPosition(index, 7000, 1000, 7);
    assert.equal(scrollToNodePosition(scroll, 7000, 1000, 7), index);
  }
});

test("like counts stay non-negative integers", () => {
  assert.equal(normalizeLikeCount(), 0);
  assert.equal(normalizeLikeCount(-3), 0);
  assert.equal(normalizeLikeCount("4.8"), 4);
  assert.equal(normalizeLikeCount(12), 12);
});

test("message validation trims input and fills an anonymous name", () => {
  assert.deepEqual(validateMessage({ name: "  ", message: "  向前走  " }), {
    ok: true,
    value: { name: "一位后来者", message: "向前走" },
  });
});

test("message validation rejects empty, oversized, and bot input", () => {
  assert.equal(validateMessage({ message: "   " }).ok, false);
  assert.equal(validateMessage({ message: "光".repeat(61) }).ok, false);
  assert.equal(validateMessage({ message: "一束光", website: "bot" }).ok, false);
  assert.equal(validateMessage({ name: "名".repeat(17), message: "一束光" }).ok, false);
});

test("browser entry works without module resolution", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../scripts/app.js", import.meta.url), "utf8");

  assert.match(html, /<script defer src="scripts\/app\.js(?:\?[^"]*)?"><\/script>/);
  assert.doesNotMatch(html, /type="module"/);
  assert.doesNotMatch(app, /^\s*import\s/m);
});

test("music regions map to the complete page soundtrack", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../scripts/app.js", import.meta.url), "utf8");
  const regions = [...html.matchAll(/data-music="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(regions, ["cover", "journey", "figures", "spark", "finale"]);
  for (const theme of ["cover", "ruijin", "xiangjiang", "zunyi", "chishui", "jiajin", "grassland", "wuqi", "figures", "spark", "finale"]) {
    assert.match(app, new RegExp(`\\b${theme}: \\{`));
  }
});
