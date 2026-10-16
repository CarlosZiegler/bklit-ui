# Native radial charts

The radial entry point exports native versions of the web pie, multi-ring, gauge, and radar chart families. They use `react-native-svg`, Reanimated, and the shared `ChartThemeProvider`. Data structures and geometric units match the web APIs: pie and ring angles are radians; gauge angles are degrees.

## Pie chart

```tsx
<PieChart
  data={[
    { label: "Rent", value: 42, color: "#397db5" },
    { label: "Food", value: 31 },
    { label: "Travel", value: 27 },
  ]}
  innerRadius={68}
  size={260}
>
  <PieSlice index={0} />
  <PieSlice index={1} />
  <PieSlice index={2} />
  <PieCenter />
</PieChart>
```

`PieChart` takes `data`, `size`, `innerRadius`, `padAngle`, `cornerRadius`, `startAngle`, `endAngle`, `hoverOffset`, and controlled `hoveredIndex`/`onHoverChange`. `PieSlice` takes the web `index`, `color`, `fill`, `animate`, `hoverEffect`, and `hoverOffset` props. Tap a slice to select it; tap it again to clear selection. The chart is exposed as an adjustable accessibility element, with increment/decrement actions to move through slices. `PieCenter` displays the sum, or the selected slice, and accepts `defaultLabel`, `prefix`, `suffix`, `formatValue`, text styles, or a custom render function.

## Multi-ring chart

```tsx
<RingChart
  data={[
    { label: "Design", value: 72, maxValue: 100 },
    { label: "Build", value: 48, maxValue: 60 },
    { label: "Ship", value: 15, maxValue: 30 },
  ]}
  size={260}
  baseInnerRadius={42}
>
  <Ring index={0} />
  <Ring index={1} />
  <Ring index={2} />
  <RingCenter />
</RingChart>
```

`RingChart` takes the web data fields (`label`, `value`, `maxValue`, optional `color`) plus `size`, `strokeWidth`, `ringGap`, `baseInnerRadius`, `animationDuration`, radians `startAngle`/`endAngle`, and controlled selection props. Dimensions scale down together to fit the available size. `Ring` supports `index`, `color`, `animate`, and `lineCap`; `RingCenter` uses the selected ring value or total value.

## Gauge

```tsx
<Gauge
  value={68}
  totalNotches={36}
  centerValue={68}
  orientation="arc"
  startAngle={135}
  endAngle={405}
/>
```

`Gauge` supports the web notch geometry props: `orientation`, `value`, `totalNotches`, `spacing`, `notchCornerRadius`, `uniformWidth`, degree `startAngle`/`endAngle`, `notchLengthPercent`, `notchWidthPercent`, `activeFill`, `inactiveFill`, their opacities, `useGradient`, and gradient endpoint tuples. `animationDuration` sets the entrance length in milliseconds, and changing `animationKey` replays it. It renders rectangular or tapered native SVG notches. For `orientation="linear"`, `linearHeight` sets the track height and `labelPlacement` can be `top`, `bottom`, `left`, or `right` when `centerValue` is present.

## Radar chart

```tsx
const metrics = [
  { key: "speed", label: "Speed" },
  { key: "quality", label: "Quality" },
  { key: "focus", label: "Focus" },
  { key: "reliability", label: "Reliability" },
  { key: "support", label: "Support" },
];

<RadarChart
  metrics={metrics}
  data={[
    { label: "Current", values: { speed: 82, quality: 74, focus: 91, reliability: 68, support: 77 } },
    { label: "Target", values: { speed: 74, quality: 90, focus: 76, reliability: 88, support: 82 } },
  ]}
  size={280}
>
  <RadarGrid />
  <RadarAxis />
  <RadarArea index={0} />
  <RadarArea index={1} />
  <RadarLabels />
</RadarChart>
```

Metric values use the web 0–100 scale. `RadarChart` keeps the web `data`, `metrics`, `size`, `levels`, `margin`, animation timing, and controlled selection props. `RadarGrid`, `RadarAxis`, `RadarLabels`, and `RadarArea` render native SVG layers; tapping an area selects it and changes its emphasis.

## Native differences

Chart colors resolve to literal theme colors and update with the system color scheme. Web CSS classes and CSS-variable fills do not apply; use theme colors, literal color props, and React Native `style` values. Pie and ring hover interactions become persistent touch selection. Their glow filters and spring hover morphs are omitted. Gauge gradient tuples are sampled into native per-notch colors, and web pattern definitions need equivalent React Native SVG definitions. Radar hover glow and pointer hover are omitted; touch selection and VoiceOver/TalkBack adjustable actions are available.
