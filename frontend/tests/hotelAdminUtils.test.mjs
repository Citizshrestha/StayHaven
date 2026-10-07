import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, safeImageSrc } from '../src/features/staff/hotel-admin/utils/html.js';
import { neutralizeCell } from '../src/features/staff/hotel-admin/utils/csv.js';

test('escapeHtml neutralises markup used in hotel-admin print windows', () => {
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(escapeHtml('"><svg onload=alert(1)>'), '&quot;&gt;&lt;svg onload=alert(1)&gt;');
  assert.equal(escapeHtml("O'Brien & Co"), 'O&#39;Brien &amp; Co');
  assert.equal(escapeHtml(null), '');
});

test('safeImageSrc only allows data:image and http(s) sources', () => {
  assert.equal(safeImageSrc('javascript:alert(1)'), '');
  assert.equal(safeImageSrc('" onerror="alert(1)'), '');
  assert.equal(safeImageSrc('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');
  assert.equal(safeImageSrc('https://res.cloudinary.com/x/qr.png'), 'https://res.cloudinary.com/x/qr.png');
});

test('neutralizeCell blocks CSV formula injection but keeps numbers', () => {
  for (const s of ['=HYPERLINK("x")', '+1+1', '-2+3', '@SUM(1)']) assert.equal(neutralizeCell(s), `'${s}`);
  assert.equal(neutralizeCell(-25), '-25');
  assert.equal(neutralizeCell('कोठा १०१'), 'कोठा १०१');
  assert.equal(neutralizeCell(undefined), '');
});
