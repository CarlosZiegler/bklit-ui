import {
  type SankeyGraph,
  type SankeyLink,
  type SankeyNode,
  sankey,
  sankeyCenter,
  sankeyLinkHorizontal,
} from "d3-sankey";

export interface SankeyNodeDatum {
  name: string;
  category?: "source" | "landing" | "outcome";
  [key: string]: unknown;
}

export interface SankeyLinkDatum {
  source: number;
  target: number;
  value: number;
  [key: string]: unknown;
}

export interface SankeyData {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
}

export type LaidOutSankeyNode = SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
export type LaidOutSankeyLink = SankeyLink<SankeyNodeDatum, SankeyLinkDatum>;
export type LaidOutSankeyGraph = SankeyGraph<SankeyNodeDatum, SankeyLinkDatum>;

export function createSankeyLayout(
  data: SankeyData,
  width: number,
  height: number,
  nodeWidth = 16,
  nodePadding = 24
): LaidOutSankeyGraph {
  const graph = {
    nodes: data.nodes.map((node) => ({ ...node })),
    links: data.links.map((link) => ({ ...link })),
  };
  if (graph.nodes.length === 0 || width <= 0 || height <= 0) {
    return { nodes: [], links: [] };
  }
  return sankey<SankeyNodeDatum, SankeyLinkDatum>()
    .nodeWidth(nodeWidth)
    .nodePadding(Math.max(0, nodePadding))
    .nodeAlign(sankeyCenter)
    .extent([
      [0, 0],
      [width, height],
    ])(graph);
}

export function sankeyLinkPath(link: LaidOutSankeyLink): string {
  return sankeyLinkHorizontal<SankeyNodeDatum, SankeyLinkDatum>()(link) ?? "";
}
