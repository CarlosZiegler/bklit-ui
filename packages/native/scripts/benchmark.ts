import { arch, cpus, platform } from "node:os";
import { performance } from "node:perf_hooks";
import { projectBarRectangles } from "../src/cartesian/geometry";
import { createCartesianModel } from "../src/cartesian-model";
import { createHeatmapGeometry } from "../src/layouts/heatmap-geometry";
import { sampleHeatmapData } from "../src/layouts/samples";

function measure(name: string, run: () => unknown, iterations = 40) {
  try {
    for (let i = 0; i < 5; i += 1) {
      run();
    }
    const samples = Array.from({ length: iterations }, () => {
      const start = performance.now();
      run();
      return performance.now() - start;
    }).sort((a, b) => a - b);
    return {
      name,
      iterations,
      medianMs: Number(samples[Math.floor(samples.length / 2)]?.toFixed(3)),
      p95Ms: Number(samples[Math.floor(samples.length * 0.95)]?.toFixed(3)),
      maxMs: Number(samples.at(-1)?.toFixed(3)),
    };
  } catch (error) {
    return { name, error: String(error) };
  }
}

const rows = (length: number) =>
  Array.from({ length }, (_, index) => ({
    x: index,
    a: 20 + Math.sin(index / 9) * 8,
    b: 18 + Math.cos(index / 13) * 6,
    c: 16 + Math.sin(index / 21) * 5,
  }));
const results = [100, 1000, 10_000].map((count) => {
  const data = rows(count);
  return measure(`cartesian-${count}-points-3-series`, () =>
    createCartesianModel({
      data,
      dataKeys: ["a", "b", "c"],
      width: 350,
      height: 240,
      xDataKey: "x",
      xScale: "linear",
    })
  );
});
const barData = rows(100);
results.push(
  measure("bar-100-categories-3-series", () =>
    projectBarRectangles({
      data: barData,
      dataKeys: ["a", "b", "c"],
      plot: { left: 42, top: 8, width: 300, height: 220 },
      domain: [0, 35],
    })
  )
);
results.push(
  measure("heatmap-140-cells", () =>
    createHeatmapGeometry(sampleHeatmapData, 350)
  )
);
const largeData = rows(200_000);
results.push(
  measure(
    "cartesian-200000-domain-stress",
    () =>
      createCartesianModel({
        data: largeData,
        dataKeys: ["a"],
        width: 350,
        height: 240,
        xDataKey: "x",
        xScale: "linear",
      }),
    2
  )
);

process.stdout.write(
  `${JSON.stringify(
    {
      environment: {
        node: process.version,
        platform: platform(),
        arch: arch(),
        cpu: cpus()[0]?.model,
      },
      note: "Pure geometry CPU timings in Node; not Hermes, React commits, SVG paint or device FPS.",
      results,
    },
    null,
    2
  )}\n`
);
