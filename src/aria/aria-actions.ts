import type { ToolcraftCommand } from "@/toolcraft/runtime";

import { ARIA_TARGETS, CITY_PRESETS } from "./aria-settings";

type ActionContext = { action: { value: string }; dispatch: (command: ToolcraftCommand) => void };

export function handleAriaAction({ action, dispatch }: ActionContext): void {
  const city = CITY_PRESETS.find((preset) => preset.value === action.value);
  if (!city) return;
  dispatch({ label: city.label, target: ARIA_TARGETS.latitude, type: "controls.setValue", value: city.latitude });
  dispatch({ label: city.label, target: ARIA_TARGETS.longitude, type: "controls.setValue", value: city.longitude });
}
