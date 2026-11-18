import { expect, test } from "@playwright/test";

test("an organizer can create a bond and open the same card after refresh", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const name = `Avery ${Date.now().toString().slice(-6)}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "Make a bond" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/create-390.png" });

  await page.getByLabel("Bond title").fill("ab");
  await page.getByLabel("What is this for?").fill("Too short to save.");
  await page.getByLabel("Commitment 1").fill("Buy oat milk");
  await page.locator("#task-due-task-1").fill("2026-12-01T18:00");
  await page.getByRole("button", { name: "Create bond" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "at least 3 characters" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Make a bond" })).toBeVisible();

  await page.getByLabel("What should the group call you?").fill(name);
  await page.getByLabel("Timezone for the times below").selectOption("America/Los_Angeles");
  await page.getByLabel("Bond title").fill("Saturday groceries");
  await page.getByLabel("What is this for?").fill("Split the shop for the flat.");
  await page.getByLabel("Person 1").fill("Mina Cole");
  await page.getByLabel("Who").selectOption("Mina Cole");
  await page.locator("#task-due-task-1").fill("2026-12-01T18:00");
  await page.getByRole("button", { name: "Create bond" }).click();

  await expect(page.getByRole("heading", { name: "Saturday groceries" })).toBeVisible();
  await expect(page.getByText("America/Los_Angeles")).toBeVisible();
  await expect(page.getByText("18:00")).toBeVisible();
  await expect(page.locator("#share-link")).toHaveValue(/\/b\//);
  const share = await page.locator("#share-link").inputValue();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "docs/screenshots/bond-detail-1440.png", fullPage: true });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Saturday groceries" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Saturday groceries/ })).toBeVisible();

  const browser = page.context().browser();
  if (!browser) throw new Error("Playwright browser is missing.");
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.setViewportSize({ width: 390, height: 844 });
  await guest.goto(share);
  await expect(guest.getByRole("heading", { name: "Saturday groceries" })).toBeVisible();
  await expect(guest.getByText("You have not joined.")).toBeVisible();
  await expect(guest.getByText("private-fridge-code")).toHaveCount(0);
  await expect(guest.getByText("started this bond")).toHaveCount(0);
  await guest.screenshot({ path: "docs/screenshots/guest-preview-390.png" });
  await guest.goto("/bonds/11111111-1111-4111-8111-111111111111");
  await expect(guest.getByRole("heading", { name: "That page is not in Bond" })).toBeVisible();
  await guestContext.close();

  await page.route("**/api/bonds", (route) => route.abort());
  await page.goto("/create");
  await page.getByLabel("Bond title").fill("Offline bond");
  await page.getByLabel("What is this for?").fill("This should not save.");
  await page.getByLabel("Commitment 1").fill("Nothing");
  await page.locator("#task-due-task-1").fill("2026-12-03T18:00");
  await page.getByRole("button", { name: "Create bond" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "could not reach this server" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Offline bond")).toHaveCount(0);
  expect(errors).toEqual([]);
});
