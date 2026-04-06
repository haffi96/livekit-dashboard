"use client";

import { DataPacketsSection } from "./data-packets-section";
import { DataTracksSection } from "./data-tracks-section";

export function DataPanel() {
  return (
    <div className="space-y-4">
      <DataTracksSection />
      <DataPacketsSection />
    </div>
  );
}
