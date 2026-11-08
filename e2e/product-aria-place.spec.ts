import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftReferenceParity } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { holdSliderDrag, openAria, outputSelector, reveal, waitForFrame } from "./aria-test-helpers";
import { expect, test } from "./toolcraft-product-test";
import { ARIA_TARGETS, CITY_PRESETS } from "../src/aria/aria-settings";

for (const [target, ratio] of [[ARIA_TARGETS.latitude, 0.3], [ARIA_TARGETS.longitude, 0.8]] as const) {
  test(`browser: aria control ${target}`, async ({ page }) => {
    const session = await openAria(page);
    const field = await getToolcraftControlFieldByTarget(page, target);
    const before = await field.getByRole("slider").getAttribute("aria-valuenow");
    await expectToolcraftProductObservableToChange(session, session.controlAction(target, () => holdSliderDrag(page, target, ratio)), { requirementId: target, selector: outputSelector });
    await page.mouse.up();
    await waitForFrame(page);
    await expectToolcraftReferenceParity(async () => (await field.getByRole("slider").getAttribute("aria-valuenow")) !== before, true, { requirementId: target, target });
  });
}

test(`browser: aria control ${ARIA_TARGETS.cityPreset}`, async ({ page }) => {
  const session = await openAria(page);
  const order = [...CITY_PRESETS.slice(1), CITY_PRESETS[0]];
  for (const city of order) {
    await expectToolcraftProductObservableToChange(
      session,
      session.controlAction(ARIA_TARGETS.cityPreset, async (field) => {
        await reveal(field);
        await field.getByRole("button", { exact: true, name: city.label }).click();
        await waitForFrame(page);
      }),
      { requirementId: ARIA_TARGETS.cityPreset, selector: outputSelector },
    );
    await expect((await getToolcraftControlFieldByTarget(page, ARIA_TARGETS.latitude)).getByRole("slider")).toHaveAttribute("aria-valuenow", String(city.latitude));
  }
  await expectToolcraftReferenceParity(
    async () => (await getToolcraftControlFieldByTarget(page, ARIA_TARGETS.longitude)).getByRole("slider").getAttribute("aria-valuenow"),
    String(CITY_PRESETS[0].longitude),
    { requirementId: ARIA_TARGETS.cityPreset, target: ARIA_TARGETS.cityPreset },
  );
});
