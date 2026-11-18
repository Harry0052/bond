"use client";

import { useSyncExternalStore } from "react";
import { formatInZone, formatUtc } from "@/lib/time";

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function DueTime({ iso, timeZone }: { iso: string; timeZone?: string | null }) {
  if (timeZone) {
    return (
      <time dateTime={iso}>
        {formatInZone(iso, timeZone)} · {timeZone}
      </time>
    );
  }
  return <GuestTime iso={iso} />;
}

function GuestTime({ iso }: { iso: string }) {
  const fallback = `${formatUtc(iso)} · UTC`;
  const label = useSyncExternalStore(
    () => () => {},
    () => {
      const zone = browserTimeZone();
      return `${formatInZone(iso, zone)} · ${zone}`;
    },
    () => fallback,
  );
  return <time dateTime={iso}>{label}</time>;
}
