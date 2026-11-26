"use client";

import { useState, useTransition } from "react";
import { cancelAccountDeletionAction, requestAccountDeletionAction } from "@/lib/actions/account";
import { CONTACT_EMAIL } from "@/lib/site";

export function DeleteAccount({ requestedAt }: { requestedAt: string | null }) {
  const [requested, setRequested] = useState(requestedAt !== null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(action: () => Promise<{ error: string | null }>, done: () => void) {
    setError(null);
    start(async () => {
      const r = await action();
      if (r.error) setError(r.error);
      else done();
    });
  }

  return (
    <section className="mt-12 border-t border-line pt-6">
      <h2 className="pl-display text-fg [font-size:var(--t-xl)]">Delete your account</h2>

      {requested ? (
        <div className="mt-3 rounded-[var(--r-md)] border border-line bg-surface p-4">
          <p className="text-[15px] font-semibold text-fg">Deletion requested</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            The MatchKeeper team has your request and will reply by email within one month. If you have an upcoming
            match, we will ask you to finish or cancel it first. Changed your mind? Cancel the request below. Questions:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-accent-strong underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(cancelAccountDeletionAction, () => setRequested(false))}
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent-strong underline underline-offset-4 disabled:opacity-60"
          >
            {pending ? "Cancelling…" : "Cancel my request"}
          </button>
        </div>
      ) : (
        <>
          <p className="mt-3 max-w-[38rem] text-sm leading-relaxed text-muted">
            Ask the MatchKeeper team to delete your account and personal data, including your photo, mobile number and, for
            goalkeepers, your clips. Each request is handled by a person, who will reply by email within one month. Matches
            and messages you shared with other people may be kept in a reduced form where they are still needed.
          </p>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-3 inline-flex min-h-12 items-center rounded-[var(--r-md)] border border-line-strong px-5 text-[15px] font-medium text-danger transition-colors duration-200 hover:border-danger"
            >
              Request account deletion
            </button>
          ) : (
            <div className="mt-3 rounded-[var(--r-md)] border border-danger/40 bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-4">
              <p className="text-[15px] font-semibold text-fg">Send the deletion request?</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                You will stay logged in until the team finishes. You can cancel the request until then.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(requestAccountDeletionAction, () => {
                      setRequested(true);
                      setConfirming(false);
                    })
                  }
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-danger underline underline-offset-4 disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Yes, request deletion"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline underline-offset-4"
                >
                  Keep my account
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
