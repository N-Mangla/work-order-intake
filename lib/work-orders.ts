export type WorkOrderFields = {
  site: string;
  issue: string;
  scheduledDate: string;
  scheduledTime: string;
};

export type Draft = {
  fields: WorkOrderFields;
  requestedTiming: string;
  siteExcerpts: readonly string[];
};

export type ApprovedOrder = WorkOrderFields & { id: string };

export type ApprovalErrors = Partial<Record<keyof WorkOrderFields, string>>;

export function validateApproval(fields: WorkOrderFields): ApprovalErrors {
  const errors: ApprovalErrors = {};
  if (!fields.site.trim()) errors.site = "Enter the service site.";
  if (!fields.issue.trim()) errors.issue = "Describe the issue.";
  if (!fields.scheduledDate) errors.scheduledDate = "Confirm the scheduled date.";
  if (!fields.scheduledTime) errors.scheduledTime = "Confirm the scheduled time.";
  return errors;
}
