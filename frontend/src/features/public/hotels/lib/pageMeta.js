import { useEffect } from 'react';

const SITE = 'StayHaven';

const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  const created = !el;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  const previous = el.getAttribute('content');
  if (content) el.setAttribute('content', content);
  return () => {
    if (created) el.remove();
    else if (previous !== null) el.setAttribute('content', previous);
  };
};

const clip = (text, max = 155) => {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}\u2026` : flat;
};

/**
 * Per-page <title>, meta description and Open Graph tags (restored when the page unmounts).
 * This runs in the browser, so crawlers that do not execute JS still see the defaults in index.html.
 */
export const usePageMeta = ({ title, description, image } = {}) => {
  useEffect(() => {
    const previousTitle = document.title;
    const fullTitle = title ? `${title} | ${SITE}` : previousTitle;
    document.title = fullTitle;
    const undo = [
      setMeta('property', 'og:title', fullTitle),
      setMeta('name', 'twitter:title', fullTitle),
    ];
    if (description) {
      const text = clip(description);
      undo.push(setMeta('name', 'description', text), setMeta('property', 'og:description', text), setMeta('name', 'twitter:description', text));
    }
    if (image) {
      undo.push(setMeta('property', 'og:image', image), setMeta('name', 'twitter:image', image), setMeta('name', 'twitter:card', 'summary_large_image'));
    }
    undo.push(setMeta('property', 'og:url', window.location.href));
    return () => {
      document.title = previousTitle;
      undo.forEach((fn) => fn());
    };
  }, [title, description, image]);
};
