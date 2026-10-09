"use client";

import { useId, useState, useTransition } from "react";
import { useToast } from "@/components/app/toast";
import { FormError } from "@/components/platform/form-fields";
import { StarIcon } from "@/components/platform/icons";
import { submitReviewAction } from "@/lib/actions/reviews";

const WORDS = ["Poor", "Below par", "Good", "Very good", "Excellent"];

/** Valoración del portero tras un partido jugado: 1 a 5 estrellas y un comentario opcional. */
export function ReviewCard({
  bookingId,
  matchId,
  keeperName,
}: {
  bookingId: string;
  matchId: string;
  keeperName: string;
}) {
  const { toast } = useToast();
  const commentId = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (rating === 0) {
      setError("Pick a rating from 1 to 5 stars.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitReviewAction(bookingId, matchId, rating, comment);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast("Thanks, your review is saved.");
    });
  }

  return (
    <div className="pl-surface rounded-[var(--r-xl)] p-5 sm:p-6">
      <p className="pl-display text-fg [font-size:var(--t-xl)]">How did {keeperName} do?</p>
      <p className="pl-prose mt-1.5 text-[15px]">Your review shows on their profile and helps other teams choose.</p>

      <div role="radiogroup" aria-label="Rating" className="mt-4 flex items-center gap-1">
        {WORDS.map((word, i) => {
          const value = i + 1;
          const on = value <= rating;
          return (
            <button
              key={word}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} ${value === 1 ? "star" : "stars"}, ${word}`}
              onClick={() => setRating(value)}
              className="grid h-12 w-12 place-items-center rounded-[var(--r-md)] transition-transform duration-150 active:scale-90"
            >
              <StarIcon className={`h-8 w-8 ${on ? "fill-current text-accent" : "text-line-strong"}`} />
            </button>
          );
        })}
        <span className="ml-2 text-sm font-medium text-fg-2" aria-live="polite">
          {rating ? WORDS[rating - 1] : ""}
        </span>
      </div>

      <label htmlFor={commentId} className="mt-4 block text-sm font-medium text-fg">
        Comment <span className="font-normal text-muted">optional</span>
      </label>
      <textarea
        id={commentId}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={600}
        placeholder="On time, calm, good with the back line…"
        className="pl-input mt-1.5"
      />

      {error && (
        <div className="mt-3">
          <FormError>{error}</FormError>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--r-md)] bg-accent text-[15px] font-semibold text-accent-ink transition-[transform,background-color] duration-150 hover:bg-accent-strong active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {pending ? "Saving…" : "Save review"}
      </button>
    </div>
  );
}
