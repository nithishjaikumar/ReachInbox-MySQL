const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'H1', 'H2', 'H3',
  'HR', 'I', 'LI', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'U', 'UL',
]);

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/** Sanitize rich-text HTML before rendering it in the email detail view. */
export function sanitizeEmailHtml(input: string): string {
  const parsed = new DOMParser().parseFromString(input, 'text/html');
  const elements = Array.from(parsed.body.querySelectorAll('*'));

  for (const element of elements) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const href = element.tagName === 'A' ? element.getAttribute('href') : null;
    const style = element.getAttribute('style');
    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name);
    }

    if (element.tagName === 'A' && href) {
      try {
        const url = new URL(href, window.location.origin);
        if (SAFE_LINK_PROTOCOLS.has(url.protocol)) {
          element.setAttribute('href', url.href);
          element.setAttribute('rel', 'noopener noreferrer nofollow');
          element.setAttribute('target', '_blank');
        }
      } catch {
        // Invalid URLs are left without a clickable href.
      }
    }

    // Preserve only text alignment from the editor's inline style output.
    const alignment = style?.match(/text-align\s*:\s*(left|right|center|justify)\s*;?/i)?.[1];
    if (alignment) element.setAttribute('style', `text-align:${alignment.toLowerCase()}`);
  }

  return parsed.body.innerHTML;
}
