import { expect, type Page, type TestInfo } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export async function compareVisual(original: Page, migrated: Page, name: string, info: TestInfo) {
  const options = { fullPage: true, animations: 'disabled' as const, scale: 'css' as const,
    style: '.custom-toast { visibility: hidden !important; }' };
  const before = PNG.sync.read(await original.screenshot({ ...options, path: info.outputPath(`blazor-${name}.png`) }));
  const after = PNG.sync.read(await migrated.screenshot({ ...options, path: info.outputPath(`react-${name}.png`) }));
  expect({ width: after.width, height: after.height }).toEqual({ width: before.width, height: before.height });
  const diff = new PNG({ width: before.width, height: before.height });
  const changed = pixelmatch(before.data, after.data, diff.data, before.width, before.height, { threshold: 0.15 });
  const ratio = changed / (before.width * before.height);
  await info.attach(`${name}-visual-comparison`, { body: JSON.stringify({ changedPixels: changed, totalPixels: before.width * before.height, ratio }), contentType: 'application/json' });
  if (ratio > 0.01) await info.attach(`${name}-diff`, { body: PNG.sync.write(diff), contentType: 'image/png' });
  expect(ratio, `${name}: fraction of pixels different from Blazor`).toBeLessThanOrEqual(0.01);
}
