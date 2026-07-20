import { defineToolcraft } from "@/toolcraft/runtime";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    draggable: false,
    upload: false,
    sizing: { mode: "editable-output" },
  },
  panels: {
    controls: {
      title: "Controls",
      sections: [
        {
          title: "Location",
          controls: {
            latitude: {
              type: "slider",
              target: "latitude",
              label: "Latitude",
              defaultValue: 37.77,
              min: -90,
              max: 90,
              step: 0.1,
              valueLabel: "deg",
            },
            longitude: {
              type: "slider",
              target: "longitude",
              label: "Longitude",
              defaultValue: -122.42,
              min: -180,
              max: 180,
              step: 0.1,
              valueLabel: "deg",
            },
          },
        },
        {
          title: "Display",
          controls: {
            particleDensity: {
              type: "slider",
              target: "particleDensity",
              label: "PM2.5 Density",
              defaultValue: 1.0,
              min: 0.2,
              max: 2.0,
              step: 0.1,
              valueLabel: "x",
            },
            driftSpeed: {
              type: "slider",
              target: "driftSpeed",
              label: "Drift Speed",
              defaultValue: 1.0,
              min: 0.2,
              max: 3.0,
              step: 0.1,
              valueLabel: "x",
            },
          },
        },
        {
          title: "Presets",
          controls: {
            presetSF: {
              type: "action",
              target: "presetSF",
              label: "San Francisco",
              actions: [{ value: "presetSF", variant: "outline" }],
            },
            presetBeijing: {
              type: "action",
              target: "presetBeijing",
              label: "Beijing",
              actions: [{ value: "presetBeijing", variant: "outline" }],
            },
            presetDelhi: {
              type: "action",
              target: "presetDelhi",
              label: "Delhi",
              actions: [{ value: "presetDelhi", variant: "outline" }],
            },
            presetSydney: {
              type: "action",
              target: "presetSydney",
              label: "Sydney",
              actions: [{ value: "presetSydney", variant: "outline" }],
            },
          },
        },
      ],
    },
    layers: false,
    timeline: false,
  },
  toolbar: {
    history: false,
    radar: false,
    zoom: false,
  },
  persistence: { storage: "none" },
});
