import fs from 'fs';
import { chromium } from 'playwright';

const main = async () => {
  const url = process.argv[2] || 'http://localhost:5174/';
  const out = [];
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const entry = { type: 'console', level: msg.type(), text: msg.text(), location: msg.location() };
    out.push(entry);
    console.log('[console]', entry.level, entry.text);
  });

  page.on('pageerror', err => {
    const entry = { type: 'pageerror', message: String(err && err.stack ? err.stack : err) };
    out.push(entry);
    console.error('[pageerror]', entry.message);
  });

  page.on('requestfailed', req => {
    const entry = { type: 'requestfailed', url: req.url(), failure: req.failure() };
    out.push(entry);
    console.warn('[requestfailed]', entry.url, entry.failure && entry.failure.errorText);
  });

  page.on('response', async (res) => {
    try {
      const ct = res.headers()['content-type'] || '';
      if (ct.includes('javascript') || res.url().endsWith('.js') || res.url().includes('/@vite/')) {
        const text = await res.text();
        if (/from\s+["']react["']/.test(text) || /import\s+\*\s+as\s+React\s+from\s+["']react["']/.test(text)) {
          const name = '.bad_module_' + Math.random().toString(36).slice(2,8) + '.js';
          await fs.promises.writeFile(name, text, 'utf8');
          const entry = { type: 'badmodule', url: res.url(), saved: name };
          out.push(entry);
          console.warn('[badmodule] found bare react import in', res.url(), 'saved to', name);
        }
      }
    } catch (e) {
      // ignore
    }
  });

  try {
    console.log('Opening', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // Give the app some time to initialize and lazy-load modules
    await page.waitForTimeout(5000);

    // Take a screenshot for visual confirmation
    const screenshotPath = '.playwright_screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Saved screenshot to', screenshotPath);

  } catch (err) {
    console.error('Error loading page:', err && err.stack ? err.stack : err);
    out.push({ type: 'loaderror', message: String(err) });
  } finally {
    await browser.close();
    const outPath = '.playwright_console.json';
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log('Wrote console output to', outPath);
  }
};

main();

