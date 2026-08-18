import fs from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import lighthouse from 'lighthouse';

const production = { id: 'production', url: 'https://www.atmosferastudio.cl/' };
const variant = {
  id: 'system-font',
  url: 'https://atmosfera-git-perf-ab-system-font-valethyas-projects.vercel.app/',
  shareUrl: 'https://atmosfera-git-perf-ab-system-font-valethyas-projects.vercel.app/?_vercel_share=hbxOthjQDyRDvGxNp6xRYODvOybGgAd4',
};
const runs = 3;

function median(values) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return null;
  return finite[Math.floor(finite.length / 2)];
}

function audit(lhr, id) {
  const item = lhr.audits?.[id];
  return Number.isFinite(item?.numericValue) ? item.numericValue : null;
}

async function runLighthouse(target, run) {
  const profile = `/tmp/atm-lh-${target.id}-${run}`;
  const port = 9300 + run + (target.id === 'production' ? 0 : 10);
  await fs.rm(profile, { recursive: true, force: true });
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    userDataDir: profile,
    args: [...chromium.args, `--remote-debugging-port=${port}`],
  });

  try {
    if (target.shareUrl) {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(60_000);
      await page.goto(target.shareUrl, { waitUntil: 'networkidle2' });
      await page.goto(target.url, { waitUntil: 'domcontentloaded' });
      if (!page.url().startsWith(target.url)) throw new Error(`Preview authentication failed: ${page.url()}`);
      const session = await page.createCDPSession();
      await session.send('Network.enable');
      await session.send('Network.clearBrowserCache');
      await page.close();
    }

    const result = await lighthouse(target.url, {
      port,
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance'],
      disableStorageReset: true,
      maxWaitForLoad: 60_000,
    });
    const lhr = result?.lhr;
    if (!lhr) throw new Error(`No Lighthouse result for ${target.id}`);
    const finalUrl = lhr.finalDisplayedUrl || lhr.finalUrl;
    if (!finalUrl.startsWith(target.url)) throw new Error(`Audit redirected away from ${target.id}: ${finalUrl}`);

    return {
      score: Math.round((lhr.categories.performance.score ?? 0) * 100),
      fcpMs: audit(lhr, 'first-contentful-paint'),
      lcpMs: audit(lhr, 'largest-contentful-paint'),
      speedIndexMs: audit(lhr, 'speed-index'),
      tbtMs: audit(lhr, 'total-blocking-time'),
      cls: audit(lhr, 'cumulative-layout-shift'),
      lighthouseVersion: lhr.lighthouseVersion,
    };
  } finally {
    await browser.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
}

const results = { [production.id]: [], [variant.id]: [] };
for (let run = 1; run <= runs; run += 1) {
  const order = run % 2 ? [production, variant] : [variant, production];
  for (const target of order) {
    console.log(`ATMOSFERA_LH_RUN run=${run} target=${target.id}`);
    results[target.id].push(await runLighthouse(target, run));
  }
}

const summary = target => ({
  id: target.id,
  scores: results[target.id].map(item => item.score),
  medianScore: median(results[target.id].map(item => item.score)),
  medianFcpMs: median(results[target.id].map(item => item.fcpMs)),
  medianLcpMs: median(results[target.id].map(item => item.lcpMs)),
  medianSpeedIndexMs: median(results[target.id].map(item => item.speedIndexMs)),
  medianTbtMs: median(results[target.id].map(item => item.tbtMs)),
  medianCls: median(results[target.id].map(item => item.cls)),
});

const summaries = [summary(production), summary(variant)];
console.log('ATMOSFERA_LH_RESULTS_BEGIN');
for (const item of summaries) console.log(JSON.stringify(item));
console.log(JSON.stringify({
  variant: variant.id,
  scoreDelta: summaries[1].medianScore - summaries[0].medianScore,
  fcpDeltaMs: summaries[1].medianFcpMs - summaries[0].medianFcpMs,
  lcpDeltaMs: summaries[1].medianLcpMs - summaries[0].medianLcpMs,
  speedIndexDeltaMs: summaries[1].medianSpeedIndexMs - summaries[0].medianSpeedIndexMs,
}));
console.log('ATMOSFERA_LH_RESULTS_END');
