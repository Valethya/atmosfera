import fs from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const production = {
  id: 'production',
  url: 'https://www.atmosferastudio.cl/',
};
const variant = {
  id: 'system-font',
  url: 'https://atmosfera-git-perf-ab-system-font-valethyas-projects.vercel.app/',
  shareUrl: 'https://atmosfera-git-perf-ab-system-font-valethyas-projects.vercel.app/?_vercel_share=bXuZjqkBWAXNXGPJ7zCndjgW08fao2Ip',
};

const rounds = 5;
const profileDir = '/tmp/atmosfera-browser-ab-profile';

function median(values) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return null;
  const mid = Math.floor(finite.length / 2);
  return finite.length % 2 ? finite[mid] : (finite[mid - 1] + finite[mid]) / 2;
}

function roundMetric(value, digits = 1) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function summarize(id, runs) {
  const keys = [
    'ttfbMs',
    'fcpMs',
    'lcpMs',
    'fcpAfterResponseMs',
    'lcpAfterResponseMs',
    'dclMs',
    'loadMs',
    'longTaskBlockingMs',
    'taskDurationMs',
    'scriptDurationMs',
    'layoutDurationMs',
    'recalcStyleDurationMs',
    'cls',
    'transferBytes',
    'fontTransferBytes',
  ];
  const result = { id, runs: runs.length };
  for (const key of keys) result[`median${key[0].toUpperCase()}${key.slice(1)}`] = roundMetric(median(runs.map(run => run[key])), key === 'cls' ? 4 : 1);
  return result;
}

async function measure(browser, target) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.setDefaultNavigationTimeout(60_000);

  const session = await page.createCDPSession();
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Network.clearBrowserCache');
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 200_000,
    uploadThroughput: 95_000,
    connectionType: 'cellular4g',
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await session.send('Performance.enable');

  await page.evaluateOnNewDocument(() => {
    window.__atmPerf = { lcp: 0, cls: 0, longTaskBlocking: 0 };
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.__atmPerf.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__atmPerf.cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.__atmPerf.longTaskBlocking += Math.max(0, entry.duration - 50);
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });

  const response = await page.goto(target.url, { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 1200));

  if (!page.url().startsWith(target.url)) throw new Error(`Measurement redirected away from ${target.id}: ${page.url()}`);
  if (!response?.ok()) throw new Error(`HTTP ${response?.status()} while measuring ${target.id}`);

  const browserMetrics = await page.metrics();
  const web = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
    const resources = performance.getEntriesByType('resource');
    const transferBytes = resources.reduce((sum, item) => sum + (item.transferSize || 0), 0);
    const fontResources = resources.filter(item => item.name.includes('fonts.gstatic.com'));
    return {
      responseStart: nav?.responseStart ?? null,
      domContentLoadedEventEnd: nav?.domContentLoadedEventEnd ?? null,
      loadEventEnd: nav?.loadEventEnd ?? null,
      fcp,
      lcp: window.__atmPerf?.lcp ?? null,
      cls: window.__atmPerf?.cls ?? null,
      longTaskBlocking: window.__atmPerf?.longTaskBlocking ?? null,
      transferBytes,
      fontTransferBytes: fontResources.reduce((sum, item) => sum + (item.transferSize || 0), 0),
      fontResourceCount: fontResources.length,
      fontStatus: document.fonts?.status ?? null,
      heroFont: getComputedStyle(document.querySelector('#hero-title') || document.querySelector('h1')).fontFamily,
    };
  });

  const run = {
    ttfbMs: web.responseStart,
    fcpMs: web.fcp,
    lcpMs: web.lcp,
    fcpAfterResponseMs: Number.isFinite(web.fcp) && Number.isFinite(web.responseStart) ? web.fcp - web.responseStart : null,
    lcpAfterResponseMs: Number.isFinite(web.lcp) && Number.isFinite(web.responseStart) ? web.lcp - web.responseStart : null,
    dclMs: web.domContentLoadedEventEnd,
    loadMs: web.loadEventEnd,
    longTaskBlockingMs: web.longTaskBlocking,
    taskDurationMs: browserMetrics.TaskDuration * 1000,
    scriptDurationMs: browserMetrics.ScriptDuration * 1000,
    layoutDurationMs: browserMetrics.LayoutDuration * 1000,
    recalcStyleDurationMs: browserMetrics.RecalcStyleDuration * 1000,
    cls: web.cls,
    transferBytes: web.transferBytes,
    fontTransferBytes: web.fontTransferBytes,
    fontResourceCount: web.fontResourceCount,
    fontStatus: web.fontStatus,
    heroFont: web.heroFont,
  };

  await page.close();
  return run;
}

await fs.rm(profileDir, { recursive: true, force: true });
const executablePath = await chromium.executablePath();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  userDataDir: profileDir,
  args: [...chromium.args],
});

try {
  const authPage = await browser.newPage();
  authPage.setDefaultNavigationTimeout(60_000);
  console.log(`ATMOSFERA_AB_AUTH ${variant.id}`);
  await authPage.goto(variant.shareUrl, { waitUntil: 'networkidle2' });
  await authPage.goto(variant.url, { waitUntil: 'domcontentloaded' });
  if (!authPage.url().startsWith(variant.url)) throw new Error(`Preview authentication failed: ${authPage.url()}`);
  await authPage.close();

  const results = { [production.id]: [], [variant.id]: [] };
  for (let round = 1; round <= rounds; round += 1) {
    const order = round % 2 === 1 ? [production, variant] : [variant, production];
    for (const target of order) {
      console.log(`ATMOSFERA_AB_RUN round=${round} target=${target.id}`);
      results[target.id].push(await measure(browser, target));
    }
  }

  const summaries = [summarize(production.id, results[production.id]), summarize(variant.id, results[variant.id])];
  const normalized = {
    variant: variant.id,
    renderDeltaFcpMs: roundMetric(summaries[1].medianFcpAfterResponseMs - summaries[0].medianFcpAfterResponseMs),
    renderDeltaLcpMs: roundMetric(summaries[1].medianLcpAfterResponseMs - summaries[0].medianLcpAfterResponseMs),
    taskDeltaMs: roundMetric(summaries[1].medianTaskDurationMs - summaries[0].medianTaskDurationMs),
    longTaskDeltaMs: roundMetric(summaries[1].medianLongTaskBlockingMs - summaries[0].medianLongTaskBlockingMs),
  };

  console.log('ATMOSFERA_AB_RESULTS_BEGIN');
  for (const summary of summaries) console.log(JSON.stringify(summary));
  console.log(JSON.stringify(normalized));
  console.log('ATMOSFERA_AB_RESULTS_END');
} finally {
  await browser.close();
}
