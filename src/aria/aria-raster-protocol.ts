import type { AirData } from "./air-data";
import type { AriaSettings } from "./aria-settings";

export type AriaRasterRequest = { backingHeight: number; backingWidth: number; data: AirData; height: number; id: number; settings: AriaSettings; width: number };
export type AriaRasterResponse = { bitmap?: ImageBitmap; error?: string; id: number };
