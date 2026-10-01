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
    cwd: '..',
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore', stderr: 'ignore',
  },
  projects: [
    {name: 'chromium', use: {browserName: 'chromium', launchOptions: process.env.PW_CHROMIUM_PATH ? {executablePath: process.env.PW_CHROMIUM_PATH} : {}}},
    // ≈ iPad Safari. Playwright's Linux WebKit (WPE) draws with Skia on the GPU, which on a CI machine (no GPU: software
    // OpenGL) crashes the page now and then in canvas-heavy games: an internal WebKit check ("trap invalid opcode in
    // libWPEWebKit", a SkiaGPUWorker segfault), seen as "Target crashed" in Music Highway, Sustain Speedway's Full graphics
    // and Blocktave. Drawing on the CPU avoids that path; real Safari never takes it (it draws with Apple's own graphics).
    {name: 'webkit', use: {browserName: 'webkit', launchOptions: {env: Object.assign({}, process.env, {WEBKIT_SKIA_ENABLE_CPU_RENDERING: '1'})}}},
  ],
});
