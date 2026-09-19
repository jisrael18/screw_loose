import { test, expect } from "@playwright/test";
import { demoLevel } from "../../src/game.ts";
import { solve } from "../solve.ts";
test.use({ hasTouch: true });
for (const viewport of [
  { width: 1280, height: 1050 },
  { width: 390, height: 844 },
]) {
  test(`3D view, orbit, undo and restart at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("data-busy", "false");
    await page.screenshot({
      path: `test-results/3d-${viewport.width}.png`,
      fullPage: true,
    });
    await canvas.scrollIntoViewIfNeeded();
    const hitBox = (await canvas.boundingBox())!;
    const clickX =
      hitBox.x + hitBox.width * (viewport.width < 600 ? 0.44 : 0.463);
    const clickY = hitBox.y + hitBox.height * 0.557;
    if (viewport.width < 600) await page.touchscreen.tap(clickX, clickY);
    else await page.mouse.click(clickX, clickY);
    await expect(page.locator("#progress")).toHaveText("1 / 18 screws");
    await page.locator("#restart").click();
    await page.locator("summary").click();
    await page
      .getByRole("button", { name: "coral screw 1", exact: true })
      .click();
    await expect(canvas).toHaveAttribute("data-busy", "true");
    await expect(page.locator("#progress")).toHaveText("1 / 18 screws");
    await expect(
      page.getByRole("button", { name: "gold screw 3", exact: true }),
    ).toBeDisabled();
    await page.locator("#undo").click();
    await expect(canvas).toHaveAttribute("data-busy", "false");
    await expect(page.locator("#progress")).toHaveText("0 / 18 screws");
    await page
      .getByRole("button", { name: "coral screw 1", exact: true })
      .click();
    await page.locator("#restart").click();
    await expect(canvas).toHaveAttribute("data-busy", "false");
    await expect(page.locator("#progress")).toHaveText("0 / 18 screws");
    // A drag changes the camera without accidentally selecting a fastener.
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    const beforeOrbit = await canvas.screenshot();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.55, {
      steps: 8,
    });
    await page.mouse.up();
    await expect(page.locator("#progress")).toHaveText("0 / 18 screws");
    expect((await canvas.screenshot()).equals(beforeOrbit)).toBe(false);
    await page.screenshot({
      path: `test-results/orbit-${viewport.width}.png`,
      fullPage: true,
    });
    await page.locator("#reset-view").click();
    expect(errors).toEqual([]);
  });
}
test("complete 3D level, including falling pieces, then undo the win", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.locator("summary").click();
  const level = demoLevel(),
    path = solve(level)!;
  for (const id of path) {
    const s = level.screws.find((s) => s.id === id)!;
    await page
      .getByRole("button", { name: `${s.color} screw ${id + 1}`, exact: true })
      .click();
    await expect(page.locator("canvas")).toHaveAttribute("data-busy", "false", {
      timeout: 15000,
    });
  }
  await expect(page.locator("#status")).toContainText("You cleared");
  await expect(page.locator(".victory")).toBeVisible();
  await page.locator("#undo").click();
  await expect(page.locator("#progress")).toHaveText("17 / 18 screws");
  await expect(page.locator(".victory")).toBeHidden();
});
test("reduced motion skips animations and remains playable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("summary").click();
  await page
    .getByRole("button", { name: "coral screw 1", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute("data-busy", "false", {
    timeout: 15000,
  });
  await expect(page.locator("#progress")).toHaveText("1 / 18 screws");
});

test("restart during a plate fall cancels all pending visuals", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("summary").click();
  for (const id of [15, 16]) {
    const screw = demoLevel().screws[id]!;
    await page
      .getByRole("button", {
        name: `${screw.color} screw ${id + 1}`,
        exact: true,
      })
      .click();
    await expect(page.locator("canvas")).toHaveAttribute("data-busy", "false", {
      timeout: 15000,
    });
  }
  await page
    .getByRole("button", { name: "teal screw 18", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute("data-busy", "true");
  await page.locator("#restart").click();
  await expect(page.locator("#progress")).toHaveText("0 / 18 screws");
  await expect(page.locator("canvas")).toHaveAttribute("data-busy", "false", {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "coral screw 17", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute("data-busy", "false", {
    timeout: 15000,
  });
  await expect(page.locator("#progress")).toHaveText("1 / 18 screws");
});
