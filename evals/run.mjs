import { readFile } from "node:fs/promises";

const requests = JSON.parse(
  await readFile(new URL("./requests.json", import.meta.url), "utf8"),
);

const endpoint = process.env.EVAL_URL ?? "http://localhost:3000/api/extract";

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]$/, "");
}

const rows = [];

for (const { id, note, expected } of requests) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
    signal: AbortSignal.timeout(45_000),
  });

  const result = await response.json();

  if (!response.ok || result.source !== "live" || !result.draft) {
    throw new Error(
      `${id}: expected a live draft, got HTTP ${response.status}. ${
        result.error ?? `Source: ${result.source ?? "unknown"}`
      }`,
    );
  }

  const { fields, requestedTiming, siteReviewReason } = result.draft;
  const siteCorrect = normalize(fields.site) === normalize(expected.site);
  const issueMatched = expected.issue.some(
    (wording) => normalize(fields.issue) === normalize(wording),
  );
  const timingCorrect = normalize(requestedTiming) === normalize(expected.requestedTiming);

  const needsSiteReview = expected.siteNeedsReview || !siteCorrect;
  const siteFlagged = Boolean(siteReviewReason);

  rows.push({
    id,
    siteCorrect,
    issueMatched,
    timingCorrect,
    needsSiteReview,
    siteFlagged,
    missedSiteReview: needsSiteReview && !siteFlagged,
    actualSite: fields.site,
    actualIssue: fields.issue,
    actualTiming: requestedTiming,
  });
}

console.table(rows);

const count = (field) => rows.filter((row) => row[field]).length;

console.log(`Site matches: ${count("siteCorrect")}/${rows.length}`);
console.log(`Issue wording matches: ${count("issueMatched")}/${rows.length}`);
console.log(`Timing matches: ${count("timingCorrect")}/${rows.length}`);
console.log(
  `Missed site review flags: ${count("missedSiteReview")}/${count("needsSiteReview")}`,
);