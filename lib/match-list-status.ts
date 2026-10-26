const BOOKING_STATUS = {
  confirmed: { label: "Booked", tone: "accent" },
  completed: { label: "Played", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
  under_review: { label: "Under review", tone: "warning" },
  pending_payment: { label: "Awaiting payment", tone: "warning" },
} as const;

export function bookingListStatus(status: string | null) {
  return status !== null && Object.hasOwn(BOOKING_STATUS, status)
    ? BOOKING_STATUS[status as keyof typeof BOOKING_STATUS]
    : null;
}

export function matchListStatus(matchStatus: string, bookingStatuses: readonly string[]) {
  if (matchStatus === "cancelled") return BOOKING_STATUS.cancelled;
  if (matchStatus === "completed") return BOOKING_STATUS.completed;
  if (bookingStatuses.includes("under_review")) return BOOKING_STATUS.under_review;
  if (matchStatus === "open") return { label: "Open", tone: "success" } as const;
  return BOOKING_STATUS.confirmed;
}

export function keeperMatchTab(input: { applicationStatus: string; matchStatus: string; bookingStatus: string | null; ended: boolean }) {
  if (
    input.ended || ["completed", "cancelled"].includes(input.matchStatus) ||
    ["completed", "cancelled", "under_review"].includes(input.bookingStatus ?? "") ||
    ["rejected", "withdrawn"].includes(input.applicationStatus)
  ) return "past";
  if (input.applicationStatus === "pending" && input.matchStatus === "open") return "open";
  return input.applicationStatus === "accepted" ? "booked" : "past";
}
