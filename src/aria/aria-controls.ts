import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import { POLLUTANT_KEYS, POLLUTANTS } from "./air-data";
import { ARIA_DEFAULTS, ARIA_TARGETS, CITY_PRESETS } from "./aria-settings";

const live = {
  applicability: { mode: "always" },
  keyframeable: false,
  performanceReason: "Redraws one still poster in a worker; data loads once per place and is cached.",
  performanceRole: "responsiveness",
} as const;

export const placeControls = {
  latitude: { ...live, defaultValue: ARIA_DEFAULTS.latitude, description: "North is positive. Air data reloads for the new place.", label: "Latitude", max: 90, min: -90, sliderValueKind: "continuous", step: 0.1, target: ARIA_TARGETS.latitude, type: "slider", unit: "°" },
  longitude: { ...live, defaultValue: ARIA_DEFAULTS.longitude, description: "East is positive. Air data reloads for the new place.", label: "Longitude", max: 180, min: -180, sliderValueKind: "continuous", step: 0.1, target: ARIA_TARGETS.longitude, type: "slider", unit: "°" },
  city: {
    actions: CITY_PRESETS.map((city) => ({ label: city.label, value: city.value, variant: "outline" as const })),
    applicability: { mode: "always" },
    description: "Sets latitude and longitude to the city.",
    label: "Cities",
    performanceReason: "Sets two sliders at once; one data load and redraw.",
    performanceRole: "responsiveness",
    target: ARIA_TARGETS.cityPreset,
    type: "actions",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const fieldControls = {
  pollutant: {
    ...live,
    defaultValue: ARIA_DEFAULTS.focus,
    description: "Which pollutant fills the dot field and the 48-hour forecast.",
    label: "Pollutant",
    options: POLLUTANT_KEYS.map((key) => ({ label: key === "ozone" ? "Ozone" : POLLUTANTS[key].label, value: key })),
    target: ARIA_TARGETS.focus,
    type: "segmented",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const backgroundControls = {
  include: { ...live, defaultValue: true, label: "Background", target: ARIA_TARGETS.includeBackground, type: "switch" },
  color: { ...live, defaultValue: ARIA_DEFAULTS.background, label: "Background color", target: ARIA_TARGETS.background, type: "color" },
} as const satisfies Record<string, ToolcraftControlSchema>;
