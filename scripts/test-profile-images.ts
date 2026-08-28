import assert from "node:assert/strict";

import { firstUploadedFile } from "../lib/profile-images";

function testPicksFirstRealFile() {
  const empty = new File([], "empty.jpg", { type: "image/jpeg" });
  const photo = new File([new Uint8Array([1, 2, 3])], "selfie.jpg", { type: "image/jpeg" });
  const form = new FormData();
  form.append("avatarFile", empty);
  form.append("avatarFile", photo);
  const picked = firstUploadedFile(form, "avatarFile");
  assert.ok(picked);
  assert.equal(picked?.name, "selfie.jpg");
  assert.equal(firstUploadedFile(form, "coverFile"), null);
}

testPicksFirstRealFile();
console.log("profile-image upload helper checks passed");
