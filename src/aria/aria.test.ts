import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { assessToolcraftRenderPlan, compileToolcraftPerformanceFixturePlan } from "@/toolcraft/runtime";

import { ariaPerformancePaths, appPerformance } from "../app/app-performance";
import { appSchema } from "../app/app-schema";
import { aqiBand, clearAirDataCache, fallbackAirData, loadAirData, parseAirQualityResponse, type AirData } from "./air-data";
import { handleAriaAction } from "./aria-actions";
import { ariaInk, drawAria, particleCount } from "./aria-draw";
import { ariaExport } from "./aria-export";
import { ariaPerformanceModel } from "./aria-performance-model";
import { ariaPipeline } from "./aria-pipeline";
import { ARIA_TARGETS, CITY_PRESETS, readAriaSettings } from "./aria-settings";

type Call = unknown[];

function recordingContext(calls: Call[]): CanvasRenderingContext2D {
  let font = "10px sans-serif";
  return new Proxy({}, {
    get: (_target, key) => {
      if (key === "font") return font;
      if (key === "measureText") return (text: string) => ({ width: text.length * parseFloat(/(\d+(\.\d+)?)px/.exec(font)?.[1] ?? "10") * 0.55 });
      return (...args: unknown[]) => calls.push([key, ...args]);
    },
    set: (_target, key, value) => {
      if (key === "font") font = value;
      calls.push([key, value]);
      return true;
    },
  }) as CanvasRenderingContext2D;
}

const DATA: AirData = {
  ...fallbackAirData(),
  current: { carbonMonoxide: 320, no2: 41, ozone: 72, pm10: 60, pm25: 38, time: "2026-06-21T14:00", usAqi: 108 },
  source: "live",
  timezone: "Asia/Kolkata",
};

function draw(values: Record<string, unknown> = {}, data = DATA, width = 1920, height = 1080): Call[] {
  const calls: Call[] = [];
  drawAria(recordingContext(calls), width, height, readAriaSettings(values), data);
  return calls;
}
const signature = (calls: Call[]) => createHash("sha256").update(JSON.stringify(calls)).digest("hex");
const texts = (calls: Call[]) => calls.filter((call) => call[0] === "fillText").map((call) => String(call[1]));
const DEFAULT = signature(draw());

describe("air data", () => {
  it("parses the Open-Meteo response shape", () => {
    const parsed = parseAirQualityResponse({
      current: { carbon_monoxide: 143, nitrogen_dioxide: 6.5, ozone: 65, pm10: 6.1, pm2_5: 4.7, time: "2026-11-08T14:00", us_aqi: 47 },
      hourly: { nitrogen_dioxide: [1], ozone: [2], pm10: [3], pm2_5: [4], time: ["2026-11-08T00:00"], us_aqi: [40] },
      timezone: "America/Los_Angeles",
      utc_offset_seconds: -28800,
    });
    expect(parsed?.current.usAqi).toBe(47);
    expect(parsed?.hourly.pm25).toEqual([4]);
    expect(parsed?.timezone).toBe("America/Los_Angeles");
    expect(parseAirQualityResponse({ error: true })).toBeNull();
  });

  it("falls back to a labelled offline sample when the API fails", async () => {
    clearAirDataCache();
    const data = await loadAirData(10, 10, (async () => { throw new Error("offline"); }) as unknown as typeof fetch);
    expect(data.source).toBe("fallback");
    expect(texts(draw({}, data)).join("")).toContain("offline sample");
  });

  it("maps AQI to the EPA bands", () => {
    expect(aqiBand(30).label).toBe("Good");
    expect(aqiBand(108).label).toBe("Unhealthy for sensitive groups");
    expect(aqiBand(420).label).toBe("Hazardous");
  });
});

