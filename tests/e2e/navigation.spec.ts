/**
 * Navigation through the 2026 information architecture: Home, Themes,
 * Wallpapers, Science (Export and 404 are covered in p2-shell.spec.ts).
 */

import { expect, test } from "@playwright/test";
import { gotoApp } from "./support/app";

test.describe("Navigation", { tag: "@shell" }, () => {
  test("Home shows the site title and headline", async ({ page }) => {
    await gotoApp(page, "/");
    await expect(page).toHaveTitle(/Caligo/);
    await expect(page.locator("#main h1")).toContainText("Dark themes");
  });

  test("each nav link opens its page and marks itself current", async ({ page }) => {
    await gotoApp(page, "/");
    const nav = page.getByRole("navigation", { name: "Main" });

    for (const [label, path] of [
      ["Themes", "themes"],
      ["Wallpapers", "wallpapers"],
      ["Science", "science"],
    ] as const) {
      const link = nav.getByRole("link", { name: label, exact: true });
      await link.click();
      await expect(page).toHaveURL(new RegExp(`#/${path}$`));
      await expect(link).toHaveAttribute("aria-current", "page");
      await expect(page.locator("#main h1")).toBeVisible();
    }

    await nav.getByRole("link", { name: "Caligo home" }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator("#main h1")).toContainText("Dark themes");
  });
});
