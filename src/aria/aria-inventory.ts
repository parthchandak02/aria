import type { ToolcraftControlSectionInventoryEntry, ToolcraftProductReadiness } from "../app/acceptance/types";
import { ARIA_TARGETS } from "./aria-settings";

export const ariaSectionInventory = [
  {
    entity: "Output background", entityId: "background",
    finiteSelectors: [{ reason: "Shows or hides the background fill and PNG alpha; the color stays editable either way.", role: "parameter", target: ARIA_TARGETS.includeBackground }],
    groupingReason: "One output background; runtime relocates this source pair into Settings.",
    id: "runtime.setup", targets: [ARIA_TARGETS.includeBackground, ARIA_TARGETS.background], title: "Settings",
  },
  {
    entity: "Place on Earth", entityId: "place", finiteSelectors: [],
    groupingReason: "Latitude, longitude and the city shortcuts choose where the air is measured; cities only set the two sliders.",
    id: "place", targets: [ARIA_TARGETS.latitude, ARIA_TARGETS.longitude, ARIA_TARGETS.cityPreset], title: "Place",
  },
  {
    entity: "Pollutant field", entityId: "field",
    finiteSelectors: [{ reason: "Chooses which pollutant drives the dot field and forecast; every other control stays relevant.", role: "parameter", target: ARIA_TARGETS.focus }],
    groupingReason: "One choice: which pollutant the dot field and forecast show.",
    id: "field", targets: [ARIA_TARGETS.focus], title: "Field",
  },
  {
    entity: "Raster image output", entityId: "image-export",
    finiteSelectors: [
      { reason: "Selects PNG alpha support or opaque JPEG encoding.", role: "parameter", target: "export.image.format" },
      { reason: "Selects the output long-edge pixel size.", role: "parameter", target: "export.image.resolution" },
    ],
    groupingReason: "Runtime-owned image format and resolution govern one exported artifact.",
    id: "runtime.image-export", targets: ["export.image.format", "export.image.resolution"], title: "Image Export",
  },
] as const satisfies readonly ToolcraftControlSectionInventoryEntry[];

const edit = (id: string, target: string, detail: string) => ({
  alternative: { reason: "Persistent value controls on the poster would cover it.", surface: "canvas" as const },
  capability: "property-edit" as const, evidence: { detail, source: "usability-analysis" as const }, id,
  reason: "A global setting of the whole poster with no spatial handle.", selectionScope: { mode: "global" as const }, surface: "panel" as const, target,
});

export const ariaReadiness: ToolcraftProductReadiness = {
  exportIntent: { image: { mode: "toolcraft-default" }, svg: { mode: "not-requested" }, video: { mode: "not-requested" } },
  interactionOwnership: [
    edit("latitude-property", ARIA_TARGETS.latitude, "Latitude is one number for the whole poster."),
    edit("longitude-property", ARIA_TARGETS.longitude, "Longitude is one number for the whole poster."),
    edit("pollutant-property", ARIA_TARGETS.focus, "The pollutant choice applies to the whole field and forecast."),
    edit("background-color-property", ARIA_TARGETS.background, "Runtime places the background color in Settings."),
    edit("background-include-property", ARIA_TARGETS.includeBackground, "Runtime places the Background switch in Settings."),
    {
      alternative: { reason: "A shortcut command has no position on the poster.", surface: "canvas" },
      capability: "command", evidence: { detail: "City buttons set latitude and longitude.", source: "usability-analysis" },
      id: "city-command", reason: "Shortcuts sit beside the sliders they set.", surface: "panel", target: ARIA_TARGETS.cityPreset,
    },
  ],
  mode: "product",
  productName: "Aria",
  productSummary: "An air quality poster for any place: the US AQI with its health band, pollutant gauges against WHO guidelines, a dot field sized by the chosen pollutant, and its 48-hour forecast, from live Open-Meteo data.",
  requestedBehavior: "Rebuild Aria on the current Toolcraft with a much better design: choose a place (sliders or cities) and a pollutant, read the live air quality as a clear poster, and export it as an image.",
  viewInteraction: { mode: "non-spatial", reason: "The output is a two-dimensional poster, not a three-dimensional scene." },
};
