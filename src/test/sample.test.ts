import { afterAll, beforeAll, describe, it, vi } from "vitest";
import { MySqlContainer } from "@testcontainers/mysql";
import { GenericContainer } from "testcontainers";
import { createPool } from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { faker } from "@faker-js/faker";
import * as schema from "../server/db/schema";
// import { SeleniumContainer } from "@testcontainers/selenium";
// import { Browser, Builder } from "selenium-webdriver";
import { Browser, Page, chromium } from "@playwright/test";

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
    const exDatabaseUrl = `mysql://${mysqlContainer.getUsername()}:${mysqlContainer.getUserPassword()}@${mysqlContainer.getIpAddress(mysqlContainer.getNetworkNames()[0] ?? "")}:3306/${mysqlContainer.getDatabase()}`;
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
      .withEnvironment({ DATABASE_URL: exDatabaseUrl, PORT: "3000" })
      .withExposedPorts(3000)
      .start();
    const url = `http://${appContainer.getHost()}:${appContainer.getFirstMappedPort()}`;
    console.log({ url, databaseUrl, exDatabaseUrl });
    await page.goto(url);
    // await page.screenshot({ path: "screenshot.png" });
    // const seleniumContainer = await new SeleniumContainer(
    //   "selenium/standalone-chrome:112.0",
    // )
    //   .withRecording()
    //   .withBindMounts([{ source: "tmp", target: "/tmp/" }])
    //   .start();
    // const driver = await new Builder()
    //   .forBrowser(Browser.CHROME)
    //   .usingServer(seleniumContainer.getServerUrl())
    //   .build();

    // const ipAddress = appContainer.getIpAddress(
    //   appContainer.getNetworkNames()[0] ?? "",
    // );
    // await driver.get(`http://${ipAddress}:3000`);
    // await driver.quit();
    // const stopContainer = await seleniumContainer.stop({ remove: false });
    // await stopContainer.saveRecording("/tmp/recording.mp4");
    await appContainer.stop({ remove: false, removeVolumes: false });
    await mysqlContainer.stop({ remove: false, removeVolumes: false });
  });
});