describe("Aria controls", () => {
  it("aria control place.latitude", () => {
    expect(signature(draw({ [ARIA_TARGETS.latitude]: 28.6 }))).not.toBe(DEFAULT);
    expect(texts(draw({ [ARIA_TARGETS.latitude]: 28.6 })).join("")).toContain("28.6°N");
  });

  it("aria control place.longitude", () => {
    expect(texts(draw({ [ARIA_TARGETS.longitude]: 77.2 })).join("")).toContain("77.2°E");
  });

  it("aria control place.city", () => {
    for (const city of CITY_PRESETS) {
      const dispatch = vi.fn();
      handleAriaAction({ action: { value: city.value }, dispatch });
      expect(dispatch.mock.calls.map(([command]) => command)).toEqual([
        expect.objectContaining({ target: ARIA_TARGETS.latitude, value: city.latitude }),
        expect.objectContaining({ target: ARIA_TARGETS.longitude, value: city.longitude }),
      ]);
      expect(readAriaSettings({ [ARIA_TARGETS.latitude]: city.latitude, [ARIA_TARGETS.longitude]: city.longitude }).placeName).toBe(city.label);
    }
  });

  it("aria control field.pollutant", () => {
    const signatures = new Set(["pm25", "pm10", "no2", "ozone"].map((focus) => signature(draw({ [ARIA_TARGETS.focus]: focus }))));
    expect(signatures.size).toBe(4);
    expect(particleCount(DATA.current.pm25, 15)).toBeGreaterThan(particleCount(DATA.current.ozone, 100));
  });
});

describe("Aria contracts", () => {
  it("aria contract appearance.background", () => {
    expect(ariaInk({ background: "#0E1116", includeBackground: true })).toBe("#F1F3F5");
    expect(ariaInk({ background: "#F4F1EA", includeBackground: true })).toBe("#12161D");
    expect(signature(draw({ [ARIA_TARGETS.background]: "#F4F1EA" }))).not.toBe(DEFAULT);
  });

  it("aria contract background.output", () => {
    const fullFills = (calls: Call[]) => calls.filter((call) => call[0] === "fillRect" && call[3] === 1920 && call[4] === 1080);
    expect(fullFills(draw())).toHaveLength(0);
    expect(fullFills(draw({ [ARIA_TARGETS.includeBackground]: false }))).toHaveLength(0);
  });

  it("aria contract export.image.format", () => {
    const control = appSchema.panels.controls?.sections.flatMap((section) => Object.values(section.controls)).find((entry) => entry.target === "export.image.format");
    expect(control?.options?.map((option) => option.value)).toEqual(["png", "jpg"]);
  });

  it("aria contract export.image.resolution", () => {
    const control = appSchema.panels.controls?.sections.flatMap((section) => Object.values(section.controls)).find((entry) => entry.target === "export.image.resolution");
    expect(control?.options?.map((option) => option.value)).toEqual(["2k", "4k", "8k"]);
  });

  it("aria contract export.image", async () => {
    clearAirDataCache();
    vi.stubGlobal("fetch", async () => ({ json: async () => ({}) }));
    const calls: Call[] = [];
    await ariaExport.renderFrame({ context: recordingContext(calls), frame: { height: 1080, width: 1920, x: -960, y: -540 }, signal: new AbortController().signal, state: { values: {} } } as unknown as Parameters<typeof ariaExport.renderFrame>[0]);
    vi.unstubAllGlobals();
    expect(calls[1]).toEqual(["translate", -960, -540]);
    expect(texts(calls).join("")).toContain("US AIR QUALITY INDEX".split("").join(""));
  });

  it("aria contract export.infinity", () => {
    expect(ariaPipeline.passes.find((pass) => pass.id === "raster")?.sceneBounds?.kind).toBe("intrinsic");
  });

  it("aria contract canvas.size", () => {
    expect(signature(draw({}, DATA, 960, 540))).not.toBe(DEFAULT);
  });

  it("aria contract canvas.scale", () => {
    const raster = ariaPipeline.passes.find((pass) => pass.id === "raster");
    expect(raster?.invalidatedBy).toContain("canvas.renderScale");
    expect(appSchema.canvas.renderScale.enabled).toBe(true);
  });

  it("aria contract canvas.infinity", () => {
    expect(ariaPipeline.interactionInvalidation.find((entry) => entry.targets.includes("canvas.infinity"))?.invalidates).toEqual([]);
  });

  it("aria render plan has valid derived paths and fixtures", () => {
    expect(assessToolcraftRenderPlan(appSchema, ariaPerformanceModel).errors ?? []).toEqual([]);
    expect(ariaPerformancePaths.length).toBe(appPerformance.scenarios.length);
    for (const path of ariaPerformancePaths) {
      if (path.workloadDimensions.length) expect(() => compileToolcraftPerformanceFixturePlan(ariaPerformanceModel, path)).not.toThrow();
    }
  });
});
