// Band Arcade's automatic tests (Playwright). See tests/README.md.
// The site is served exactly as it is (python3 -m http.server from the repository root): no build step.
const {defineConfig} = require('@playwright/test');
const PORT = +(process.env.ARCADE_PORT || 8321);

module.exports = defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.js/,
  timeout: 90_000,
  expect: {timeout: 10_000},
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // ONE retry at most, for a slow CI machine; a real failure fails twice. A test that needed its retry is listed in the
  // run summary (ci-summary.js) every time: fix its cause, never add retries to hide it.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? '100%' : 3,     // every core of the CI machine (ubuntu-latest: 4); each test has its own fresh browser context
  // CI: each shard keeps a "blob" report; tests.yml's ALL TESTS job merges them into one HTML report + the run summary
  reporter: process.env.CI
    ? [['list'], ['github'], ['blob'], ...(process.env.PLAYWRIGHT_JSON_OUTPUT_NAME ? [['json']] : [])]
    : [['list'], ['html', {open: 'never'}], ...(process.env.PLAYWRIGHT_JSON_OUTPUT_NAME ? [['json']] : [])],
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    cwd: '..',
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore', stderr: 'ignore',
  },
  projects: [
    {name: 'chromium', use: {browserName: 'chromium', launchOptions: process.env.PW_CHROMIUM_PATH ? {executablePath: process.env.PW_CHROMIUM_PATH} : {}}},
    {name: 'webkit', use: {browserName: 'webkit'}},       // ≈ iPad Safari (Music Highway's and Sustain Speedway's specs: helpers.js CPU_DRAWING)
  ],
});
