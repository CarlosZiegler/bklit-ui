import {
  type ChartSlug,
  type ChartSpec,
  generateNativeCode,
  isChartSlug,
  type JsonValue,
} from "@bklitui/chart-spec";
import { darkChartTheme, lightChartTheme } from "@bklitui/native";
import { Host, Picker, Slider, Switch } from "@expo/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StudioJsonEditor } from "../../components/studio-json-editor";
import {
  chartTitle,
  createNativeChartSpec,
  jsonData,
  type NativeControl,
  nativeChartCatalog,
  scaleSampleData,
} from "../../lib/native-catalog";
import { NativeChartPreview } from "../../lib/native-chart-preview";
import { darkPalette, lightPalette, type Palette } from "../../lib/theme";

const swatches = ["#397db5", "#df9255", "#4f9b73", "#9473c4", "#d46e7d"];

const layerTypesForChart = (chart: ChartSlug) => {
  switch (chart) {
    case "bar-chart":
      return ["series-bar"] as const;
    case "composed-chart":
      return ["series-bar", "area", "line", "profit-loss-line"] as const;
    case "profit-loss-line":
      return ["profit-loss-line", "line"] as const;
    case "scatter-chart":
      return ["line"] as const;
    case "area-chart":
      return ["area", "line"] as const;
    case "line-chart":
      return ["line", "area"] as const;
    default:
      return [] as const;
  }
};

function numericDataKeys(data: JsonValue): string[] {
  if (
    !(Array.isArray(data) && data[0]) ||
    typeof data[0] !== "object" ||
    Array.isArray(data[0])
  ) {
    return [];
  }
  return Object.entries(data[0]).flatMap(([key, value]) =>
    typeof value === "number" ? [key] : []
  );
}

function layerLabel(layer: ChartSpec["layers"][number]): string {
  return layer.id.replaceAll("-", " ");
}

function withStudioScalePalette(spec: ChartSpec, dark: boolean): ChartSpec {
  const scaleColors = (dark ? darkChartTheme : lightChartTheme).scaleColors;
  return { ...spec, theme: { ...spec.theme, scaleColors } };
}

function radialLayerType(
  chart: ChartSlug
): "pie-slice" | "ring" | "radar-area" {
  switch (chart) {
    case "pie-chart":
      return "pie-slice";
    case "ring-chart":
      return "ring";
    default:
      return "radar-area";
  }
}

function appendRadialDatum(
  chart: ChartSlug,
  index: number,
  data: JsonValue
): JsonValue {
  if (chart === "pie-chart") {
    return { label: `Category ${index + 1}`, value: 15 };
  }
  if (chart === "ring-chart") {
    return { label: `Series ${index + 1}`, value: 50, maxValue: 100 };
  }
  const existing = Array.isArray(data) ? data : [];
  const last = existing.at(-1);
  const lastRecord =
    last && typeof last === "object" && !Array.isArray(last)
      ? (last as Record<string, JsonValue>)
      : {};
  const lastValues =
    lastRecord.values &&
    typeof lastRecord.values === "object" &&
    !Array.isArray(lastRecord.values)
      ? (lastRecord.values as Record<string, JsonValue>)
      : {};
  return {
    ...lastRecord,
    label: `Series ${index + 1}`,
    values: Object.fromEntries(
      Object.entries(lastValues).map(([key, value]) => [
        key,
        typeof value === "number" ? Math.round(value * 0.82) : value,
      ])
    ),
  };
}

function layerColorProperty(
  layer: ChartSpec["layers"][number]
): "fill" | "stroke" {
  return layer.type === "area" || layer.type === "series-bar"
    ? "fill"
    : "stroke";
}

function currentLayerColor(
  layer: ChartSpec["layers"][number],
  property: "fill" | "stroke"
): string | undefined {
  if (property === "fill" && "fill" in layer) {
    return layer.fill;
  }
  if (property === "stroke" && "stroke" in layer) {
    return layer.stroke;
  }
  return undefined;
}

