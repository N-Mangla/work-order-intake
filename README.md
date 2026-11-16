# Work order intake

This project explores what happens when an AI-generated draft is only partly right. A service coordinator compares a proposed work order with the original request, fixes the draft, and approves the values that should be saved.

The current milestone runs in sample mode. Both examples use fixed, synthetic drafts, so the same review cases work on every run without credentials.

## Run locally

Use Node.js 22 or newer and npm. Open Terminal in this folder.

```sh
node -v
npm -v
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000), or use the address printed by Next.js.

## Try the two review cases

1. Select **Missing schedule** and click **Create draft**. You can also paste this request:

   > The printer at the Leeds office keeps jamming. Can someone come Friday afternoon?

2. Click **Approve work order** with the schedule blank. The form should ask for both a date and a time, and the table should stay empty.
3. Enter a synthetic appointment date and time and approve. Reload and check that the row persists.
4. Select **Wrong service site** and create a draft. This sample deliberately proposes Bradford. The note says the Bradford team reported the issue at the Leeds office. Change the service site to **Leeds office**, choose a schedule, and approve. Check that the new row shows your correction.

The approved rows live in this browser. The schedule is stored as site-local date and time text so it displays as entered.

## Read the code in this order

1. **[`lib/samples.ts`](lib/samples.ts)** pairs an original note with a draft. Matching ignores extra whitespace. The review still displays the text as entered.
2. **[`lib/work-orders.ts`](lib/work-orders.ts)** defines the editable fields and checks the current values before approval. A draft can have a missing schedule. An approval needs both date and time.
3. **[`app/page.tsx`](app/page.tsx)** connects the form to the sample and saves an approved row. Review edits are held separately from the original note and the reusable fixture. A save failure leaves the draft open.
4. **[`tests/work-orders.test.ts`](tests/work-orders.test.ts)** checks the sample matcher, missing fields, and a corrected draft.

The browser owns the sample workflow. Next.js serves the page and assets. The next milestone adds a server-side extraction route to the same app.

## Verify a change

```sh
npm run lint
npm test
npm run build
```

## Continue the build

1. Add one provider in a server-side `POST /api/extract` route. Validate its structured output with Zod and apply review rules. Preserve the original note when extraction fails.
2. Run a separate evaluation on 25–30 labelled synthetic notes. Record field accuracy, missed review flags, and a case where one warning hid a different missed error.
3. Publish the repository and a sample-mode demo. Add the demo link, a review screenshot, and the measured evaluation results here.
