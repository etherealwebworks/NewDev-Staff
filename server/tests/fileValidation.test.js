import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_FILE_BYTES, sanitizeFileName, validateUpload } from "../src/utils/fileValidation.js";

const pdf = Buffer.from("%PDF-1.7\n....");
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]);
const check = (originalname, mimetype, buffer) => validateUpload({ originalname, mimetype, buffer });

test("accepts real files whose extension, MIME type and content agree", () => {
  assert.equal(check("Brief.pdf", "application/pdf", pdf).ok, true);
  assert.equal(check("logo.png", "image/png", png).ok, true);
  assert.equal(check("sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", zip).ok, true);
  assert.equal(check("notes.txt", "text/plain", Buffer.from("hello")).ok, true);
});

test("a browser that sends application/octet-stream is fine when the content checks out", () => {
  assert.equal(check("brief.pdf", "application/octet-stream", pdf).ok, true);
});

test("rejects script-capable and unknown types outright", () => {
  for (const name of ["x.svg", "x.html", "x.js", "x.exe", "x.php", "x.sh", "noextension"]) {
    assert.equal(check(name, "text/plain", Buffer.from("<script>")).ok, false, name);
  }
});

test("rejects a disguised file: right extension, wrong content", () => {
  assert.equal(check("evil.pdf", "application/pdf", Buffer.from("MZ\x90\x00 not a pdf")).ok, false);
  assert.equal(check("evil.png", "image/png", pdf).ok, false);
  assert.equal(check("evil.txt", "text/plain", Buffer.from([0x68, 0x00, 0x69])).ok, false); // NUL byte => binary
});

test("rejects a MIME type that contradicts the extension", () => {
  assert.equal(check("a.pdf", "image/png", pdf).ok, false);
});

test("rejects empty and oversized files", () => {
  assert.equal(check("a.pdf", "application/pdf", Buffer.alloc(0)).ok, false);
  assert.equal(check("a.txt", "text/plain", Buffer.alloc(MAX_FILE_BYTES + 1, 0x61)).ok, false);
});

test("file names are stripped of paths and unsafe characters; the extension survives", () => {
  assert.equal(sanitizeFileName("../../etc/passwd.pdf"), "passwd.pdf");
  assert.equal(sanitizeFileName("C:\\Users\\me\\report final.PDF"), "report final.pdf");
  assert.equal(sanitizeFileName("a<b>:c|d?.png"), "a_b__c_d_.png");
  // A bare dotfile has no real extension, so it ends up with none and is rejected by validateUpload.
  assert.equal(check(".pdf", "application/pdf", pdf).ok, false);
  assert.ok(sanitizeFileName(`${"x".repeat(300)}.png`).length <= 104);
});
