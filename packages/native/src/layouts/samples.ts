import { feature } from "topojson-client";
import type {
  GeometryCollection,
  Properties,
  Topology,
} from "topojson-specification";
import worldTopologyJson from "world-atlas/countries-110m.json";
import type {
  ChoroplethFeatureProperties,
  ChoroplethGeoJson,
} from "./choropleth";
import type { FunnelStage } from "./funnel-geometry";
import type { HeatmapColumn } from "./heatmap-geometry";
import type { SankeyData } from "./sankey-geometry";
import type { SunburstNode } from "./sunburst-geometry";

export const sampleHeatmapData: HeatmapColumn[] = Array.from(
  { length: 20 },
  (_, week) => {
    const sunday = new Date(2026, 0, 4 + week * 7);
    return {
      bin: week,
      bins: Array.from({ length: 7 }, (_, day) => {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + day);
        // The web contribution scale uses 0, 1, 2, 3 and 4+ contributions.
        const count = (week * 3 + day * 2) % 5;
        return { bin: day, count, date };
      }),
    };
  }
);

export const sampleFunnelData: FunnelStage[] = [
  { label: "Visits", value: 12_400, color: "#397db5" },
  { label: "Sign up", value: 6820, color: "#4f9b73" },
  { label: "Trial", value: 3180, color: "#e5985d" },
  { label: "Paid", value: 1460, color: "#9b77c6" },
];

export const sampleSankeyData: SankeyData = {
  nodes: [
    { name: "Organic", category: "source" },
    { name: "Referral", category: "source" },
    { name: "Campaign", category: "source" },
    { name: "Website", category: "landing" },
    { name: "Trial", category: "landing" },
    { name: "Paid", category: "outcome" },
    { name: "Churned", category: "outcome" },
  ],
  links: [
    { source: 0, target: 3, value: 56 },
    { source: 1, target: 3, value: 28 },
    { source: 2, target: 3, value: 16 },
    { source: 3, target: 4, value: 61 },
    { source: 3, target: 6, value: 39 },
    { source: 4, target: 5, value: 42 },
    { source: 4, target: 6, value: 19 },
  ],
};

export const sampleSunburstData: SunburstNode = {
  name: "Revenue",
  children: [
    {
      name: "Enterprise",
      color: "#397db5",
      children: [
        { name: "Annual", value: 48 },
        { name: "Monthly", value: 21 },
      ],
    },
    {
      name: "Self serve",
      color: "#4f9b73",
      children: [
        { name: "Annual", value: 19 },
        { name: "Monthly", value: 32 },
      ],
    },
    {
      name: "Services",
      color: "#e5985d",
      children: [
        { name: "Training", value: 13 },
        { name: "Support", value: 9 },
      ],
    },
    {
      name: "Partners",
      color: "#9b77c6",
      children: [
        { name: "Reseller", value: 24 },
        { name: "Referral", value: 11 },
      ],
    },
  ],
};

type WorldCountryProperties = Properties & { name?: string };
const worldTopology = worldTopologyJson as unknown as Topology<{
  countries: GeometryCollection<WorldCountryProperties>;
  land: GeometryCollection<WorldCountryProperties>;
}>;
const worldFeatures = feature(worldTopology, worldTopology.objects.countries);

export const sampleChoroplethData: ChoroplethGeoJson = {
  type: "FeatureCollection",
  features:
    worldFeatures.type === "FeatureCollection"
      ? worldFeatures.features.map((item, index) => ({
          ...item,
          properties: {
            ...(item.properties ?? {}),
            id: item.id,
            name:
              (item.properties as ChoroplethFeatureProperties | null)?.name ??
              `Region ${index + 1}`,
            activity: (Number(item.id) || index * 37) % 100,
          },
        }))
      : [],
};

export const nativeLayoutSampleData = {
  "heatmap-chart": sampleHeatmapData,
  "funnel-chart": sampleFunnelData,
  "sankey-chart": sampleSankeyData,
  "sunburst-chart": sampleSunburstData,
  "choropleth-chart": sampleChoroplethData,
} as const;
