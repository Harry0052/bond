"use client";

import { useSyncExternalStore, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function SharePanel({ path, sandbox }: { path: string; sandbox: boolean }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const href = origin ? `${origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      toast("Link copied.");
    } catch {
      setCopied(false);
      toast("Copy did not run. Select the link and copy it yourself.");
    }
  }

  return (
    <section className="rounded-[1.75rem] bg-white p-5 ring-1 ring-line" aria-labelledby="share-heading">
      <h2 id="share-heading" className="font-display text-3xl tracking-tight text-ink">
        Send this link
      </h2>
      <p className="mt-2 text-base leading-7 text-ink-soft">
        Anyone with the link can read the card. They still have to accept their own part. Bond does not email or text
        it for you.
      </p>
      <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="share-link">
        Share link
      </label>
      <input id="share-link" readOnly value={href} className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base text-ink" />
      <Button type="button" className="mt-4 w-full sm:w-auto" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy link"}
      </Button>
      {sandbox ? (
        <p className="mt-4 text-sm leading-6 text-warn">
          This server is signing links with the local development key. Set BOND_SHARE_SECRET before anyone else uses
          the server.
        </p>
      ) : null}
    </section>
  );
}
