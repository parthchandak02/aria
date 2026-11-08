import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { loadAirData } from "./air-data";
import { drawAria } from "./aria-draw";
import { exportPass } from "./aria-pipeline";
import { readAriaSettings } from "./aria-settings";

export const ariaExport: ToolcraftProductExportRenderer = {
  baseFileName: "aria",
  async renderFrame({ context, frame, rendererPipeline, signal, state }) {
    const settings = readAriaSettings(state.values);
    const data = await loadAirData(settings.latitude, settings.longitude);
    const render = () => {
      signal.throwIfAborted();
      context.save();
      context.translate(frame.x, frame.y);
      drawAria(context, frame.width, frame.height, settings, data);
      context.restore();
      signal.throwIfAborted();
    };
    if (rendererPipeline) await rendererPipeline.runPass(exportPass, undefined, render);
    else render();
  },
};
