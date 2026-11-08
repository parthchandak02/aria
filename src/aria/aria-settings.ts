import type { AirData, PollutantKey } from "./air-data";

export const ARIA_TARGETS = {
  background: "appearance.background",
  cityPreset: "place.city",
  focus: "field.pollutant",
  includeBackground: "export.includeBackground",
  latitude: "place.latitude",
  longitude: "place.longitude",
} as const;

export const ARIA_DEFAULTS = { background: "#0E1116", focus: "pm25" as PollutantKey, latitude: 37.8, longitude: -122.4 } as const;

export const CITY_PRESETS = [
  { label: "San Francisco", latitude: 37.8, longitude: -122.4, value: "city-san-francisco" },
  { label: "Delhi", latitude: 28.6, longitude: 77.2, value: "city-delhi" },
  { label: "Beijing", latitude: 39.9, longitude: 116.4, value: "city-beijing" },
  { label: "Lagos", latitude: 6.5, longitude: 3.4, value: "city-lagos" },
  { label: "Mexico City", latitude: 19.4, longitude: -99.1, value: "city-mexico-city" },
  { label: "London", latitude: 51.5, longitude: -0.1, value: "city-london" },
  { label: "Sydney", latitude: -33.9, longitude: 151.2, value: "city-sydney" },
  { label: "Reykjavík", latitude: 64.1, longitude: -21.9, value: "city-reykjavik" },
] as const;

export type AriaSettings = {
  background: string;
  focus: PollutantKey;
  includeBackground: boolean;
  latitude: number;
  longitude: number;
  placeName: string | null;
};

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

export function readAriaSettings(values: Readonly<Record<string, unknown>>): AriaSettings {
  const latitude = num(values[ARIA_TARGETS.latitude], ARIA_DEFAULTS.latitude);
  const longitude = num(values[ARIA_TARGETS.longitude], ARIA_DEFAULTS.longitude);
  const focus = values[ARIA_TARGETS.focus];
  const city = CITY_PRESETS.find((preset) => Math.abs(preset.latitude - latitude) < 0.05 && Math.abs(preset.longitude - longitude) < 0.05);
  return {
    background: typeof values[ARIA_TARGETS.background] === "string" ? (values[ARIA_TARGETS.background] as string) : ARIA_DEFAULTS.background,
    focus: focus === "pm10" || focus === "no2" || focus === "ozone" || focus === "pm25" ? focus : ARIA_DEFAULTS.focus,
    includeBackground: values[ARIA_TARGETS.includeBackground] !== false,
    latitude,
    longitude,
    placeName: city?.label ?? null,
  };
}

/** Everything one frame needs: settings plus the loaded data (null until it arrives). */
export type AriaFrame = { data: AirData; settings: AriaSettings };
