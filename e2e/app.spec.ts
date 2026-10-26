import { test, expect } from '@playwright/test';
import path from 'node:path';
const sample = path.resolve('public/voorbeeld-flashcards.xlsx');
test('Excel, zelfbeoordeling, herhaling, hervatten en offline leren', async ({ page, context, browserName }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await page.getByLabel('Excel of CSV kiezen').setInputFiles(sample);
  await expect(page.getByText('20 geldige vragen', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByLabel('Ik heb de koppelingen en voorbeelden gecontroleerd.').check();
  await page.getByRole('button', { name: '20 vragen toevoegen', exact: true }).click();
  await expect(page.getByRole('heading', { name: '20 vragen toegevoegd' })).toBeVisible();
  await page.getByRole('button', { name: 'Mijn start', exact: true }).click();
  await page.getByRole('button', { name: '20 Swiftie-vragen toevoegen', exact: true }).click();
  await expect(page.getByText('Alle twintig Swiftie-vragen staan al in je collectie.')).toBeVisible();
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await page.getByLabel('Excel of CSV kiezen').setInputFiles(sample);
  await expect(page.getByText('0 geldige vragen', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Leren', exact: true }).click(); await page.getByRole('button', { name: 'Begin met leren', exact: true }).click();
  const first = await page.locator('.question-area h2').innerText();
  await page.keyboard.press('Space'); await page.getByRole('button', { name: 'Fout', exact: true }).click();
  await expect(page.getByText('Vraag 2 van 16', { exact: true })).toBeVisible(); await expect(page.locator('.question-area h2')).not.toHaveText(first);
  for (let index = 0; index < 3; index++) { await page.getByRole('button', { name: 'Toon antwoord' }).click(); await page.getByRole('button', { name: 'Goed!', exact: true }).click(); await expect(page.getByText(`Vraag ${index + 3} van 16`, { exact: true })).toBeVisible(); }
  await expect(page.locator('.question-area h2')).toHaveText(first);
  await page.reload(); await page.getByRole('button', { name: 'Leren', exact: true }).click(); await page.getByRole('button', { name: 'Hervatten', exact: true }).click(); await expect(page.getByText('Vraag 5 van 16', { exact: true })).toBeVisible();
  if (browserName === 'chromium') {
    await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true); await page.reload(); await page.getByRole('button', { name: 'Leren', exact: true }).click(); await page.getByRole('button', { name: 'Hervatten', exact: true }).click();
    await page.getByRole('button', { name: 'Toon antwoord' }).click(); await page.getByRole('button', { name: 'Goed!', exact: true }).click(); await expect(page.getByText('Vraag 6 van 16', { exact: true })).toBeVisible();
    await context.setOffline(false);
  }
});
test('handmatig toevoegen, back-up exporteren en responsieve weergave', async ({ page }, testInfo) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Vragen toevoegen', exact: true }).click();
  await page.getByLabel('Vraag', { exact: true }).fill('Wat is een testkaart?'); await page.getByLabel('Antwoord', { exact: true }).fill('Fictieve informatie voor deze test.');
  await page.getByRole('button', { name: 'Flashcard bewaren' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Flashcards', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Wat is een testkaart?' })).toBeVisible();
  for (const viewport of [{ width: 393, height: 852 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }]) { await page.setViewportSize(viewport); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: testInfo.outputPath(`flashcards-${viewport.width}.png`), fullPage: true }); }
  await page.getByRole('button', { name: 'Lokaal', exact: true }).click();
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Volledige back-up', exact: true }).click(); const download = await downloaded; expect(download.suggestedFilename()).toMatch(/linda-backup-.*\.json/);
  const excelDownloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Excel exporteren', exact: true }).click(); expect((await excelDownloaded).suggestedFilename()).toMatch(/\.xlsx$/);
});

test('Swiftie-vragen en fan-thema op desktop en telefoon', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByText('Taylor Swift fan-editie', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '20 Swiftie-vragen toevoegen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Taylor Swift · Captions & albums', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Melding sluiten', exact: true }).click();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 393, height: 852 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('.welcome-art')).toBeVisible();
    expect(await page.locator('.swiftie-mascot').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(512);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`swiftie-${viewport.width}.png`), fullPage: true, animations: 'disabled' });
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.screenshot({ path: testInfo.outputPath('swiftie-dark.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Begin met leren', exact: true }).click();
  await page.getByRole('button', { name: 'Begin met leren', exact: true }).click();
  await expect(page.locator('.question-area h2')).toContainText('Bijschrift:');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Toon antwoord', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Goed!', exact: true })).toBeVisible();
});

function samplePdf() {
  const content = 'BT /F1 18 Tf 40 750 Td (Studeren betekent oefenen.) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (const [index, object] of objects.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
test('lokale PDF wordt gelezen en als gecontroleerde kaart bewaard', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Toevoegen', exact: true }).click(); await page.getByRole('button', { name: 'PDF-document', exact: true }).click();
  await page.getByLabel('PDF kiezen', { exact: true }).setInputFiles({ name: 'oefentekst.pdf', mimeType: 'application/pdf', buffer: samplePdf() });
  await expect(page.getByLabel('Tekst van de PDF-pagina')).toHaveValue('Studeren betekent oefenen.');
  await page.getByRole('button', { name: 'Hele paginatekst gebruiken', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Antwoord', exact: true })).toHaveValue('Studeren betekent oefenen.');
  await page.getByLabel('Vraag', { exact: true }).fill('Wat betekent studeren?'); await page.getByRole('button', { name: 'Flashcard bewaren' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Flashcards', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Wat betekent studeren?' })).toBeVisible();
});