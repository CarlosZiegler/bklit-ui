import { type ChartSpec, parseChartSpec } from "@bklitui/chart-spec";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Palette } from "../lib/theme";

type EditorMode = "data" | "spec";

export interface StudioJsonEditorProps {
  colorScheme: "dark" | "light";
  onApplySpec: (spec: ChartSpec) => void;
  palette: Palette;
  spec: ChartSpec;
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function messageForError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The JSON could not be applied.";
}

/** Edits a portable chart spec or its data while retaining the last valid preview. */
export function StudioJsonEditor({
  colorScheme,
  onApplySpec,
  palette,
  spec,
}: StudioJsonEditorProps) {
  const [mode, setMode] = useState<EditorMode | null>(null);
  const [dataDraft, setDataDraft] = useState<string | null>(null);
  const [specDraft, setSpecDraft] = useState<string | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const activeMode = modeRef.current;
    if (activeMode === "data") {
      setDataDraft(formatJson(spec.data));
      setSpecDraft(null);
    } else if (activeMode === "spec") {
      setDataDraft(null);
      setSpecDraft(formatJson(spec));
    } else {
      setDataDraft(null);
      setSpecDraft(null);
    }
    setError(null);
  }, [spec]);

  const activeDraft = mode === "spec" ? specDraft : dataDraft;
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const statusText = error ?? notice;
  const statusStyle = error ? styles.error : styles.notice;
  let subtitle = "Open a JSON editor when you need to change chart data.";
  if (mode === "data") {
    subtitle = "Edit data for this chart.";
  } else if (mode === "spec") {
    subtitle = "Edit the complete portable chart spec.";
  }

  const openEditor = (nextMode: EditorMode) => {
    setMode(nextMode);
    if (nextMode === "data" && dataDraft === null) {
      setDataDraft(formatJson(spec.data));
    }
    if (nextMode === "spec" && specDraft === null) {
      setSpecDraft(formatJson(spec));
    }
    setError(null);
    setNotice(null);
  };

  const updateDraft = (text: string) => {
    if (mode === "data") {
      setDataDraft(text);
    } else if (mode === "spec") {
      setSpecDraft(text);
    }
    setError(null);
    setNotice(null);
  };

  const resetDraft = () => {
    if (mode === "data") {
      setDataDraft(formatJson(spec.data));
    } else if (mode === "spec") {
      setSpecDraft(formatJson(spec));
    }
    setError(null);
    setNotice("Draft reset to the current chart.");
  };

  const applyDraft = () => {
    if (!mode || activeDraft === null) {
      return;
    }
    try {
      const nextSpec =
        mode === "spec"
          ? parseChartSpec(activeDraft)
          : parseChartSpec(
              JSON.stringify({ ...spec, data: JSON.parse(activeDraft) })
            );
      onApplySpec(nextSpec);
      setError(null);
      setNotice("Applied to the preview.");
    } catch (cause) {
      setError(messageForError(cause));
      setNotice(null);
    }
  };

  const shareSpec = async () => {
    try {
      await Share.share({
        message: formatJson(spec),
        title: `${spec.chart} chart spec`,
      });
      setNotice("Current chart spec shared.");
      setError(null);
    } catch (cause) {
      setError(messageForError(cause));
      setNotice(null);
    }
  };

  const closeEditor = () => {
    setMode(null);
    setDataDraft(null);
    setSpecDraft(null);
    setError(null);
    setNotice(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>JSON editor</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable
          accessibilityLabel={
            mode ? "Close JSON editor" : "Share current chart spec"
          }
          accessibilityRole="button"
          onPress={mode ? closeEditor : shareSpec}
          style={({ pressed }) => [
            styles.quietButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.quietButtonText}>{mode ? "Done" : "Share"}</Text>
        </Pressable>
      </View>

      {mode ? (
        <>
          <View accessibilityRole="tablist" style={styles.modeSwitch}>
            {(["data", "spec"] as const).map((nextMode) => {
              const selected = mode === nextMode;
              const label = nextMode === "data" ? "Data" : "Full spec";
              return (
                <Pressable
                  accessibilityLabel={`${label} JSON`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={nextMode}
                  onPress={() => openEditor(nextMode)}
                  style={[
                    styles.modeButton,
                    selected && styles.modeButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      selected && styles.modeTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            accessibilityHint={
              mode === "data"
                ? "Edit the chart data as JSON. Apply validates it against this chart family."
                : "Edit the complete version 1 chart spec. Apply validates the chart and its data."
            }
            accessibilityLabel={
              mode === "data" ? "Chart data JSON" : "Full chart spec JSON"
            }
            autoCapitalize="none"
            autoCorrect={false}
            keyboardAppearance={colorScheme}
            multiline
            onChangeText={updateDraft}
            placeholder="Enter valid JSON"
            placeholderTextColor={palette.muted}
            scrollEnabled
            spellCheck={false}
            style={styles.input}
            textAlignVertical="top"
            value={activeDraft ?? ""}
          />

          {statusText ? (
            <Text accessibilityLiveRegion="polite" style={statusStyle}>
              {statusText}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityLabel="Reset JSON draft"
              accessibilityRole="button"
              onPress={resetDraft}
              style={({ pressed }) => [
                styles.quietButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.quietButtonText}>Reset</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Share current chart spec"
              accessibilityRole="button"
              onPress={shareSpec}
              style={({ pressed }) => [
                styles.quietButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.quietButtonText}>Share</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Apply JSON to chart preview"
              accessibilityRole="button"
              onPress={applyDraft}
              style={({ pressed }) => [
                styles.applyButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.entryActions}>
            <Pressable
              accessibilityLabel="Edit chart data as JSON"
              accessibilityRole="button"
              onPress={() => openEditor("data")}
              style={({ pressed }) => [
                styles.quietButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.quietButtonText}>Edit data</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Edit full chart spec as JSON"
              accessibilityRole="button"
              onPress={() => openEditor("spec")}
              style={({ pressed }) => [
                styles.applyButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.applyButtonText}>Full spec</Text>
            </Pressable>
          </View>
          {statusText ? (
            <Text accessibilityLiveRegion="polite" style={statusStyle}>
              {statusText}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    actions: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 12,
    },
    applyButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: 11,
      justifyContent: "center",
      minHeight: 42,
      minWidth: 88,
      paddingHorizontal: 16,
    },
    applyButtonText: {
      color: palette.surface,
      fontSize: 14,
      fontWeight: "700",
    },
    container: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 16,
    },
    entryActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },
    error: {
      color: "#b42318",
      fontSize: 13,
      lineHeight: 18,
      marginTop: 10,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
    },
    headingCopy: { flex: 1, gap: 3 },
    input: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      color: palette.text,
      fontFamily: "Menlo",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
      minHeight: 230,
      padding: 12,
    },
    modeButton: {
      alignItems: "center",
      borderRadius: 9,
      flex: 1,
      justifyContent: "center",
      minHeight: 36,
      paddingHorizontal: 10,
    },
    modeButtonSelected: { backgroundColor: palette.surface },
    modeSwitch: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 11,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: 4,
      marginTop: 14,
      padding: 4,
    },
    modeText: { color: palette.secondary, fontSize: 13, fontWeight: "600" },
    modeTextSelected: { color: palette.text },
    notice: {
      color: palette.secondary,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 10,
    },
    pressed: { opacity: 0.72 },
    quietButton: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 11,
      borderWidth: StyleSheet.hairlineWidth,
      justifyContent: "center",
      minHeight: 42,
      minWidth: 70,
      paddingHorizontal: 12,
    },
    quietButtonText: { color: palette.text, fontSize: 13, fontWeight: "600" },
    subtitle: { color: palette.secondary, fontSize: 12, lineHeight: 17 },
    title: { color: palette.text, fontSize: 16, fontWeight: "700" },
  });
}
