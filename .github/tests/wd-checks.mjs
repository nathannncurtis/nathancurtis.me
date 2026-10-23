// What a WebDriver browser (real Safari, the iOS Simulator, BrowserStack's phones) can tell us about a page.
// WebDriver has no console feed, so errors are caught from the moment the checks start: through the scroll,
// which is when the day page does most of its work.
export async function visitWd(driver, base, { path }) {
  await driver.get(base + path);
  await driver.wait(async () => (await driver.executeScript('return document.readyState')) === 'complete', 30_000);
  await driver.executeScript(`window.__errs = []; addEventListener('error', e => __errs.push(e.message || String(e.target?.src || e.target?.href || 'resource')), true); addEventListener('unhandledrejection', e => __errs.push(String(e.reason)));`);
  const height = await driver.executeScript('return document.documentElement.scrollHeight');
  for (let y = 0; y <= height; y += Math.max(400, Math.floor(height / 12))) {
    await driver.executeScript('window.scrollTo(0, arguments[0])', y);
    await driver.sleep(150);
  }
  await driver.executeScript('window.scrollTo(0, 0)');
  await driver.sleep(800);
  return driver.executeAsyncScript(`
    const done = arguments[arguments.length - 1];
    document.fonts.ready.then(() => {
      const out = __errs.map(e => 'error: ' + e);
      for (const f of document.fonts) if (f.status === 'error') out.push('font failed: ' + f.family);
      for (const img of document.images) if (img.complete && img.currentSrc && img.naturalWidth === 0) out.push('image failed: ' + img.currentSrc);
      const over = document.documentElement.scrollWidth - window.innerWidth;
      if (over > 1) out.push('page is ' + over + 'px wider than the screen');
      done(out);
    });`);
}
