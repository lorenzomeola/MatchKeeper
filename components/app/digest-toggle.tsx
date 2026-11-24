"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/app/toast";
import { setMatchDigestAction } from "@/lib/actions/support";

export function DigestToggle({ initial }: { initial: boolean }) {
  const { toast } = useToast();
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    setOn(next);
    startTransition(async () => {
      const res = await setMatchDigestAction(next);
      if (res.error) {
        setOn(!next);
        toast(res.error, "error");
        return;
      }
      toast(next ? "You'll get the weekly email." : "Weekly email turned off.");
    });
  }

  return (
    <section className="mt-12 border-t border-line pt-6">
      <h2 className="pl-display text-fg [font-size:var(--t-xl)]">Emails</h2>
      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(e) => change(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
        />
        <span>
          <span className="block text-[15px] font-medium text-fg">Weekly open matches</span>
          <span className="mt-0.5 block text-sm text-muted">
            On Wednesdays, a short list of matches that still need a keeper and that you haven&apos;t applied to.
          </span>
        </span>
      </label>
    </section>
  );
}
