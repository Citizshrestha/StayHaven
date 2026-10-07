import React, { useMemo } from 'react';

/**
 * Renders an activity-log description from the API without injecting HTML.
 *
 * The backend wraps values in cosmetic <strong>…</strong> tags, but the values
 * themselves (guest names, requests, notes) are user input and are stored
 * unescaped. Only the exact <strong> / </strong> tokens are treated as markup;
 * everything else is rendered as literal text, so `<img onerror=…>` in a guest
 * name is shown, never executed.
 */
const SafeActivityText = ({ text }) => {
  const nodes = useMemo(() => {
    if (typeof text !== 'string' || !text) return null;
    const out = [];
    let bold = false;
    text.split(/(<\/?strong>)/i).forEach((part, i) => {
      if (/^<strong>$/i.test(part)) { bold = true; return; }
      if (/^<\/strong>$/i.test(part)) { bold = false; return; }
      if (!part) return;
      out.push(bold ? <strong key={i}>{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>);
    });
    return out;
  }, [text]);
  return <>{nodes}</>;
};

export default SafeActivityText;
