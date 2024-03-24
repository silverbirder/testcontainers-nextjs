import { afterAll, beforeAll, describe, it, vi } from "vitest";
import { MySqlContainer } from "@testcontainers/mysql";
import { GenericContainer } from "testcontainers";
import { createPool } from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { faker } from "@faker-js/faker";
import * as schema from "../server/db/schema";
import { type Browser, type Page, chromium } from "@playwright/test";

describe("", () => {
  vi.setConfig({ testTimeout: 600_000 });

  let browser: Browser;
  let page: Page;
  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser?.close();
  });

  it("", async () => {
    const mysqlContainer = await new MySqlContainer()
      .withDatabase("t3-app-nextjs-testcontainers")
      .start();
    const databaseUrl = `mysql://${mysqlContainer.getUsername()}:${mysqlContainer.getUserPassword()}@${mysqlContainer.getHost()}:${mysqlContainer.getFirstMappedPort()}/${mysqlContainer.getDatabase()}`;
    const innerDatabaseUrl = `mysql://${mysqlContainer.getUsername()}:${mysqlContainer.getUserPassword()}@${mysqlContainer.getIpAddress(mysqlContainer.getNetworkNames()[0] ?? "")}:3306/${mysqlContainer.getDatabase()}`;
    const db = drizzle(
      createPool({
        uri: databaseUrl,
      }),
      {
        schema,
        mode: "default",
      },
    );
    await migrate(db, { migrationsFolder: "src/server/db/out" });
    const data: (typeof schema.posts.$inferInsert)[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        name: faker.internet.userName(),
      });
    }
    await db.insert(schema.posts).values(data);
    const appImage = await GenericContainer.fromDockerfile("./")
      .withBuildArgs({ NEXT_PUBLIC_CLIENTVAR: "clientvar" })
      .withCache(true)
      .build("app", { deleteOnExit: false });

    const appContainer = await appImage
      .withEnvironment({ DATABASE_URL: innerDatabaseUrl, PORT: "3000" })
      .withExposedPorts(3000)
      .start();
    const url = `http://${appContainer.getHost()}:${appContainer.getFirstMappedPort()}`;
    console.log({ url, databaseUrl, innerDatabaseUrl });
    await page.goto(url);
    await page.screenshot({ path: "screenshots/screenshot-1.png" });
    await page.getByPlaceholder("Title").fill("Hello World");
    await page.screenshot({ path: "screenshots/screenshot-2.png" });
    await page.getByRole("button", { name: "Submit" }).click();
    await page.screenshot({ path: "screenshots/screenshot-3.png" });
    await page.locator("button").isEnabled();
    await page.waitForSelector("text=Your most recent post: Hello World");
    await page.screenshot({ path: "screenshots/screenshot-4.png" });
    await appContainer.stop({ remove: false, removeVolumes: false });
    await mysqlContainer.stop({ remove: false, removeVolumes: false });
  });
});
