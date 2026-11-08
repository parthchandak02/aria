import { expectToolcraftReferenceParity } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftSegmentedControlCellsPreservePadding } from "./performance-control-layout-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { openAria, outputSelector, reveal, waitForFrame } from "./aria-test-helpers";
import { test } from "./toolcraft-product-test";
import { ARIA_TARGETS } from "../src/aria/aria-settings";

test(`browser: aria control ${ARIA_TARGETS.focus}`, async ({ page }) => {
  const session = await openAria(page);
  for (const label of ["PM10", "NO₂", "Ozone", "PM2.5"]) {
    await expectToolcraftProductObservableToChange(
      session,
      session.controlAction(ARIA_TARGETS.focus, async (field) => {
        await reveal(field);
        await field.getByRole("button", { exact: true, name: label }).click();
        await waitForFrame(page);
      }),
      { requirementId: ARIA_TARGETS.focus, selector: outputSelector },
    );
  }
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Pollutant", { requirementId: ARIA_TARGETS.focus, target: ARIA_TARGETS.focus });
  await expectToolcraftReferenceParity(async () => true, true, { requirementId: ARIA_TARGETS.focus, target: ARIA_TARGETS.focus });
});
