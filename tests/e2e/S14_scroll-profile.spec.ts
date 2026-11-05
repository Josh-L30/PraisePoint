import { test, expect } from '@playwright/test';
import { songServiceFixture } from './support/song-service-fixture';
import { personalId } from './support/team-fixture';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
test('repeatable local scroll profile', async ({ page }) => {
  test.setTimeout(180000);
  const state = await songServiceFixture(page);
  for (let i = 0; i < 25; i++) {
    const id = crypto.randomUUID();
    state.songs.set(id, {
      id,
      workspaceId: personalId,
      title: 'Amazing Grace — Worship together ' + i,
      lyrics: 'Grace',
      author: 'Worship team',
      source: null,
      usageNotes: null,
      revision: 1,
    });
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  if (process.env.S14_GLASS === '1')
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
    });
  const results = [];
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/app');
  await expect(page.getByRole('button', { name: 'Switch workspace', exact: true })).toBeVisible({
    timeout: 20000,
  });
  for (const theme of process.env.S14_PROFILE_THEMES?.split(',') ?? [
    'light',
    'dark',
    'light-no-inner-blur',
  ])
    for (let run = 0; run < 3; run++) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.evaluate(
        (value) => localStorage.setItem('praisepoint-theme', value),
        theme.startsWith('dark') ? 'dark' : 'light',
      );
      await page.goto('/app/w/' + personalId + '/songs');
      await expect(page.locator('.content-row')).toHaveCount(24, { timeout: 20000 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      if (theme.startsWith('light-original')) {
        const original = execFileSync('git', ['show', 'HEAD:src/styles/glass.css'], {
          encoding: 'utf8',
        }).split('.glass {')[0];
        await page.addStyleTag({
          content: original + 'body{isolation:auto}body::before{transform:none}',
        });
      }
      if (theme === 'light-no-inner-blur')
        await page.addStyleTag({
          content:
            '.main-panel,.main-panel .glass,.main-panel .glass-control{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
        });
      if (theme.endsWith('ui-blur-only'))
        await page.addStyleTag({
          content:
            '.main-panel{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
        });
      if (theme === 'light-fixed-layer') {
        const backgrounds = await page.evaluate(() =>
          [
            getComputedStyle(document.body, '::before').backgroundImage,
            getComputedStyle(document.body).backgroundImage,
          ].join(','),
        );
        await page.addStyleTag({
          content: `body{background:none!important;isolation:isolate}body::before{background-image:${backgrounds};transform:translateZ(0)}`,
        });
      }
      await cdp.send('Tracing.start', {
        categories: 'devtools.timeline,disabled-by-default-devtools.timeline.frame',
        transferMode: 'ReturnAsStream',
      });
      const before = await cdp.send('Performance.getMetrics');
      const frames = await page.evaluate(async () => {
        const times: number[] = [];
        let last = performance.now();
        for (let i = 0; i < 80; i++) {
          await new Promise<void>((done) =>
            requestAnimationFrame((now) => {
              times.push(now - last);
              last = now;
              window.scrollBy(0, i < 40 ? 60 : -60);
              done();
            }),
          );
        }
        return times.slice(2);
      });
      const after = await cdp.send('Performance.getMetrics'),
        finished = new Promise<{ stream?: string }>((resolve) =>
          cdp.once('Tracing.tracingComplete', resolve),
        );
      await cdp.send('Tracing.end');
      const { stream } = await finished;
      if (!stream) throw Error('No trace stream returned');
      let trace = '';
      for (;;) {
        const part = await cdp.send('IO.read', { handle: stream });
        trace += part.data;
        if (part.eof) break;
      }
      await cdp.send('IO.close', { handle: stream });
      const events = (
        JSON.parse(trace) as { traceEvents: { name: string; ph: string; dur?: number }[] }
      ).traceEvents;
      const cost = (name: string) =>
        events
          .filter((e) => e.name === name && e.ph === 'X')
          .reduce((sum, e) => sum + (e.dur ?? 0) / 1000, 0);
      const metric = (data: { metrics: { name: string; value: number }[] }, name: string) =>
        data.metrics.find((m) => m.name === name)?.value ?? 0;
      frames.sort((a, b) => a - b);
      results.push({
        theme,
        run,
        rafP95: frames[Math.floor(frames.length * 0.95)],
        paintMs: cost('Paint'),
        prePaintMs: cost('PrePaint'),
        rasterMs: cost('RasterTask'),
        taskMs: (metric(after, 'TaskDuration') - metric(before, 'TaskDuration')) * 1000,
        sidebarBlur: await page
          .locator('.side-panel')
          .evaluate((el) => getComputedStyle(el).backdropFilter),
        mainBlur: await page.locator('main').evaluate((el) => getComputedStyle(el).backdropFilter),
        reducedTransparency: await page.evaluate(
          () => matchMedia('(prefers-reduced-transparency: reduce)').matches,
        ),
        blurredElements: await page
          .locator('main,main *')
          .evaluateAll(
            (nodes) => nodes.filter((el) => getComputedStyle(el).backdropFilter !== 'none').length,
          ),
      });
    }
  await writeFile(
    'docs/evidence/S14-scroll-' + (process.env.S14_PROFILE_PHASE ?? 'before') + '.json',
    JSON.stringify(
      {
        browser: 'Chromium headless',
        viewport: '1366x900',
        cpuThrottle: 4,
        network: 'Local warm-cache; no network throttling',
        glassPreference: process.env.S14_GLASS === '1' ? 'no-preference' : 'browser default',
        fieldData: 'Unavailable: authenticated app, no RUM collected',
        conditions:
          'Synthetic 24-row paginated song list; 80 requestAnimationFrame scroll steps; 3 repetitions each; software/headless rendering is not church laptop GPU evidence',
        results,
      },
      null,
      2,
    ),
  );
});
