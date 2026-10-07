import { toast } from 'react-toastify';
import { escapeHtml, safeImageSrc } from './html';

/**
 * Downloads a QR image. Data URLs are converted to a Blob first so the
 * download attribute works on mobile Chromium/WebKit as well as desktop.
 */
export async function downloadQrImage(src, filename) {
  if (!src) { toast.error('No QR image to download'); return; }
  try {
    let blob;
    const m = /^data:([^;]+);base64,(.*)$/.exec(src);
    if (m) {
      const bin = atob(m[2]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      blob = new Blob([bytes], { type: m[1] });
    } else {
      blob = await (await fetch(src)).blob();
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch {
    toast.error('Could not download the QR image');
  }
}

const PRINT_CSS = `*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:12mm}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1e293b;background:#fff}
.sheet{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:16px}
.item{text-align:center;padding:24px 16px;border:1px solid #e2e8f0;border-radius:16px;page-break-inside:avoid;break-inside:avoid}
.single .item{border:none;padding:40px 16px}
.hotel{font-size:14px;color:#64748b;margin-bottom:6px;overflow-wrap:anywhere}
.num{font-size:28px;font-weight:800;margin-bottom:16px;overflow-wrap:anywhere}
.qr{width:220px;height:220px;max-width:100%;image-rendering:pixelated}
.grid .num{font-size:18px}.grid .qr{width:150px;height:150px}
.hint{margin-top:12px;font-size:13px;color:#64748b}
.header{text-align:center;margin-bottom:20px}.header h1{font-size:22px;overflow-wrap:anywhere}
@media screen and (max-width:600px){.sheet{grid-template-columns:repeat(min(var(--cols),2),1fr)}}`;

/**
 * Opens a print window for one or many QR codes. Every interpolated value is
 * HTML-escaped and image sources are restricted to data:image / http(s).
 * items: [{ label: 'Table 5', image }]
 */
export function printQrSheet({ items, hotelName = '', hint = '', title = 'QR codes' }) {
  const printable = (items || []).filter((i) => safeImageSrc(i.image));
  if (!printable.length) { toast.error('No QR codes to print'); return; }
  const w = window.open('', '_blank');
  if (!w) { toast.error('Popup blocked. Allow popups to print.'); return; }
  const single = printable.length === 1;
  const cols = single ? 1 : 3;
  const cells = printable.map((i) => `<div class="item">
    ${hotelName ? `<p class="hotel">${escapeHtml(hotelName)}</p>` : ''}
    <h2 class="num">${escapeHtml(i.label)}</h2>
    <img class="qr" src="${safeImageSrc(i.image)}" alt="${escapeHtml(`QR code for ${i.label}`)}"/>
    ${hint ? `<p class="hint">${escapeHtml(hint)}</p>` : ''}
  </div>`).join('');
  w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head>
<body class="${single ? 'single' : 'grid'}">${single ? '' : `<div class="header"><h1>${escapeHtml(title)}</h1></div>`}
<div class="sheet" style="--cols:${cols}">${cells}</div></body></html>`);
  w.document.close();
  // Print once images have decoded (no inline script needed in the popup)
  const imgs = Array.from(w.document.images);
  Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; }))))
    .then(() => { w.focus(); w.print(); });
}
