import { test, expect } from "@playwright/test";

const examples = [
  ["caesar", "KHOOR", "HELLO"],
  ["mono", "ZYXCBA", "ABCXYZ"],
  ["rail", "WECRLTEERDSOEEFEAOCAIVDEN", "WEAREDISCOVEREDFLEEATONCE"],
  ["vigenere", "LXFOPVEFRNHR", "ATTACKATDAWN"],
  ["playfair", "BMODZBXDNABEKUDMUIXMMOUVIF", "HIDETHEGOLDINTHETREXESTUMP"],
  ["otp", "EQNVZ", "HELLO"],
];

async function choose(page, cipher) {
  if (await page.locator("#cipher-select").isVisible())
    await page.locator("#cipher-select").selectOption(cipher);
  else await page.locator(`[data-cipher="${cipher}"]`).click();
}

test("all six ciphers, inverse flow, visualizations and responsive layout", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#cipher-title")).toHaveText("Caesar Cipher");
  for (const [cipher, encrypted, decrypted] of examples) {
    await choose(page, cipher);
    await page.locator("#example").click();
    await page.locator("#submit").click();
    await expect(page.locator("#result")).toHaveValue(encrypted);
    await expect(page.locator("#status")).toHaveText("Đã mã hóa thành công.");
    await expect(page.locator("#visualization-note")).toContainText(
      "Chiều mã hóa",
    );
    await expect(page.locator("#copy")).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#download").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`${cipher}-encrypt.txt`);
    await page.locator("#reuse").click();
    await expect(page.locator('input[value="decrypt"]')).toBeChecked();
    await page.locator("#submit").click();
    await expect(page.locator("#result")).toHaveValue(decrypted);
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(noOverflow).toBe(true);
    if (cipher === "playfair")
      await page.screenshot({
        path: testInfo.outputPath("playfair.png"),
        fullPage: true,
      });
  }
  await choose(page, "caesar");
  await page.locator("#example").click();
  await page.locator("#submit").click();
  await expect(page.locator("#result")).toHaveValue("KHOOR");
  await page.screenshot({
    path: testInfo.outputPath("caesar.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("normalization, invalid fields, generated keys and stale result invalidation", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#text").fill("Đặng, 123!");
  await expect(page.locator("#text-preview")).toHaveText("DANG");
  await page.locator("#key").fill("3abc");
  await page.locator("#submit").click();
  await expect(page.locator("#key")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#key").fill("-23");
  await page.locator("#submit").click();
  await expect(page.locator("#result")).toHaveValue("GDQJ");
  await page.locator("#text").fill("ABC");
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.locator("#copy")).toBeDisabled();
  await choose(page, "otp");
  await page.locator("#generate").click();
  await expect(page.locator("#key")).toHaveValue(/^[A-Z]{3}$/);
  await page.locator("#submit").click();
  await expect(page.locator("#result-badge")).toHaveText("Hoàn tất");
  await choose(page, "mono");
  await page.locator("#generate").click();
  await expect(page.locator("#key")).toHaveValue(/^[A-Z]{26}$/);
  const key = await page.locator("#key").inputValue();
  expect(new Set(key).size).toBe(26);
  await page.locator("#clear").click();
  await expect(page.locator("#text")).toHaveValue("");
  await expect(page.locator("#key")).toHaveValue("");
});

test("network/non-JSON errors and changed input during an outstanding request", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#example").click();
  await page.route("**/api/process", (route) =>
    route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "<h1>Bad gateway</h1>",
    }),
  );
  await page.locator("#submit").click();
  await expect(page.locator("#status")).toContainText("dữ liệu không hợp lệ");
  await expect(page.locator("#submit")).toBeEnabled();
  await page.unroute("**/api/process");
  await page.route("**/api/process", (route) => route.abort());
  await page.locator("#submit").click();
  await expect(page.locator("#status")).toContainText("Không thể kết nối");
  await page.unroute("**/api/process");
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/process", async (route) => {
    await gate;
    await route.fulfill({
      json: {
        status: "success",
        result: "KHOOR",
        normalized_text: "HELLO",
        prepared_text: "HELLO",
        normalized_key: "3",
      },
    });
  });
  await page.locator("#submit").click();
  await expect(page.locator("#submit")).toBeDisabled();
  await page.locator("#text").fill("NEW INPUT");
  release();
  await expect(page.locator("#submit")).toBeEnabled();
  await expect(page.locator("#result")).toBeHidden();
});

test("copy uses clipboard and preserves the output", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.locator("#example").click();
  await page.locator("#submit").click();
  await expect(page.locator("#result")).toHaveValue("KHOOR");
  await page.locator("#copy").click();
  await expect(page.locator("#status")).toHaveText("Đã sao chép kết quả.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "KHOOR",
  );
});
