/** Escapes text for interpolation into HTML written to print windows. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only data: image URLs and http(s) URLs may be used as print image sources. */
export function safeImageSrc(value) {
  const s = String(value ?? '');
  return /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(s) || /^https?:\/\//i.test(s)
    ? escapeHtml(s)
    : '';
}
