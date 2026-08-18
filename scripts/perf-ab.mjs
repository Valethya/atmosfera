import fs from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import lighthouse from 'lighthouse';

const vercelShareToken = 'wl48d8EulwbiGUqkpWDMWcptZJxeZ8Um';
const preview = (id, hostname) => ({
  id,
  url: `https://${hostname}/`,
  shareUrl: `https://${hostname}/?_vercel_share=${vercelShareToken}`,
});

const targets = [
  {
    id: 'production',
    url: 'https://www.atmosferastudio.cl/',
  },
  preview('control-preview', 'atmosfera-git-perf-ab-control-valethyas-projects.vercel.app'),
  preview('no-refraction', 'atmosfera-git-perf-ab-no-refraction-valethyas-projects.vercel.app'),
  preview('no-field-blur', 'atmosfera-git-perf-ab-no-field-blur-valethyas-projects.vercel.app'),
  preview('minimal-effects', 'atmosfera-git-perf-ab-minimal-effects-valethyas-projects.vercel.app'),
  preview('system-font', 'atmosfera-git-perf-ab-system-font-valethyas-projects.vercel.app'),
];

const runsPerTarget = 3;
const profileDir = '/tmp/atmosfera-lighthouse-profile';
const port = 9222;

function auditValue(lhr, id) {
  const audit = lhr.audits?.[id];
  return {
    score: audit?.score ?? null,
    numericValue: Number.isFinite(audit?.numericValue) ? audit.numericValue : null,
    displayValue: audit?.displayValue ?? null,
  };
}

function median(values) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return null;
  return finite[Math.floor(finite.length / 2)];
}

function summarize(id, runs) {
  return {
    id,
    scores: runs.map(run => run.score),
    medianScore: median(runs.map(run => run.score)),
    medianFcpMs: median(runs.map(run => run.fcp.numericValue)),
    medianLcpMs: median(runs.map(run => run.lcp.numericValue)),
    medianSpeedIndexMs: median(runs.map(run => run.speedIndex.numericValue)),
    medianTbtMs: median(runs.map(run => run.tbt.numericValue)),
    medianCls: median(runs.map(run => run.cls.numericValue)),
    finalUrls: runs.map(run => run.finalUrl),
    lighthouseVersions: [...new Set(runs.map(run => run.lighthouseVersion))],
  };
}

await fs.rm(profileDir, { recursive: true, force: true });

const executablePath = await chromium.executablePath();
console.log(`ATMOSFERA_AB_CHROMIUM ${executablePath}`);

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  userDataDir: profileDir,
  args: [
    ...chromium.args,
    `--remote-debugging-port=${port}`,
  ],
});

try {
  // The generated Vercel share credential is project-scoped. Establish access
  // for every branch alias before Lighthouse starts, then preserve cookies.
  const authPage = await browser.newPage();
  authPage.setDefaultNavigationTimeout(60_000);

  for (const target of targets.filter(target => target.shareUrl)) {
    console.log(`ATMOSFERA_AB_AUTH ${target.id}`);
    await authPage.goto(target.shareUrl, { waitUntil: 'networkidle2' });
    await authPage.goto(target.url, { waitUntil: 'domcontentloaded' });
    const finalUrl = authPage.url();
    if (!finalUrl.startsWith(target.url)) {
      throw new Error(`Preview authentication failed for ${target.id}: ${finalUrl}`);
    }
  }
  await authPage.close();

  const results = [];

  for (const target of targets) {
    const runs = [];

    for (let run = 1; run <= runsPerTarget; run += 1) {
      // Clear HTTP cache between runs while preserving authentication cookies.
      const page = await browser.newPage();
      const session = await page.createCDPSession();
      await session.send('Network.enable');
      await session.send('Network.clearBrowserCache');
      await page.close();

      console.log(`ATMOSFERA_AB_RUN ${target.id} ${run}`);
      const result = await lighthouse(target.url, {
        port,
        logLevel: 'error',
        output: 'json',
        onlyCategories: ['performance'],
        disableStorageReset: true,
        maxWaitForLoad: 60_000,
      });

      if (!result?.lhr) throw new Error(`No Lighthouse result for ${target.id} run ${run}`);

      const lhr = result.lhr;
      const finalUrl = lhr.finalDisplayedUrl || lhr.finalUrl;
      if (target.id !== 'production' && !finalUrl.startsWith(target.url)) {
        throw new Error(`Lighthouse was redirected away from ${target.id}: ${finalUrl}`);
      }

      runs.push({
        score: Math.round((lhr.categories.performance.score ?? 0) * 100),
        fcp: auditValue(lhr, 'first-contentful-paint'),
        lcp: auditValue(lhr, 'largest-contentful-paint'),
        speedIndex: auditValue(lhr, 'speed-index'),
        tbt: auditValue(lhr, 'total-blocking-time'),
        cls: auditValue(lhr, 'cumulative-layout-shift'),
        serverResponseTime: auditValue(lhr, 'server-response-time'),
        mainThreadWork: auditValue(lhr, 'mainthread-work-breakdown'),
        bootupTime: auditValue(lhr, 'bootup-time'),
        totalByteWeight: auditValue(lhr, 'total-byte-weight'),
        finalUrl,
        fetchTime: lhr.fetchTime,
        lighthouseVersion: lhr.lighthouseVersion,
      });
    }

    results.push({ target, runs, summary: summarize(target.id, runs) });
  }

  const compact = results.map(result => result.summary);
  await fs.writeFile('/tmp/atmosfera-ab-results.json', JSON.stringify(results, null, 2));

  console.log('ATMOSFERA_AB_RESULTS_BEGIN');
  for (const result of compact) console.log(JSON.stringify(result));
  console.log('ATMOSFERA_AB_RESULTS_END');
} finally {
  await browser.close();
}
