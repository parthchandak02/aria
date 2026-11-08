import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./acceptance/types";
import { appSchema } from "./app-schema";
import { ariaReadiness, ariaSectionInventory } from "../aria/aria-inventory";
import { ARIA_TARGETS, CITY_PRESETS } from "../aria/aria-settings";

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: { mode: "none" },
  mode: "new-toolcraft-app",
  referenceInputs: [],
};

export const appProductReadiness: ToolcraftProductReadiness = ariaReadiness;

export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = ariaSectionInventory;

type Budget = "extended-io" | "standard";
const browser = (testName: string, file: `e2e/${string}.spec.ts`, budget: Budget = "standard") => ({ budget, file, testName });

const domainFile = (id: string) => `e2e/product-aria-${id.split(".")[0]}.spec.ts` as const;

const sliderRow = (id: string, target: string, label: string, observable: string, interactionId: string): ToolcraftComponentAcceptance => ({
  automated: true,
  automatedTestName: `aria control ${target}`,
  browser: browser(`browser: aria control ${target}`, domainFile(id)),
  componentType: "slider",
  evidence: "product-output",
  expectedObservable: observable,
  fixture: "Default San Francisco with stubbed Open-Meteo data",
  id,
  interactionId,
  kind: "control",
  target,
  userAction: `Drag the ${label} slider.`,
});

const actionRow = (id: string, target: string, values: readonly string[], observable: string, interactionId: string): ToolcraftComponentAcceptance => ({
  actionCoverage: values,
  automated: true,
  automatedTestName: `aria control ${target}`,
  browser: browser(`browser: aria control ${target}`, domainFile(id)),
  componentType: "actions",
  evidence: "product-output",
  expectedObservable: observable,
  fixture: "Default San Francisco with stubbed Open-Meteo data",
  id,
  interactionId,
  kind: "control",
  target,
  userAction: "Click every button.",
});

const runtimeRow = (id: string, target: string, evidence: ToolcraftComponentAcceptance["evidence"], testName: string, file: `e2e/${string}.spec.ts`, budget: Budget = "standard"): ToolcraftComponentAcceptance => ({
  automated: true,
  automatedTestName: `aria contract ${id}`,
  browser: browser(testName, file, budget),
  componentType: id,
  evidence,
  expectedObservable: `The real product output and runtime workspace implement ${id}.`,
  fixture: "Default settings and real Toolcraft controls",
  id,
  kind: "runtime",
  target,
  userAction: `Exercise ${id} through its visible controls.`,
});

const exportTest = "browser: aria image export delivers every format and size";

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  sliderRow("place.latitude", ARIA_TARGETS.latitude, "Latitude", "The place changes, the air data reloads and the AQI, gauges, dot field and forecast change.", "latitude-property"),
  sliderRow("place.longitude", ARIA_TARGETS.longitude, "Longitude", "The place changes, the air data reloads and the poster changes.", "longitude-property"),
  actionRow("place.city", ARIA_TARGETS.cityPreset, CITY_PRESETS.map((city) => city.value), "Each city sets both sliders and the poster names the city with its own air data.", "city-command"),
  {
    ...sliderRow("field.pollutant", ARIA_TARGETS.focus, "Pollutant", "Each pollutant changes the dot count and colour, the field caption and the forecast bars.", "pollutant-property"),
    componentType: "segmented",
    optionCoverage: ["pm25", "pm10", "no2", "ozone"],
    userAction: "Choose every Pollutant option.",
  },
  {
    ...runtimeRow("appearance.background", ARIA_TARGETS.background, "product-output", "browser: aria background color changes output", "e2e/product-aria-appearance.spec.ts"),
    componentType: "color",
    interactionId: "background-color-property",
    kind: "control",
  },
  {
    ...runtimeRow("background.output", ARIA_TARGETS.includeBackground, "product-output", "browser: aria background output follows runtime semantics", "e2e/product-aria-background.spec.ts"),
    backgroundOutputCoverage: "all-required-background-output",
    componentType: "switch",
    interactionId: "background-include-property",
    kind: "control",
  },
  ...(["format", "resolution"] as const).map(
    (key): ToolcraftComponentAcceptance => ({
      ...runtimeRow(`export.image.${key}`, `export.image.${key}`, "exported-bytes", exportTest, "e2e/product-aria-export.spec.ts", "extended-io"),
      componentType: "select",
      kind: "control",
      optionCoverage: key === "format" ? ["png", "jpg"] : ["2k", "4k", "8k"],
    }),
  ),
  {
    ...runtimeRow("export.image", "actions.output", "exported-bytes", exportTest, "e2e/product-aria-export.spec.ts", "extended-io"),
    actionCoverage: ["export.png"],
    componentType: "panelActions",
    kind: "control",
    exportArtifactCoverage: "all-required-image-export-behavior",
  },
  {
    ...runtimeRow("export.infinity", "actions.output", "exported-bytes", exportTest, "e2e/product-aria-export.spec.ts", "extended-io"),
    infinityCanvasCoverage: "scene-bounds-image-export",
  },
  {
    ...runtimeRow("canvas.size", "canvas.size.width", "product-output", "browser: aria canvas sizing changes output", "e2e/product-aria-canvas.spec.ts"),
  },
  {
    ...runtimeRow("canvas.scale", "canvas.renderScale", "product-output", "browser: aria backing preserves selected render scale", "e2e/product-aria-canvas.spec.ts"),
    renderScaleCoverage: { kind: "selected-backing-pixels", states: ["interaction", "steady"] },
  },
  {
    ...runtimeRow("canvas.infinity", "canvas.infinity", "viewport-side-effect", "browser: aria infinity preserves scene and viewport", "e2e/product-aria-canvas.spec.ts"),
    infinityCanvasCoverage: "mode-continuity-and-restoration",
  },
  {
    automated: true,
    automatedTestName: "declares production reload coverage for the starter schema",
    browser: {
      budget: "extended-io",
      file: "e2e/product-aria-persistence.spec.ts",
      testName: "browser: aria restores poster and workspace after reload",
    },
    componentType: "persistence",
    evidence: "persistence-state",
    expectedObservable: "Canvas size, zoom, the chosen city and the moved, collapsed Controls panel are restored after a real reload, and the poster matches its pre-reload pixels.",
    fixture: "Aria persisted workspace",
    id: "persistence.reload",
    kind: "runtime",
    persistenceCoverage: "reload",
    persistenceSlices: appSchema.persistence.storage === "localStorage" ? appSchema.persistence.include : [],
    target: "canvas.size.width",
    userAction: "Change Canvas width, pick Delhi, zoom in, move and collapse Controls, wait for persistence, and reload the page.",
  },
];
