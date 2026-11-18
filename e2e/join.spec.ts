import { expect, test } from "@playwright/test";

test("a second person can accept, and an outsider is blocked", async ({ page, browser }) => {
  const organizer = `Avery ${Date.now().toString().slice(-5)}`;
  const guestName = `Mina ${Date.now().toString().slice(-5)}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create");
  await page.getByLabel("What should the group call you?").fill(organizer);
  await page.getByLabel("Bond title").fill("Sunday lunch");
  await page.getByLabel("What is this for?").fill("Who brings the bread.");
  await page.getByLabel("Person 1").fill("Mina Cole");
  await page.getByLabel("Commitment 1").fill("Bring the bread");
  await page.getByLabel("Who").selectOption("Mina Cole");
  await page.locator("#task-due-task-1").fill("2026-12-06T13:00");
  await page.getByLabel("Optional question").fill("Add soup?");
  await page.getByRole("button", { name: "Create bond" }).click();
  await expect(page.getByRole("heading", { name: "Sunday lunch" })).toBeVisible();
  const bondUrl = page.url();
  const share = await page.locator("#share-link").inputValue();

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.setViewportSize({ width: 390, height: 844 });
  await guest.goto(share);
  await expect(guest.getByText("You have not joined.")).toBeVisible();
  await guest.getByLabel("What should the group call you?").fill(guestName);
  await guest.getByRole("checkbox", { name: "I accept Bring the bread" }).check();
  await guest.getByRole("button", { name: "Accept my part" }).click();
  await expect(guest.getByRole("heading", { level: 1, name: "Sunday lunch" })).toBeVisible();
  await expect(guest.getByText("Accepted", { exact: true })).toBeVisible();
  await guest.screenshot({ path: "docs/screenshots/joined-390.png" });
  await guest.reload();
  await expect(guest.getByText("Accepted", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.locator("p", { hasText: new RegExp(`^${guestName}$`) })).toBeVisible();
  await expect(page.getByText("accepted", { exact: true }).first()).toBeVisible();

  const outsiderContext = await browser.newContext();
  const outsider = await outsiderContext.newPage();
  await outsider.goto(bondUrl);
  await expect(outsider.getByRole("heading", { name: "That page is not in Bond" })).toBeVisible();
  await guestContext.close();
  await outsiderContext.close();
});
