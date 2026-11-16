# Work order intake

A service coordinator can turn a request into an editable work-order draft, compare it with the original note, and approve the corrected details. The two bundled examples show what happens when a draft is only partly right. With Ollama running locally, you can also generate a draft from a new request.

## Run locally

Use Node.js 22 or newer and npm. From the project folder, run:

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000), or use the address Next.js prints. The bundled examples work without Ollama or API credentials.

## Try the review workflow

1. Select **Missing schedule** and click **Create draft**. The note asks for “Friday afternoon” and the exact date and time are blank.
2. Click **Approve work order** with the schedule blank. The form asks for a date and time. Enter a test appointment, approve it, and reload the page to check that the row persists.
3. Select **Wrong service site** and click **Create draft**. The sample proposes Bradford, where the reporting team is based. The original note places the printer at the Leeds office.
4. Change the site to **Leeds office**, check **I’ve verified the service site**, enter a date and time, and approve. The new row should show your correction.

Approved rows are stored in the current browser. The schedule uses site-local date and time text so it displays as entered.

## Enable local extraction

Install and start [Ollama](https://ollama.com/download), then download the model:

```sh
ollama pull qwen2.5:3b
```

Create `.env.local` beside `package.json` and add:

```dotenv
OLLAMA_MODEL=qwen2.5:3b
```

Restart `npm run dev` and keep Ollama running. Paste a new request and click **Create draft**:

> The scanner at the York warehouse will not power on. Could someone come Monday morning?

The review screen labels model output **Generated locally** and bundled examples **Sample draft**. Compare the draft with the note, fix any missing or incorrect details, and confirm the exact appointment before approving.

## How it works

| File | Responsibility |
|---|---|
| [`app/page.tsx`](app/page.tsx) | Sends the request to the API, displays the original note and editable draft, and saves approved rows in the browser. A save failure leaves the draft open. |
| [`app/api/extract/route.ts`](app/api/extract/route.ts) | Serves bundled examples and calls Ollama for new requests when configured. Validates structured output with Zod, checks quoted evidence against the note, and flags sites that need confirmation. |
| [`lib/work-orders.ts`](lib/work-orders.ts) | Defines draft and work-order fields and validates the reviewer’s edits before approval. |
| [`lib/samples.ts`](lib/samples.ts) | Pairs each bundled request with its fixed draft and matches notes with extra whitespace. |
| [`tests/work-orders.test.ts`](tests/work-orders.test.ts) | Covers sample matching, missing approval fields, and approval after correcting a draft. |

## Extraction evaluation

I ran 25 synthetic held-out requests through `/api/extract` using `qwen2.5:3b`. The expected answers are in [`evals/held-out.json`](evals/held-out.json). After enabling local extraction, keep Next.js and Ollama running and use a second terminal:

```sh
node evals/run.mjs evals/held-out.json
```

| Metric | Result |
|---|---:|
| Site matches | 23/25 |
| Issue wording matches | 16/25 |
| Requested timing matches | 17/25 |
| Missed site review flags | 0/9 |
| Unnecessary site review flags | 4/16 |

The scorer compares normalized text with the expected answers. Equivalent wording can still count as a mismatch. For example, the Norwich response kept the same appointment information but omitted the leading “on”. Five requests with a stated fault returned an empty issue.

In one case, two records disagreed about whether a card reader was at the Stirling or Falkirk shop. The model chose Falkirk. The app asked the reviewer to confirm the site, giving them a chance to catch the unsupported choice.

The review flag metrics cover the service site. Nine drafts needed site review because the source was missing or ambiguous, or because the extracted site was incorrect. Four of the other 16 drafts triggered an extra site confirmation.

## Verify a change

```sh
npm run lint
npm test
npm run build
```
