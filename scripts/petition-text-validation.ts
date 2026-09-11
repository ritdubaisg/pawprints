import assert from "node:assert/strict";
import { getVisibleTextLength } from "../src/lib/text-validation";

for (const value of ["   ", "\n\n\n", "\u00A0\u200B"]) {
  assert.equal(getVisibleTextLength(value), 0);
}

assert.equal(getVisibleTextLength("A valid title"), 11);
assert.ok(getVisibleTextLength("<p>Readable petition body</p>") > 0);

console.log("petition text validation checks passed");
