import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const html = readFileSync(resolve(ROOT, 'index.html'), 'utf-8');
const scriptSource = readFileSync(resolve(ROOT, 'script.js'), 'utf-8');

/**
 * Loads the real index.html into the jsdom document and executes the real
 * script.js against it. Because the production markup is used as-is, tests
 * also catch accidental ID/markup renames that the script depends on.
 *
 * Returns a cleanup() that removes the window-level listeners the script
 * registers, so repeated loads across tests don't accumulate handlers.
 */
export function loadPage() {
  // Strip the doctype and <html> wrapper so head + body land inside
  // documentElement, keeping getElementById lookups working across the doc.
  const inner = html
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<html[^>]*>/i, '')
    .replace(/<\/html>/i, '');
  document.documentElement.innerHTML = inner;

  // jsdom doesn't implement scrollIntoView; the submit handler calls it.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }

  // Browser parity: real browsers expose form controls as named properties on
  // the form (e.g. form.email), which the script relies on. jsdom only exposes
  // them via form.elements, so mirror them onto the form here.
  document.querySelectorAll('form').forEach(form => {
    Array.from(form.elements).forEach(el => {
      [el.name, el.id].forEach(key => {
        if (key && !(key in form)) {
          Object.defineProperty(form, key, {
            configurable: true,
            get() {
              return form.elements.namedItem(key);
            },
          });
        }
      });
    });
  });

  // Track window listeners registered by the script so we can remove them.
  const tracked = [];
  const originalAdd = window.addEventListener.bind(window);
  window.addEventListener = (type, listener, options) => {
    tracked.push([type, listener, options]);
    originalAdd(type, listener, options);
  };

  // Run the IIFE in the global (jsdom) scope so window/document resolve.
  // eslint-disable-next-line no-new-func
  new Function(scriptSource)();

  window.addEventListener = originalAdd;

  return function cleanup() {
    tracked.forEach(([type, listener, options]) =>
      window.removeEventListener(type, listener, options)
    );
  };
}
