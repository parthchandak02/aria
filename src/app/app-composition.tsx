import { getToolcraftFiniteArtboardRect } from "@/toolcraft/runtime";
import { composeToolcraftApp } from "@/toolcraft/runtime/react";

import { handleAriaAction } from "../aria/aria-actions";
import { AriaCanvas } from "../aria/AriaCanvas";
import { ariaExport } from "../aria/aria-export";
import { ariaPipeline } from "../aria/aria-pipeline";
import { appSchema } from "./app-schema";

export const appComposition = composeToolcraftApp(appSchema, {
  actions: { onPanelAction: handleAriaAction },
  renderer: { pipelineRegistration: ariaPipeline },
  scene: {
    canvasContent: <AriaCanvas />,
    rasterFrameRenderer: ariaExport,
    renderDefaultCanvasMedia: false,
    sceneBoundsProvider: ({ state }) => [getToolcraftFiniteArtboardRect(state.canvas.size)],
  },
});
