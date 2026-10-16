"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const screens = [
  { label: "Overview", path: "/native-preview" },
  { label: "Charts", path: "/native-preview/charts" },
  { label: "Studio", path: "/native-preview/studio" },
];

export function NativeDemoPreview() {
  const [src, setSrc] = useState("/native-preview");

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border bg-muted/30">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
        <fieldset className="flex gap-1">
          <legend className="sr-only">Preview screen</legend>
          {screens.map((screen) => (
            <button
              aria-pressed={src === screen.path}
              className={cn(
                "rounded-md px-3 py-2 font-medium text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                src === screen.path && "bg-background shadow-xs"
              )}
              key={screen.path}
              onClick={() => setSrc(screen.path)}
              type="button"
            >
              {screen.label}
            </button>
          ))}
        </fieldset>
        <a
          className="text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
          href={src}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open demo ↗
        </a>
      </div>
      <div className="px-2 py-5 sm:px-5">
        <iframe
          allow="clipboard-write"
          className="mx-auto block h-[720px] max-h-[80svh] w-full max-w-[390px] rounded-2xl border bg-background shadow-sm"
          loading="lazy"
          src={src}
          title="Bklit Native interactive Expo web preview"
        />
      </div>
      <p className="m-0 border-t px-4 py-3 text-muted-foreground text-xs leading-relaxed">
        The Expo example running through React Native Web. Click or drag charts,
        browse the catalog, and edit a chart in Studio. Run on iOS or Android to
        try platform controls and native gestures.
      </p>
    </div>
  );
}
