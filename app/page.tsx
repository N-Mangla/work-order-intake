"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { samples } from "../lib/samples";
import {
  validateApproval,
  type ApprovalErrors,
  type ApprovedOrder,
  type Draft,
  type WorkOrderFields,
} from "../lib/work-orders";

const storageKey = "work-order-intake.approved.v1";

const reviewFields = [
  { name: "site", label: "Service site", type: "text" },
  { name: "issue", label: "Issue", type: "text" },
  { name: "scheduledDate", label: "Scheduled date", type: "date" },
  { name: "scheduledTime", label: "Scheduled time (site-local)", type: "time" },
] as const;

function readOrders(): ApprovedOrder[] {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
  if (!Array.isArray(saved) || !saved.every(isApprovedOrder)) {
    throw new Error("Invalid saved work orders");
  }
  return saved;
}

function isApprovedOrder(value: unknown): value is ApprovedOrder {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" &&
    reviewFields.every(({ name }) => typeof row[name] === "string");
}

export default function Home() {
  const [note, setNote] = useState("");
  const [review, setReview] = useState<{ note: string; draft: Draft } | null>(null);
  const [inputError, setInputError] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [orders, setOrders] = useState<ApprovedOrder[]>([]);
  const [storageError, setStorageError] = useState("");
  const [status, setStatus] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function refreshOrders() {
      try {
        setOrders(readOrders());
        setStorageError("");
      } catch {
        setStorageError("Saved work orders could not be read in this browser.");
      }
    }

    refreshOrders();
    function onStorage(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) refreshOrders();
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (status) noteRef.current?.focus();
  }, [status]);

