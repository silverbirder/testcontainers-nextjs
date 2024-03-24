import { afterAll, beforeAll, describe, it, vi } from "vitest";
import { MySqlContainer, StartedMySqlContainer } from "@testcontainers/mysql";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { createPool } from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { faker } from "@faker-js/faker";
import * as schema from "../server/db/schema";
import { type Browser, type Page, chromium } from "@playwright/test";

describe("App and Database Containers Integration Test", () => {
  vi.setConfig({ testTimeout: 600_000, hookTimeout: 600_000 });

  let browser: Browser;
  let page: Page;
  let appContainer: StartedTestContainer;
  let mysqlContainer: StartedMySqlContainer;

  beforeAll(async () => {
    // Browser setup
    browser = await chromium.launch();
    page = await browser.newPage();

    // Start MySQL container
    mysqlContainer = await new MySqlContainer()
      .withDatabase("t3-app-nextjs-testcontainers")
      .start();

    // Start application container
    const innerDatabaseUrl = `mysql://${mysqlContainer.getUsername()}:${mysqlContainer.getUserPassword()}@${mysqlContainer.getIpAddress(mysqlContainer.getNetworkNames()[0] ?? "")}:3306/${mysqlContainer.getDatabase()}`;
    const appImage = await GenericContainer.fromDockerfile("./")
      .withBuildArgs({ NEXT_PUBLIC_CLIENTVAR: "clientvar" })
      .withCache(true)
      .build("app", { deleteOnExit: false });
    appContainer = await appImage
      .withEnvironment({ DATABASE_URL: innerDatabaseUrl, PORT: "3000" })
      .withExposedPorts(3000)
      .start();
  });

  afterAll(async () => {
    // Stop containers and close browser
    await appContainer.stop({ remove: false, removeVolumes: false });
    await mysqlContainer.stop({ remove: false, removeVolumes: false });
    await browser?.close();
  });

  it("should initialize the database and interact with the app through the browser", async () => {
    const databaseUrl = `mysql://${mysqlContainer.getUsername()}:${mysqlContainer.getUserPassword()}@${mysqlContainer.getHost()}:${mysqlContainer.getFirstMappedPort()}/${mysqlContainer.getDatabase()}`;
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

    // Insert mock data into the database
    const data: (typeof schema.posts.$inferInsert)[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        name: faker.internet.userName(),
      });
    }
    await db.insert(schema.posts).values(data);

    // Interact with the app in the browser
    const url = `http://${appContainer.getHost()}:${appContainer.getFirstMappedPort()}`;
    await page.goto(url);
    await page.screenshot({ path: "screenshots/screenshot-1.png" });
    await page.getByPlaceholder("Title").fill("Hello World");
    await page.screenshot({ path: "screenshots/screenshot-2.png" });
    await page.getByRole("button", { name: "Submit" }).click();
    await page.screenshot({ path: "screenshots/screenshot-3.png" });
    await page.locator("button").isEnabled();
    await page.waitForSelector("text=Your most recent post: Hello World");
    await page.screenshot({ path: "screenshots/screenshot-4.png" });
  });
});
