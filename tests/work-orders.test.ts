import assert from "node:assert/strict";
import { test } from "node:test";
import { findSample, samples } from "../lib/samples.ts";
import { validateApproval } from "../lib/work-orders.ts";

test("approval requires an exact schedule and meaningful site and issue text", () => {
  const fields = { ...samples[0].draft.fields, site: " ", issue: " " };
  assert.deepEqual(Object.keys(validateApproval(fields)).sort(), [
    "issue", "scheduledDate", "scheduledTime", "site",
  ]);
});

test("a corrected site and confirmed schedule can be approved", () => {
  const fields = {
    ...samples[1].draft.fields,
    site: "Leeds office",
    scheduledDate: "2026-11-20",
    scheduledTime: "14:30",
  };
  assert.deepEqual(validateApproval(fields), {});
});

test("sample mode accepts the example with extra whitespace", () => {
  assert.equal(findSample(`  ${samples[0].note}\n`), samples[0]);
  assert.equal(findSample("Please fix the elevator."), undefined);
});
