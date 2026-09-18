import { test, expect } from "@playwright/test";
for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`play, undo and restart at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible();
    await page.locator("summary").click();
    await page
      .getByRole("button", { name: "coral screw 13", exact: true })
      .click();
    await expect(page.locator("#progress")).toHaveText("1 / 18 screws");
    await page.locator("#undo").click();
    await expect(page.locator("#progress")).toHaveText("0 / 18 screws");
    const box = (await page.locator("canvas").boundingBox())!;
    const halfHeight = Math.max(2.8, (3.5 * box.height) / box.width);
    await page.mouse.click(
      box.x + box.width / 2 - (1.65 * box.height) / (2 * halfHeight),
      box.y + box.height / 2 - box.height / (2 * halfHeight),
    );
    await expect(page.locator("#progress")).toHaveText("1 / 18 screws");
    await page.locator("#restart").click();
    await expect(page.locator("#progress")).toHaveText("0 / 18 screws");
    await expect(page.locator("#undo")).toBeDisabled();
    await page.screenshot({
      path: `test-results/demo-${viewport.width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