function Panel({
  children,
  palette,
  title,
}: {
  children: React.ReactNode;
  palette: Palette;
  title: string;
}) {
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.panelTitle, { color: palette.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function NativeSlider({
  colorScheme,
  label,
  max,
  min,
  onChange,
  palette,
  step,
  unit,
  value,
}: {
  colorScheme: "dark" | "light";
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  palette: Palette;
  step: number;
  unit?: string;
  value: number;
}) {
  const decimals =
    step < 1 ? Math.max(1, String(step).split(".")[1]?.length ?? 1) : 0;
  const safeValue = Math.max(
    min,
    Math.min(max, Number.isFinite(value) ? value : min)
  );
  return (
    <View style={styles.controlBlock}>
      <View style={styles.controlHeading}>
        <Text style={[styles.controlLabel, { color: palette.secondary }]}>
          {label}
        </Text>
        <Text style={[styles.controlValue, { color: palette.text }]}>
          {safeValue.toFixed(decimals)}
          {unit ? ` ${unit}` : ""}
        </Text>
      </View>
      <Host
        colorScheme={colorScheme}
        seedColor={palette.accent}
        style={styles.sliderHost}
      >
        <Slider
          max={max}
          min={min}
          onValueChange={(next) => onChange(Number(next.toFixed(decimals)))}
          step={step}
          value={safeValue}
        />
      </Host>
    </View>
  );
}

function valueForControl(
  control: NativeControl,
  options: Record<string, JsonValue>
) {
  const current = options[control.key];
  if (control.valueTransform === "coordinate-pair" && Array.isArray(current)) {
    return current.join(",");
  }
  if (control.valueTransform === "auto-number" && current === null) {
    return "auto";
  }
  if (current !== undefined) {
    return current;
  }
  if (
    control.valueTransform === "auto-number" &&
    control.options?.includes("auto")
  ) {
    return "auto";
  }
  if (control.type === "color") {
    return options.color ?? null;
  }
  if (control.type === "number") {
    return control.min ?? 0;
  }
  if (control.type === "boolean") {
    return false;
  }
  return control.options?.[0] ?? "";
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This route keeps chart selection, transport spec, live preview, and its native editor panels synchronized in one screen.
export default function StudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ chart?: string | string[] }>();
  const requestedChart = Array.isArray(params.chart)
    ? params.chart[0]
    : params.chart;
  const systemDark = useColorScheme() === "dark";
  const [isDark, setIsDark] = useState(systemDark);
  const [spec, setSpec] = useState<ChartSpec>(() =>
    withStudioScalePalette(createNativeChartSpec("line-chart"), systemDark)
  );
  const [dataScale, setDataScale] = useState(1);
  const [replayKey, setReplayKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const [previewFrameWidth, setPreviewFrameWidth] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [newLayerType, setNewLayerType] = useState<string>("line");
  const [newLayerDataKey, setNewLayerDataKey] = useState<string>("");
  const [showNativeCode, setShowNativeCode] = useState(false);
  const [nativeCode, setNativeCode] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const palette = isDark ? darkPalette : lightPalette;
  const chartEntry = nativeChartCatalog.find(
    (entry) => entry.slug === spec.chart
  );
  const controlsBySection = useMemo(() => {
    const sections = new Map<string, NativeControl[]>();
    for (const control of chartEntry?.controls ?? []) {
      const section = control.section ?? "Chart";
      sections.set(section, [...(sections.get(section) ?? []), control]);
    }
    return [...sections.entries()];
  }, [chartEntry]);
  const options = spec.options as unknown as Record<string, JsonValue>;
  const selectedLayer =
    spec.layers.find((layer) => layer.id === selectedLayerId) ?? spec.layers[0];
  const availableLayerTypes: readonly string[] = layerTypesForChart(spec.chart);
  const availableDataKeys = numericDataKeys(spec.data);
  const colorScheme = isDark ? "dark" : "light";
  const maxContentWidth = 900;
  const previewWidth = Math.min(Math.max(250, width - 40), 640);

  useEffect(() => {
    if (
      requestedChart &&
      isChartSlug(requestedChart) &&
      requestedChart !== spec.chart
    ) {
      const next = withStudioScalePalette(
        createNativeChartSpec(requestedChart),
        isDark
      );
      setSpec(next);
      setDataScale(1);
      setSelectedIndex(undefined);
      setSelectedLayerId(null);
      setNewLayerType(layerTypesForChart(requestedChart)[0] ?? "line");
      setNewLayerDataKey(numericDataKeys(next.data)[0] ?? "");
    }
  }, [requestedChart, spec.chart, isDark]);

  if (!chartEntry) {
    return null;
  }

  const setChart = (value: string | number) => {
    if (!isChartSlug(String(value))) {
      return;
    }
    const next = withStudioScalePalette(
      createNativeChartSpec(String(value) as ChartSlug),
      isDark
    );
    setSpec(next);
    setDataScale(1);
    setSelectedIndex(undefined);
    setSelectedLayerId(null);
    setNewLayerType(
      layerTypesForChart(String(value) as ChartSlug)[0] ?? "line"
    );
    setNewLayerDataKey(numericDataKeys(next.data)[0] ?? "");
    setReplayKey((key) => key + 1);
    router.setParams({ chart: String(value) });
  };

  const updateOption = (key: string, value: JsonValue) => {
    setSpec(
      (current) =>
        ({
          ...current,
          options: { ...current.options, [key]: value },
        }) as ChartSpec
    );
  };

  const unsetOption = (key: string) => {
    setSpec(
      (current) =>
        ({
          ...current,
          options: Object.fromEntries(
            Object.entries(current.options).filter(
              ([optionKey]) => optionKey !== key
            )
          ),
        }) as ChartSpec
    );
  };

  const setAppearance = (dark: boolean) => {
    setIsDark(dark);
    const base = dark ? darkPalette : lightPalette;
    setSpec((current) => ({
      ...current,
      theme: {
        color: base.accent,
        gridColor: base.grid,
        seriesColors: [base.accent, "#e5985d", "#4f9b73", "#9b77c6", "#dc6f7f"],
        scaleColors: (dark ? darkChartTheme : lightChartTheme).scaleColors,
        surfaceColor: base.surface,
        textColor: base.muted,
        trackColor: base.track,
      },
    }));
  };

  const setAccent = (color: string) => {
    setSpec((current) => ({
      ...current,
      theme: {
        ...current.theme,
        color,
        seriesColors: [
          color,
          ...(current.theme.seriesColors ?? swatches).slice(1),
        ],
      },
    }));
  };

  const scaleData = (factor: number) => {
    const ratio = factor / dataScale;
    setDataScale(factor);
    setSpec(
      (current) =>
        ({
          ...current,
          data: jsonData(scaleSampleData(current.data, ratio)),
          ...(current.chart === "gauge-chart" ||
          current.chart === "live-line-chart"
            ? {
                options: {
                  ...current.options,
                  value:
                    Number(
                      (current.options as unknown as Record<string, JsonValue>)
                        .value ?? 68
                    ) * ratio,
                },
              }
            : {}),
        }) as ChartSpec
    );
  };

  const toggleLayer = (id: string) => {
    setSpec(
      (current) =>
        ({
          ...current,
          layers: current.layers.map((layer) =>
            layer.id === id ? { ...layer, visible: !layer.visible } : layer
          ),
        }) as ChartSpec
    );
  };

  const updateLayer = (id: string, property: string, value: JsonValue) => {
    setSpec(
      (current) =>
        ({
          ...current,
          layers: current.layers.map((layer) =>
            layer.id === id ? { ...layer, [property]: value } : layer
          ),
        }) as ChartSpec
    );
  };

  const removeLayer = (id: string) => {
    setSpec((current) => {
      const removed = current.layers.find((layer) => layer.id === id);
      const layers = current.layers
        .filter((layer) => layer.id !== id)
        .map((layer) =>
          removed &&
          "index" in removed &&
          "index" in layer &&
          layer.index > removed.index
            ? { ...layer, index: layer.index - 1 }
            : layer
        );
      const data =
        removed && "index" in removed && Array.isArray(current.data)
          ? jsonData(current.data.filter((_, index) => index !== removed.index))
          : current.data;
      return { ...current, data, layers } as ChartSpec;
    });
    setSelectedLayerId(null);
  };

  const addLayer = () => {
    if (
      spec.chart === "pie-chart" ||
      spec.chart === "ring-chart" ||
      spec.chart === "radar-chart"
    ) {
      const nextIndex = spec.layers.length;
      const id = `${spec.chart}-${nextIndex}`;
      setSelectedLayerId(id);
      setSpec((current) => {
        const existing = Array.isArray(current.data) ? current.data : [];
        return {
          ...current,
          data: jsonData([
            ...existing,
            appendRadialDatum(current.chart, nextIndex, current.data),
          ]),
          layers: [
            ...current.layers,
            {
              id,
              index: nextIndex,
              type: radialLayerType(current.chart),
              visible: true,
            },
          ],
        } as ChartSpec;
      });
      return;
    }
    if (availableLayerTypes.length === 0) {
      return;
    }
    const id = `${newLayerType}-${spec.layers.length + 1}`;
    setSelectedLayerId(id);
    setSpec((current) => {
      const type = newLayerType as (typeof availableLayerTypes)[number];
      const dataKey = newLayerDataKey || availableDataKeys[0];
      if (!(availableLayerTypes.includes(type) && dataKey)) {
        return current;
      }
      return {
        ...current,
        layers: [...current.layers, { id, type, dataKey, visible: true }],
      } as ChartSpec;
    });
  };

  const colorTokens = Array.from(new Set(spec.theme.seriesColors ?? swatches));
  const contentStyle = [styles.page, { maxWidth: maxContentWidth }];

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safe, { backgroundColor: palette.page }]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={contentStyle}>
          <View style={styles.top}>
            <View style={styles.topCopy}>
              <Text style={[styles.eyebrow, { color: palette.muted }]}>
                BK LIT · NATIVE STUDIO
              </Text>
              <Text style={[styles.title, { color: palette.text }]}>
                Studio
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.appearanceRow,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View style={styles.appearanceCopy}>
              <Text style={[styles.controlLabel, { color: palette.text }]}>
                Appearance
              </Text>
              <Text style={[styles.caption, { color: palette.muted }]}>
                Preview in {isDark ? "dark" : "light"} mode
              </Text>
            </View>
            <Host
              colorScheme={colorScheme}
              seedColor={palette.accent}
              style={styles.appearanceControlHost}
            >
              <Switch
                label={isDark ? "Dark" : "Light"}
                onValueChange={setAppearance}
                testID="studio-appearance-switch"
                value={isDark}
              />
            </Host>
          </View>

          <Panel palette={palette} title="Chart preview">
            <View style={styles.chartSelect}>
              <View style={styles.chartSelectCopy}>
                <Text style={[styles.chartName, { color: palette.text }]}>
                  {chartTitle(spec.chart)}
                </Text>
                <Text style={[styles.caption, { color: palette.muted }]}>
                  {chartEntry.description}
                </Text>
              </View>
            </View>
            <View style={styles.pickerRow}>
              <Text style={[styles.controlLabel, { color: palette.secondary }]}>
                Chart family
              </Text>
              <Host
                accessibilityLabel="Choose a chart"
                colorScheme={colorScheme}
                matchContents
              >
                <Picker onValueChange={setChart} selectedValue={spec.chart}>
                  {nativeChartCatalog.map((item) => (
                    <Picker.Item
                      key={item.slug}
                      label={item.title}
                      value={item.slug}
                    />
                  ))}
                </Picker>
              </Host>
            </View>
            <View
              onLayout={(event) =>
                setPreviewFrameWidth(event.nativeEvent.layout.width)
              }
              style={[
                styles.preview,
                { backgroundColor: palette.surface, maxWidth: previewWidth },
              ]}
            >
              <NativeChartPreview
                animationKey={replayKey}
                frameWidth={previewFrameWidth || previewWidth}
                onSelectIndex={setSelectedIndex}
                selectedIndex={selectedIndex}
                spec={spec}
              />
            </View>
            {selectedIndex !== undefined && (
              <Text style={[styles.caption, { color: palette.secondary }]}>
                Data point {selectedIndex + 1} selected · use VoiceOver actions
                or drag across a Cartesian chart to inspect.
              </Text>
            )}
            {spec.chart === "live-line-chart" ? (
              <Text style={[styles.caption, { color: palette.secondary }]}>
                The live stream runs continuously. Use Pause live feed in Motion
                to stop it.
              </Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setReplayKey((key) => key + 1)}
                style={[
                  styles.secondaryButton,
                  { borderColor: palette.border },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: palette.text }]}
                >
                  Replay chart motion
                </Text>
              </Pressable>
            )}
          </Panel>

          <Panel palette={palette} title="Data">
            <Text style={[styles.caption, { color: palette.secondary }]}>
              Scale numeric sample values. Dates, coordinates, labels, and
              network paths stay intact.
            </Text>
            <NativeSlider
              colorScheme={colorScheme}
              label="Value scale"
              max={1.3}
              min={0.7}
              onChange={scaleData}
              palette={palette}
              step={0.05}
              value={dataScale}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => scaleData(1)}
              style={[styles.secondaryButton, { borderColor: palette.border }]}
            >
              <Text
                style={[styles.secondaryButtonText, { color: palette.text }]}
              >
                Reset sample values
              </Text>
            </Pressable>
          </Panel>

          <Panel palette={palette} title="Appearance">
            <Text style={[styles.caption, { color: palette.secondary }]}>
              Accent color
            </Text>
            <View style={styles.swatches}>
              {swatches.map((color) => (
                <Pressable
                  accessibilityLabel={`Set accent ${color}`}
                  accessibilityRole="button"
                  key={color}
                  onPress={() => setAccent(color)}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: color,
                      borderColor:
                        spec.theme.color === color
                          ? palette.text
                          : "transparent",
                    },
                  ]}
                />
              ))}
            </View>
            <NativeSlider
              colorScheme={colorScheme}
              label="Chart height"
              max={380}
              min={180}
              onChange={(value) =>
                setSpec(
                  (current) => ({ ...current, height: value }) as ChartSpec
                )
              }
              palette={palette}
              step={10}
              unit="pt"
              value={spec.height}
            />
            <View style={styles.controlBlock}>
              <View style={styles.controlHeading}>
                <Text
                  style={[styles.controlLabel, { color: palette.secondary }]}
                >
                  Motion
                </Text>
                <Host colorScheme={colorScheme} matchContents>
                  <Switch
                    label={spec.motion.enabled ? "On" : "Off"}
                    onValueChange={(enabled) =>
                      setSpec((current) => ({
                        ...current,
                        motion: { ...current.motion, enabled },
                      }))
                    }
                    value={spec.motion.enabled}
                  />
                </Host>
              </View>
            </View>
            {spec.chart !== "live-line-chart" && (
              <NativeSlider
                colorScheme={colorScheme}
                label="Motion duration"
                max={1600}
                min={0}
                onChange={(duration) =>
                  setSpec((current) => ({
                    ...current,
                    motion: { ...current.motion, duration },
                  }))
                }
                palette={palette}
                step={50}
                unit="ms"
                value={spec.motion.duration}
              />
            )}
          </Panel>

          {controlsBySection.map(([section, controls]) => (
            <Panel key={section} palette={palette} title={section}>
              {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Each descriptor selects its real Expo UI control and write-through behavior. */}
              {controls.map((control) => {
                const currentValue = valueForControl(control, options);
                if (control.type === "number") {
                  return (
                    <NativeSlider
                      colorScheme={colorScheme}
                      key={control.key}
                      label={control.label}
                      max={control.max ?? 100}
                      min={control.min ?? 0}
                      onChange={(value) => updateOption(control.key, value)}
                      palette={palette}
                      step={control.step ?? 1}
                      unit={control.unit}
                      value={
                        typeof currentValue === "number"
                          ? currentValue
                          : (control.min ?? 0)
                      }
                    />
                  );
                }
                if (control.type === "boolean") {
                  return (
                    <View key={control.key} style={styles.controlHeading}>
                      <Text
                        style={[
                          styles.controlLabel,
                          { color: palette.secondary },
                        ]}
                      >
                        {control.label}
                      </Text>
                      <Host colorScheme={colorScheme} matchContents>
                        <Switch
                          label={currentValue === true ? "On" : "Off"}
                          onValueChange={(value) =>
                            updateOption(control.key, value)
                          }
                          value={currentValue === true}
                        />
                      </Host>
                    </View>
                  );
                }
                if (control.type === "color") {
                  return (
                    <View key={control.key} style={styles.controlBlock}>
                      <Text
                        style={[
                          styles.controlLabel,
                          { color: palette.secondary },
                        ]}
                      >
                        {control.label}
                      </Text>
                      <View style={styles.swatches}>
                        {["inherit", ...swatches].map((color) => (
                          <Pressable
                            accessibilityRole="button"
                            key={color}
                            onPress={() =>
                              color === "inherit"
                                ? unsetOption(control.key)
                                : updateOption(control.key, color)
                            }
                            style={[
                              styles.swatch,
                              {
                                backgroundColor:
                                  color === "inherit"
                                    ? palette.accentSoft
                                    : color,
                                borderColor:
                                  (currentValue ?? null) ===
                                  (color === "inherit" ? null : color)
                                    ? palette.text
                                    : "transparent",
                              },
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  );
                }
                const optionsList = control.options ?? [];
                if (!optionsList.length) {
                  return null;
                }
                const selectedValue =
                  typeof currentValue === "string" ||
                  typeof currentValue === "number"
                    ? currentValue
                    : optionsList[0];
                if (selectedValue === undefined) {
                  return null;
                }
                return (
                  <View key={control.key} style={styles.pickerRow}>
                    <Text
                      style={[
                        styles.controlLabel,
                        { color: palette.secondary },
                      ]}
                    >
                      {control.label}
                    </Text>
                    <Host colorScheme={colorScheme} matchContents>
                      <Picker
                        onValueChange={(value) => {
                          if (control.valueTransform === "auto-number") {
                            if (String(value) === "auto") {
                              unsetOption(control.key);
                            } else {
                              updateOption(control.key, Number(value));
                            }
                          } else if (
                            control.valueTransform === "coordinate-pair"
                          ) {
                            const pair = String(value).split(",").map(Number);
                            if (
                              pair.length === 2 &&
                              pair.every(Number.isFinite)
                            ) {
                              updateOption(control.key, pair);
                            }
                          } else {
                            updateOption(control.key, value);
                          }
                        }}
                        selectedValue={selectedValue}
                      >
                        {optionsList.map((option) => (
                          <Picker.Item
                            key={String(option)}
                            label={String(option)}
                            value={option}
                          />
                        ))}
                      </Picker>
                    </Host>
                  </View>
                );
              })}
            </Panel>
          ))}

          <Panel palette={palette} title="Edit data or share a spec">
            <StudioJsonEditor
              colorScheme={colorScheme}
              onApplySpec={(nextSpec) => {
                setSpec(nextSpec);
                setDataScale(1);
                setSelectedLayerId(nextSpec.layers[0]?.id ?? null);
                setReplayKey((key) => key + 1);
              }}
              palette={palette}
              spec={spec}
            />
          </Panel>

          {(spec.layers.length > 0 ||
            availableLayerTypes.length > 0 ||
            (chartEntry.family === "Radial" &&
              spec.chart !== "gauge-chart")) && (
            <Panel palette={palette} title="Layers">
              {spec.layers.map((layer) => (
                <View key={layer.id} style={styles.layerRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: selectedLayer?.id === layer.id,
                    }}
                    onPress={() => setSelectedLayerId(layer.id)}
                    style={[
                      styles.layerCopy,
                      selectedLayer?.id === layer.id && {
                        backgroundColor: palette.surfaceMuted,
                        borderRadius: 8,
                        padding: 7,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.controlLabel, { color: palette.text }]}
                    >
                      {layerLabel(layer)}
                    </Text>
                    <Text style={[styles.caption, { color: palette.muted }]}>
                      {layer.type}
                    </Text>
                  </Pressable>
                  <Host colorScheme={colorScheme} matchContents>
                    <Switch
                      label={layer.visible ? "Visible" : "Hidden"}
                      onValueChange={() => toggleLayer(layer.id)}
                      value={layer.visible}
                    />
                  </Host>
                  <Pressable
                    accessibilityLabel={`Remove ${layerLabel(layer)}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => removeLayer(layer.id)}
                    style={styles.removeButton}
                  >
                    <Text style={[styles.removeText, { color: palette.muted }]}>
                      Remove
                    </Text>
                  </Pressable>
                </View>
              ))}
              {selectedLayer &&
                "dataKey" in selectedLayer &&
                availableDataKeys.length > 0 && (
                  <View style={styles.pickerRow}>
                    <Text
                      style={[
                        styles.controlLabel,
                        { color: palette.secondary },
                      ]}
                    >
                      Data field
                    </Text>
                    <Host colorScheme={colorScheme} matchContents>
                      <Picker
                        onValueChange={(value) =>
                          updateLayer(
                            selectedLayer.id,
                            "dataKey",
                            String(value)
                          )
                        }
                        selectedValue={selectedLayer.dataKey}
                      >
                        {availableDataKeys.map((key) => (
                          <Picker.Item key={key} label={key} value={key} />
                        ))}
                      </Picker>
                    </Host>
                  </View>
                )}
              {selectedLayer &&
                "dataKey" in selectedLayer &&
                availableLayerTypes.length > 1 && (
                  <View style={styles.pickerRow}>
                    <Text
                      style={[
                        styles.controlLabel,
                        { color: palette.secondary },
                      ]}
                    >
                      Layer type
                    </Text>
                    <Host colorScheme={colorScheme} matchContents>
                      <Picker
                        onValueChange={(value) =>
                          updateLayer(selectedLayer.id, "type", String(value))
                        }
                        selectedValue={selectedLayer.type}
                      >
                        {availableLayerTypes.map((type) => (
                          <Picker.Item
                            key={type}
                            label={type.replaceAll("-", " ")}
                            value={type}
                          />
                        ))}
                      </Picker>
                    </Host>
                  </View>
                )}
              {selectedLayer && "dataKey" in selectedLayer && (
                <View style={styles.controlBlock}>
                  <Text
                    style={[styles.controlLabel, { color: palette.secondary }]}
                  >
                    Series color
                  </Text>
                  <View style={styles.swatches}>
                    {colorTokens.map((color) => {
                      const colorProperty = layerColorProperty(selectedLayer);
                      const currentColor = currentLayerColor(
                        selectedLayer,
                        colorProperty
                      );
                      return (
                        <Pressable
                          accessibilityLabel={`Set ${layerLabel(selectedLayer)} color ${color}`}
                          accessibilityRole="button"
                          key={color}
                          onPress={() => {
                            if (selectedLayer.type === "profit-loss-line") {
                              updateLayer(
                                selectedLayer.id,
                                "positiveColor",
                                color
                              );
                              updateLayer(
                                selectedLayer.id,
                                "negativeColor",
                                color
                              );
                            } else {
                              updateLayer(
                                selectedLayer.id,
                                colorProperty,
                                color
                              );
                            }
                          }}
                          style={[
                            styles.swatch,
                            {
                              backgroundColor: color,
                              borderColor:
                                currentColor === color
                                  ? palette.text
                                  : "transparent",
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              )}
              {selectedLayer &&
                "dataKey" in selectedLayer &&
                selectedLayer.type !== "series-bar" && (
                  <NativeSlider
                    colorScheme={colorScheme}
                    label="Stroke width"
                    max={8}
                    min={0.5}
                    onChange={(value) =>
                      updateLayer(selectedLayer.id, "strokeWidth", value)
                    }
                    palette={palette}
                    step={0.5}
                    unit="pt"
                    value={
                      "strokeWidth" in selectedLayer
                        ? (selectedLayer.strokeWidth ?? 2.5)
                        : 2.5
                    }
                  />
                )}
              {selectedLayer &&
                "dataKey" in selectedLayer &&
                selectedLayer.type === "area" && (
                  <NativeSlider
                    colorScheme={colorScheme}
                    label="Area opacity"
                    max={1}
                    min={0.05}
                    onChange={(value) =>
                      updateLayer(selectedLayer.id, "fillOpacity", value)
                    }
                    palette={palette}
                    step={0.05}
                    value={
                      "fillOpacity" in selectedLayer
                        ? (selectedLayer.fillOpacity ?? 0.4)
                        : 0.4
                    }
                  />
                )}
              {availableLayerTypes.length > 0 &&
                availableDataKeys.length > 0 && (
                  <>
                    <View style={styles.pickerRow}>
                      <Text
                        style={[
                          styles.controlLabel,
                          { color: palette.secondary },
                        ]}
                      >
                        New layer
                      </Text>
                      <Host colorScheme={colorScheme} matchContents>
                        <Picker
                          onValueChange={(value) =>
                            setNewLayerType(String(value))
                          }
                          selectedValue={newLayerType}
                        >
                          {availableLayerTypes.map((type) => (
                            <Picker.Item
                              key={type}
                              label={type.replaceAll("-", " ")}
                              value={type}
                            />
                          ))}
                        </Picker>
                      </Host>
                    </View>
                    <View style={styles.pickerRow}>
                      <Text
                        style={[
                          styles.controlLabel,
                          { color: palette.secondary },
                        ]}
                      >
                        Data field
                      </Text>
                      <Host colorScheme={colorScheme} matchContents>
                        <Picker
                          onValueChange={(value) =>
                            setNewLayerDataKey(String(value))
                          }
                          selectedValue={
                            availableDataKeys.includes(newLayerDataKey)
                              ? newLayerDataKey
                              : availableDataKeys[0]
                          }
                        >
                          {availableDataKeys.map((key) => (
                            <Picker.Item key={key} label={key} value={key} />
                          ))}
                        </Picker>
                      </Host>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={addLayer}
                      style={[
                        styles.secondaryButton,
                        { borderColor: palette.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          { color: palette.text },
                        ]}
                      >
                        Add data layer
                      </Text>
                    </Pressable>
                  </>
                )}
              {chartEntry.family === "Radial" &&
                spec.chart !== "gauge-chart" && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={addLayer}
                    style={[
                      styles.secondaryButton,
                      { borderColor: palette.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: palette.text },
                      ]}
                    >
                      Add series layer
                    </Text>
                  </Pressable>
                )}
            </Panel>
          )}

          <Panel palette={palette} title="Native code">
            <Text style={[styles.caption, { color: palette.secondary }]}>
              This example uses the private @bklitui/native workspace source.
              Copy the package into your workspace and install Expo-compatible
              native peers before importing it.
            </Text>
            <View style={styles.codeActions}>
              <Pressable
                accessibilityLabel={
                  showNativeCode
                    ? "Refresh generated native code"
                    : "Generate native code"
                }
                accessibilityRole="button"
                onPress={() => {
                  setNativeCode(generateNativeCode(spec));
                  setShowNativeCode(true);
                }}
                style={[
                  styles.secondaryButton,
                  { borderColor: palette.border },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: palette.text }]}
                >
                  {showNativeCode ? "Refresh code" : "Show code"}
                </Text>
              </Pressable>
              {showNativeCode && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowNativeCode(false)}
                  style={styles.hideCodeButton}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: palette.muted },
                    ]}
                  >
                    Hide
                  </Text>
                </Pressable>
              )}
            </View>
            {showNativeCode && nativeCode !== null && (
              <Text
                selectable
                style={[
                  styles.code,
                  {
                    backgroundColor: isDark ? "#10171b" : "#f4f7f6",
                    color: palette.text,
                  },
                ]}
              >
                {nativeCode}
              </Text>
            )}
            <Text style={[styles.caption, { color: palette.muted }]}>
              Generated source is a snapshot; refresh after chart changes. Large
              map examples can produce longer code.
            </Text>
          </Panel>
          <Text style={[styles.footer, { color: palette.muted }]}>
            The controls above update the same React Native renderer shown in
            the package examples.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { alignItems: "center", paddingHorizontal: 18, paddingBottom: 32 },
  page: { gap: 14, paddingTop: 14, width: "100%" },
  top: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 4,
    minHeight: 48,
  },
  topCopy: { flex: 1, gap: 3, minWidth: 0 },
  appearanceRow: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 14,
    width: "100%",
  },
  appearanceCopy: { flex: 1, gap: 2, minWidth: 0 },
  appearanceControlHost: {
    alignItems: "center",
    flexShrink: 0,
    height: 48,
    justifyContent: "center",
    width: 168,
  },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.1 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.6 },
  panel: { borderRadius: 18, borderWidth: 1, gap: 12, padding: 16 },
  panelTitle: { fontSize: 16, fontWeight: "600" },
  chartSelect: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  chartSelectCopy: { flex: 1, gap: 3, minWidth: 150 },
  chartName: { fontSize: 20, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 18 },
  preview: {
    alignSelf: "center",
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 13,
  },
  secondaryButtonText: { fontSize: 12, fontWeight: "600" },
  controlBlock: { gap: 3 },
  sliderHost: { alignSelf: "stretch", height: 48, width: "100%" },
  controlHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  controlLabel: { fontSize: 13, fontWeight: "500" },
  controlValue: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  swatches: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    paddingVertical: 6,
  },
  swatch: { borderRadius: 12, borderWidth: 2, height: 28, width: 28 },
  pickerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46,
  },
  layerRow: {
    alignItems: "center",
    borderTopColor: "#00000012",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    paddingTop: 5,
  },
  layerCopy: { flex: 1, gap: 2 },
  removeButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    minWidth: 52,
    paddingHorizontal: 6,
  },
  removeText: { fontSize: 11, fontWeight: "500" },
  codeActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  hideCodeButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  code: {
    borderRadius: 12,
    fontFamily: "Menlo",
    fontSize: 11,
    lineHeight: 16,
    overflow: "hidden",
    padding: 14,
  },
  footer: {
    fontSize: 11,
    lineHeight: 17,
    paddingHorizontal: 2,
    paddingVertical: 5,
  },
});