async function createDraft(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (isExtracting) return;

  if (!note.trim()) {
    setInputError("Paste a service request or choose an example.");
    noteRef.current?.focus();
    return;
  }

  setInputError("");
  setStatus("");
  setIsExtracting(true);

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });

    const result: { draft?: Draft; error?: string } = await response.json();

    if (!response.ok || !result.draft) {
      setInputError(result.error ?? "Could not create a draft. Try again.");
      return;
    }

    setReview({ note, draft: result.draft });
  } catch {
    setInputError("Could not reach the extraction service. Try again.");
  } finally {
    setIsExtracting(false);
  }
}

  function approve(fields: WorkOrderFields) {
    try {
      const approved = { ...fields, id: crypto.randomUUID() };
      const nextOrders = [approved, ...readOrders()];
      localStorage.setItem(storageKey, JSON.stringify(nextOrders));
      setOrders(nextOrders);
      setStorageError("");
      setStatus(`Approved work order for ${approved.site}.`);
      setReview(null);
      setNote("");
    } catch {
      setStorageError("The work order could not be saved. Your draft is still open.");
    }
  }

  return (
    <main>
      <header className="page-header">
        <span className="mode">Sample mode</span>
        <h1>Work order intake</h1>
        <p>Turn a service request into a draft you can check and approve.</p>
      </header>

      {review ? (
        <ReviewForm
          note={review.note}
          draft={review.draft}
          onApprove={approve}
          onBack={() => {
            setReview(null);
            requestAnimationFrame(() => noteRef.current?.focus());
          }}
        />
      ) : (
        <section className="panel" aria-labelledby="request-heading">
          <h2 id="request-heading">New request</h2>
          <form onSubmit={createDraft}>
            <div className="samples">
              {samples.map((sample) => (
                <button className="secondary" type="button" key={sample.label} onClick={() => {
                  setNote(sample.note);
                  setInputError("");
                  setStatus("");
                  noteRef.current?.focus();
                }}>{sample.label}</button>
              ))}
            </div>
            <label htmlFor="request">Service request</label>
            <textarea id="request" ref={noteRef} value={note} rows={4}
              placeholder="Paste a demo request or select an example above."
              aria-invalid={Boolean(inputError)}
              aria-describedby={inputError ? "request-error" : undefined}
              onChange={(event) => {
                setNote(event.target.value);
                setInputError("");
                setStatus("");
              }}
            />
            {inputError && <p id="request-error" className="error" role="alert">{inputError}</p>}
            <button type="submit" disabled={isExtracting}>
  {isExtracting ? "Creating draft…" : "Create draft"}
</button>
          </form>
        </section>
      )}

      {storageError && <p className="error" role="alert">{storageError}</p>}
      <div role="status">{status && <p className="success">{status}</p>}</div>

      <section className="panel" aria-labelledby="orders-heading">
        <h2 id="orders-heading">Approved work orders</h2>
        {orders.length === 0 ? <p className="muted">Approved work orders will appear here.</p> : (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Approved work-order table">
            <table>
              <thead><tr><th scope="col">Site</th><th scope="col">Issue</th><th scope="col">Schedule (site-local)</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.site}</td>
                    <td>{order.issue}</td>
                    <td>{order.scheduledDate} at {order.scheduledTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function ReviewForm({
  note,
  draft,
  onBack,
  onApprove,
}: {
  note: string;
  draft: Draft;
  onBack: () => void;
  onApprove: (fields: WorkOrderFields) => void;
}) {
  const [fields, setFields] = useState(draft.fields);
  const [attempted, setAttempted] = useState(false);
  const [siteConfirmed, setSiteConfirmed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const siteConfirmationRef = useRef<HTMLInputElement>(null);

  const requiresSiteConfirmation = draft.siteReviewReason !== null;
  const needsSiteConfirmation = requiresSiteConfirmation && !siteConfirmed;
  const showSiteConfirmationError = attempted && needsSiteConfirmation;
  const errors: ApprovalErrors = attempted ? validateApproval(fields) : {};

  useEffect(() => headingRef.current?.focus(), []);

  function updateField(name: keyof WorkOrderFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));

    if (name === "site") {
      setSiteConfirmed(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);

    const currentErrors = validateApproval(fields);

    if (currentErrors.site) {
      event.currentTarget.querySelector<HTMLInputElement>("#site")?.focus();
      return;
    }

    if (needsSiteConfirmation) {
      siteConfirmationRef.current?.focus();
      return;
    }

    const firstError = reviewFields.find(({ name }) => currentErrors[name]);

    if (firstError) {
      event.currentTarget
        .querySelector<HTMLInputElement>(`#${firstError.name}`)
        ?.focus();
      return;
    }

    onApprove({
      ...fields,
      site: fields.site.trim(),
      issue: fields.issue.trim(),
    });
  }

  return (
    <section className="panel" aria-labelledby="review-heading">
      <h2 id="review-heading" tabIndex={-1} ref={headingRef}>
        Review draft
      </h2>

      <div className="review-grid">
        <aside className="source">
          <h3>Original request</h3>
          <blockquote>{note}</blockquote>

          <h3>Site mentions</h3>
          <ul>
            {draft.siteExcerpts.map((excerpt) => (
              <li key={excerpt}>
                <q>{excerpt}</q>
              </li>
            ))}
          </ul>
        </aside>

        <form onSubmit={submit} noValidate>
          <p className="notice">
            Requested timing: <q>{draft.requestedTiming}</q>. Confirm the exact
            date and time.
          </p>

          <div className="fields">
            {reviewFields.map(({ name, label, type }) => {
              const hasSiteReview =
                name === "site" && requiresSiteConfirmation;
              const descriptionIds = [
                hasSiteReview ? "site-review-hint" : null,
                errors[name] ? `${name}-error` : null,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div key={name} className={type === "text" ? "wide" : ""}>
                  <label htmlFor={name}>
                    {label}
                    {hasSiteReview && !siteConfirmed && (
                      <span className="review-badge">Needs review</span>
                    )}
                  </label>

                  <input
                    id={name}
                    type={type}
                    required
                    value={fields[name]}
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={descriptionIds || undefined}
                    onChange={(event) => updateField(name, event.target.value)}
                  />

                  {errors[name] && (
                    <p id={`${name}-error`} className="error" role="alert">
                      {errors[name]}
                    </p>
                  )}

                  {hasSiteReview && (
                    <>
                      <p id="site-review-hint" className="muted">
                        {draft.siteReviewReason}
                      </p>

                      <label className="site-confirmation">
                        <input
                          ref={siteConfirmationRef}
                          type="checkbox"
                          required
                          checked={siteConfirmed}
                          aria-invalid={showSiteConfirmationError}
                          aria-describedby={
                            showSiteConfirmationError
                              ? "site-review-hint site-confirmation-error"
                              : "site-review-hint"
                          }
                          onChange={(event) =>
                            setSiteConfirmed(event.target.checked)
                          }
                        />
                        I’ve verified the service site
                      </label>

                      {showSiteConfirmationError && (
                        <p
                          id="site-confirmation-error"
                          className="error"
                          role="alert"
                        >
                          Confirm the service site before approving.
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="actions">
            <button type="submit">Approve work order</button>
            <button type="button" className="secondary" onClick={onBack}>
              Back to request
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
