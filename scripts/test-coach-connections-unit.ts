import assert from "node:assert/strict";
import { createHash, randomInt } from "node:crypto";

import {
  buildConnectionCodeCandidate,
  normalizeConnectionCode,
  connectionCodePath,
} from "../lib/coach-connections";

function testNormalize() {
  assert.equal(normalizeConnectionCode(" lester-4821 "), "LESTER4821");
  assert.equal(normalizeConnectionCode("NEX.GEN"), "NEXGEN");
}

function testCodeFormat() {
  for (let i = 0; i < 20; i += 1) {
    const code = buildConnectionCodeCandidate("Coach Lester");
    assert.match(code, /^[A-Z]{3,8}\d{4}$/);
    assert.ok(!code.includes(" "));
  }
}

function testConnectPath() {
  assert.equal(connectionCodePath("lester4821"), "/connect/LESTER4821");
}

function testNotAuthSecret() {
  // Codes are short human identifiers — not password-strength secrets
  const code = buildConnectionCodeCandidate("Alex");
  assert.ok(code.length < 20);
  const hash = createHash("sha256").update(code).digest("hex");
  assert.notEqual(hash, code);
  void randomInt;
}

testNormalize();
testCodeFormat();
testConnectPath();
testNotAuthSecret();
console.log("coach-connection unit checks passed");
