import type { Draft } from "./work-orders.ts";

type Sample = { label: string; note: string; draft: Draft };

const leedsDraft: Draft = {
  fields: {
    site: "Leeds office",
    issue: "Printer keeps jamming",
    scheduledDate: "",
    scheduledTime: "",
  },
  requestedTiming: "Friday afternoon",
  siteExcerpts: ["at the Leeds office"],
  siteReviewReason: null,
};

export const samples: readonly Sample[] = [
  {
    label: "Missing schedule",
    note: "The printer at the Leeds office keeps jamming. Can someone come Friday afternoon?",
    draft: leedsDraft,
  },
  {
    label: "Wrong service site",
    note: "The printer at the Leeds office keeps jamming. Our Bradford team reported it. Could someone come Friday afternoon?",
    draft: {
      ...leedsDraft,
      fields: { ...leedsDraft.fields, site: "Bradford" },
      siteExcerpts: ["at the Leeds office", "Our Bradford team reported it"],
      siteReviewReason:
        "The request mentions two locations. Confirm where the printer needs service.",
    },
  },
];

export function findSample(note: string): Sample | undefined {
  const normalized = note.trim().replace(/\s+/g, " ");
  return samples.find((sample) => sample.note === normalized);
}