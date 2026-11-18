import { expect, test } from "@playwright/test";

test("a calendar file downloads and reminders wait for opt-in", async ({ page }) => {
  const name = `Avery ${Date.now().toString().slice(-5)}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create");
  await page.getByLabel("What should the group call you?").fill(name);
  await page.getByLabel("Timezone for the times below").selectOption("UTC");
  await page.getByLabel("Bond title").fill("Library books");
  await page.getByLabel("What is this for?").fill("Return them before the fine.");
  await page.getByLabel("Commitment 1").fill("Return the novel");
  await page.locator("#task-due-task-1").fill("2026-11-01T09:00");
  await page.getByRole("button", { name: "Create bond" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Library books" })).toBeVisible();

  const href = await page.getByRole("link", { name: "Download calendar file (.ics)" }).getAttribute("href");
  const calendar = await page.request.get(href ?? "");
  expect(calendar.ok()).toBeTruthy();
  expect(calendar.headers()["content-type"]).toContain("text/calendar");
  const body = await calendar.text();
  expect(body).toContain("BEGIN:VCALENDAR");
  expect(body).toContain("Return the novel");
  expect(body).not.toContain("private-fridge-code");

  await page.goto("/activity");
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  await expect(page.getByText("Reminders are off.")).toBeVisible();
  await page.getByRole("checkbox", { name: "Remind me in Bond about due times" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("Overdue")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/activity-390.png" });

  await page.goto("/me");
  await expect(page.getByRole("heading", { name: "Me", exact: true })).toBeVisible();
  await expect(page.getByText("Email", { exact: true })).toBeVisible();
  await expect(page.getByText("Off").first()).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "docs/screenshots/me-1440.png", fullPage: true });
});
