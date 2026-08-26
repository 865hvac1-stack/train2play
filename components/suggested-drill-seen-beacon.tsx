"use client";

import { useEffect, useRef } from "react";

import { markSuggestedDrillsSeenAction } from "@/app/(athlete)/athlete/drill-view-actions";

/** Marks director/coach sends as opened once the athlete loads the card. */
export function SuggestedDrillSeenBeacon({ drillIds }: { drillIds: string[] }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || drillIds.length === 0) return;
    sent.current = true;
    void markSuggestedDrillsSeenAction(drillIds).catch(() => {
      sent.current = false;
    });
  }, [drillIds]);

  return null;
}
