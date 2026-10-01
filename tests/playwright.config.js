// Band Arcade's automatic tests (Playwright). See tests/README.md.
// The site is served exactly as it is (python3 -m http.server from the repository root): no build step.
// ARCADE_SITE=<folder>: serve that folder instead: a PUBLISHED copy made by `node deploy.js <folder> <version>`
// (stamped + minified exactly as the Pages deploy does; tests.yml's "built" job), so the whole suite checks what
// students really load. The tests still read the repository's own files (helpers.js ROOT) for their expectations.
const path = require('path');
const {defineConfig} = require('@playwright/test');
const PORT = +(process.env.ARCADE_PORT || 8321);
const SITE = process.env.ARCADE_SITE ? path.resolve(process.env.ARCADE_SITE) : '..';

module.exports = defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.js/,
  timeout: 90_000,
  expect: {timeout: 10_000},
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,          // one retry for a slow CI machine; a real failure fails twice
  workers: process.env.CI ? 4 : 3,
  reporter: process.env.CI ? [['list'], ['html', {open: 'never'}], ['github']] : [['list'], ['html', {open: 'never'}]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    cwd: SITE,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore', stderr: 'ignore',
  },
  projects: [
    {name: 'chromium', use: {browserName: 'chromium', launchOptions: process.env.PW_CHROMIUM_PATH ? {executablePath: process.env.PW_CHROMIUM_PATH} : {}}},
    {name: 'webkit', use: {browserName: 'webkit'}},       // ≈ iPad Safari
  ],
});
