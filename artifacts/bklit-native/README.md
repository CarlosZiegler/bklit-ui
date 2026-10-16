# Native verification

The web implementation in `packages/ui/src/charts` and `apps/web/blocks` is the visual/API reference. Native rendering uses SVG, Reanimated, Gesture Handler and Expo UI controls; it does not embed the web renderer.

## Automated checks

- Native and Expo app TypeScript checks pass.
- 86 native geometry, family-validation, portable-spec, utility and code-generation tests pass. Generated examples for all 17 families compile against the public native API; the catalog is compared with the web Studio catalog.
- Biome checks pass for all 119 native/spec/demo source files.
- Expo dependency check passes.
- Expo web export (nine routes, including the developer performance lab), iOS JavaScript bundle export and Android JavaScript bundle export pass.

## Simulator review

Reviewed all 17 families in Expo Go on iPhone 16e / iOS 26.3. Screenshots document bounded axis labels, shared composed-chart scales, radial center overlays, layout geometry and sequential intensity palettes.

Verified actual touch interactions: pie selection; sunburst drilldown and return; live-chart vertical scroll handoff; brush left/right resizing, window pan, main-chart zoom and reset; marker group expansion and event callback; legend selection and progress; Studio family selection, layer color, visibility, addition and removal; invalid JSON rejection and custom-data application; and both stat-card value/trend readouts.

`studio-light.png` and `studio-sliders.png` show the final native appearance switch and data slider. `studio-xl.png` and `catalog-xl.png` show the next larger system text-size setting (67% on the Settings slider, with Larger Accessibility Sizes off). `blocks-dark.png` and `blocks-selected.png` include the final web-reference Cardinal/Basis curves and touch values. `markers-expanded.png` and `marker-selected.png` show marker interaction after the gesture/overlay fixes.

System Reduce Motion was enabled and Studio Replay was retested after preserving the existing chart instance during replay. The plot stayed visible; see `reduced-motion-final.mov`. System text size and Reduce Motion were restored to their original settings afterward.

Short recordings: `studio-flow.mp4` (appearance and data slider), `brush-flow.mp4` (resize/pan/reset), `catalog-flow.mp4` (gallery), and `marker-flow.mov` (markers, legends and blocks). Earlier `light.png`, `dark.png`, `target.png` and `interaction.mov` document the initial Overview prototype rather than the final Studio.

## Limits

Android execution, physical-device release frame rates and the full accessibility text-size range have not been verified in this run. Bundle generation is not a native release build. The native compositional API follows the web patterns but does not claim identical support for every DOM, CSS or browser Motion feature; see `packages/native/PARITY.md` and the package family READMEs.

## Documentation browser preview

`/docs/native` now embeds the Expo production web export under `/native-preview`. The web build graph generates the export from the workspace source and copies its static assets into the docs public directory. Direct Overview, Charts and Studio requests were exercised in Chrome, including the Studio appearance switch and changing Line Chart to Pie Chart through the real Expo UI picker.

The docs preview export, native library/demo TypeScript checks, generated MDX and root lint pass. Commit validation aligned all direct `@types/react` dependencies to 19.2.18 to resolve conflicting React/CSS declarations. The full monorepo production build now passes, including web, Studio docs and the nine-route Expo export. No type-check bypass was added.

## Overview and chart corrections

The narrow Overview cards now use their content height instead of `flex: 0`, avoiding collapsed card backgrounds and overlapping content on React Native Web. Desktop columns keep their flexible width. The fix was reviewed in the docs iframe in Safari and in Expo Go (`overview-cards-fixed.png`).

Candlesticks now use half-slot x padding like the web reference. Scatter point centers, highlight rings and x labels share an inset horizontal range, keeping marks clear of the Y-axis labels. Profit/loss fade gradients now use matching, instance-unique IDs. The heatmap sample covers every web contribution level (0, 1, 2, 3 and 4+) instead of mostly saturating the maximum level. The three affected SVG renderers use a system sans font on web.

Reviewed all four charts in Expo Go and their production web export in iOS Safari at phone width; see the `*-fixed.png` and `browser-*-fixed.png` screenshots. A cold Expo Go relaunch also confirmed the heatmap legend below the cells after Fast Refresh had retained an obsolete layer identity. 86 native tests, Native/demo TypeScript and targeted Biome checks pass.

The standalone Bar Chart now supplies full static SVG geometry when animation is disabled, reduced or has zero duration. Previously its initial `height=0` persisted in the browser catalog because there was no changing shared value to update it. Verified grouped bars and tap-to-fade selection in the production web gallery, plus animated Studio rendering (`browser-bar-fixed.png`, `browser-bar-selected.png`, `browser-bar-studio-fixed.png`). Native package TypeScript and targeted Biome checks pass.

## Architecture and performance audit

See `packages/native/AUDIT.md` for open findings and the viability verdict. Reproducible pure-geometry and bundle probes are committed alongside the Expo `/performance` lab. Raw CPU, development before/after and production-JavaScript simulator measurements are saved as `performance-*.json`. Production JavaScript in Expo Go is explicitly distinguished from a custom release binary on a physical device. The large-x-domain regression test brings the native suite to 86 passing tests.
