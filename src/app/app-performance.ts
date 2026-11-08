import { defineToolcraftPerformance, deriveToolcraftPerformancePaths, type ToolcraftPerformanceScenario } from "@/toolcraft/runtime";

import { ariaPerformanceModel } from "../aria/aria-performance-model";
import { appSchema } from "./app-schema";

export const ariaPerformancePaths = deriveToolcraftPerformancePaths(appSchema, ariaPerformanceModel);

export const appPerformance = defineToolcraftPerformance({
  ...ariaPerformanceModel,
  scenarios: ariaPerformancePaths.map(
    (path, index): ToolcraftPerformanceScenario =>
      ({
        automated: true,
        automatedTestName: "aria render plan has valid derived paths and fixtures",
        browser: true,
        browserTestName: `browser perf: toolcraft path ${path.id}`,
        coversTargets: path.targets,
        expectedObservable: "The air poster, viewport or decoded artifact reflects the exact applied operation.",
        fixture: "Compiled reachable aria workload",
        id: `aria-path-${index}`,
        interaction: path.interaction,
        pathId: path.id,
        uiSelector: '[data-testid="aria-output"]',
        ...(path.interaction === "export" ? { actionValue: "export.png", completionEvidence: "download" as const, controlLabel: "Export PNG" } : {}),
      }) as ToolcraftPerformanceScenario,
  ),
});
