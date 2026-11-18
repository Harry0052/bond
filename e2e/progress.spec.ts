import { expect, test } from "@playwright/test";

test("marking a commitment done and changing it asks for acceptance again", async ({ page }) => {
  const name = `Avery ${Date.now().toString().slice(-5)}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create");
  await page.getByLabel("What should the group call you?").fill(name);
  await page.getByLabel("Timezone for the times below").selectOption("UTC");
  await page.getByLabel("Bond title").fill("Desk plants");
  await page.getByLabel("What is this for?").fill("Keep the fern alive.");
  await page.getByLabel("Person 1").fill("");
  await page.getByLabel("Commitment 1").fill("Water the fern");
  await page.locator("#task-due-task-1").fill("2026-12-08T09:00");
  await page.getByRole("button", { name: "Create bond" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Desk plants" })).toBeVisible();

  await page.getByRole("button", { name: "Accept this" }).click();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mark done" }).click();
  await expect(page.getByText("Done", { exact: true })).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();

  await page.getByText("Change this commitment").click();
  await page.getByRole("textbox", { name: "Commitment" }).fill("Water the fern twice");
  await page.getByRole("button", { name: "Save change" }).click();
  await expect(page.getByRole("button", { name: "Accept this" })).toBeVisible();
  await expect(page.getByText("Water the fern twice", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Accept this" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/progress-390.png" });
});
