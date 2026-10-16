# Bklit Native example

An Expo workspace app for trying Bklit chart components on mobile, with a chart catalog and a native Studio. Chart source lives in [packages/native](../../packages/native); portable configuration lives in [packages/chart-spec](../../packages/chart-spec).

## Run

From the repository root:

```sh
pnpm install
pnpm native-demo:ios
# or
pnpm native-demo:android
pnpm native-demo:web
```

The app targets **Expo SDK 56**, React Native 0.85 and React 19.2.3. Use a compatible Expo Go runtime or a development build. Reanimated is pinned to 4.3.1 to match the current Expo Go native module; changing only the JavaScript version can cause a runtime mismatch.

If the simulator cannot reach the default Metro host, start with an explicit IPv4 URL:

```sh
REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 pnpm --filter @bklitui/native-demo exec expo start --lan --port 8087
agent-device open "Expo Go" exp://127.0.0.1:8087 --platform ios --session bklit-native
```

Use `agent-device` for simulator interactions and screenshots. When multiple simulators are booted, add `--udid <device-udid>` when opening the session to select the intended device explicitly. To reload this Expo Go setup, reopen its URL with `agent-device open "Expo Go" exp://127.0.0.1:8087 --relaunch --session bklit-native`. Metro's reload endpoint can return 404 with this Expo server; Simulator keyboard shortcuts may trigger Simulator features instead of React Native reload.

## App and styling

Overview demonstrates a revenue card, date range, touch inspection and a progress target. Charts and Studio use the native chart renderer and the shared portable configuration rather than loading the web charts in a WebView.

The appearance switch and range picker use **@expo/ui** universal controls in `Host`: SwiftUI on iOS, Compose on Android, and the Expo UI web implementation in a browser. The drawing uses native SVG; Gesture Handler and Reanimated supply gestures and motion. Charts respect the system Reduce Motion preference where native animation is enabled.

Use `ChartThemeProvider` to set literal native colors. The compositional chart API and native/web differences are documented in [the package README](../../packages/native/README.md). The single-value target component is `ProgressRing`; the multi-series `RingChart` follows the web API.

Both workspace packages are private source packages. Exported chart code assumes they are available in the consuming workspace; do not attempt to install an unpublished `@bklitui/native` npm release.

## Interactive documentation preview

The docs page at `/docs/native` embeds this app's production React Native Web export. It includes the Overview, Charts and Studio routes, served by the docs site under `/native-preview`.

From the repository root, `pnpm exec turbo run dev --filter=web` builds the Expo preview before starting the docs server. `pnpm exec turbo run build --filter=web` includes it in the production site. The generated `dist-docs` and `apps/web/public/native-preview` directories are ignored by Git and cached as task outputs.

For a direct `pnpm --filter web dev` or `build`, first run:

```sh
pnpm exec turbo run build:docs --filter=@bklitui/native-demo
```

The preview is a browser rendering, not an iOS/Android emulator. It uses the same Native package source as the Expo app. Snack embedding is possible in principle, but these private workspace packages must first be published or supplied as a compatible source bundle.

## Checks

For the developer performance lab, open `/performance` through Expo Router. It runs bounded static and synthetic-selection cases and prints selectable JSON. Use `--no-dev --minify` for production JavaScript; Expo Go and simulator results still do not replace a custom release build on physical iOS/Android devices. See [the audit](../../packages/native/AUDIT.md) and run `pnpm --filter @bklitui/native benchmark` for pure geometry timings.

```sh
pnpm --filter @bklitui/native check-types
pnpm --filter @bklitui/native test
pnpm native-demo:check-types
pnpm native-demo:build
pnpm --filter @bklitui/native-demo exec expo install --check
```

`native-demo:build` exports the React Native Web app to `apps/native/dist`. To check iOS bundle generation without compiling a native binary:

```sh
pnpm --filter @bklitui/native-demo exec expo export --platform ios --output-dir dist-ios
```

A web export and an iOS bundle export are packaging checks. Test touch, layout and accessibility in the target native runtime separately; release-device performance and Android behavior need their own verification.
