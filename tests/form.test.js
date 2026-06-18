import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadPage } from './helpers/loadPage.js';

const WHATSAPP_NUMBER = '919182227241';

let cleanup;

/** Fill the demo form with valid values, overriding specific fields. */
function fillForm(overrides = {}) {
  const values = {
    fullName: 'Arjun Kumar',
    phone: '9182227241',
    email: 'arjun@example.com',
    course: 1, // select option index (1 = first real option)
    source: 1,
    ...overrides,
  };
  document.getElementById('fullName').value = values.fullName;
  document.getElementById('phone').value = values.phone;
  document.getElementById('email').value = values.email;
  document.getElementById('course').selectedIndex = values.course;
  document.getElementById('source').selectedIndex = values.source;
}

function submit() {
  const form = document.getElementById('demoForm');
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

beforeEach(() => {
  cleanup = loadPage();
  window.open = vi.fn();
  // The submit handler POSTs the lead to a PHP endpoint; stub it so tests
  // never touch the live domain.
  global.fetch = vi.fn(() => Promise.resolve({ ok: true }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  cleanup();
});

describe('demo form submission (revenue path)', () => {
  it('blocks submit and flags empty required fields without opening WhatsApp', () => {
    // Leave everything blank.
    submit();

    expect(window.open).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.getElementById('fullName').style.borderColor).toBeTruthy();
    expect(document.getElementById('formSuccess').hidden).toBe(true);
  });

  it('POSTs the lead to the form handler with all collected fields', () => {
    fillForm({ fullName: 'Arjun Kumar', email: 'arjun@example.com' });
    submit();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [endpoint, options] = global.fetch.mock.calls[0];
    expect(endpoint).toContain('form-handler.php');
    expect(options.method).toBe('POST');

    const payload = JSON.parse(options.body);
    expect(payload).toMatchObject({
      name: 'Arjun Kumar',
      phone: '9182227241',
      email: 'arjun@example.com',
      source: 'Instagram',
    });
    expect(payload.course).toBeTruthy();
  });

  it('builds the WhatsApp URL with the configured number and all field values', () => {
    vi.useFakeTimers();
    fillForm({ fullName: 'Arjun Kumar', email: 'arjun@example.com' });
    submit();
    vi.advanceTimersByTime(900);

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url, target, features] = window.open.mock.calls[0];

    expect(url.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    expect(target).toBe('_blank');
    // Security regression guard: handoff must not leak window.opener.
    expect(features).toContain('noopener');
    expect(features).toContain('noreferrer');

    const text = new URL(url).searchParams.get('text');
    expect(text).toContain('Arjun Kumar');
    expect(text).toContain('9182227241');
    expect(text).toContain('arjun@example.com');
    // The required "source" field must make it into the message.
    expect(text).toContain('Instagram');
  });

  it('percent-encodes special characters so the message is not corrupted', () => {
    vi.useFakeTimers();
    fillForm({ fullName: 'A & B Söhne' });
    submit();
    vi.advanceTimersByTime(900);

    const [url] = window.open.mock.calls[0];
    // Raw URL must carry encoded ampersand/space, not literal ones.
    expect(url).toContain('%26'); // &
    expect(url).toContain('%20'); // space
    // ...and it must decode back to the exact original.
    const text = new URL(url).searchParams.get('text');
    expect(text).toContain('A & B Söhne');
  });

  it('shows the success banner, disables the button, then resets the form', () => {
    vi.useFakeTimers();
    const btn = document
      .getElementById('demoForm')
      .querySelector('button[type="submit"]');

    fillForm();
    submit();

    // Immediately: success visible, button disabled.
    expect(document.getElementById('formSuccess').hidden).toBe(false);
    expect(btn.disabled).toBe(true);

    // After the handoff delay: form reset, button re-enabled.
    vi.advanceTimersByTime(900);
    expect(btn.disabled).toBe(false);
    expect(document.getElementById('fullName').value).toBe('');

    // After the lingering delay: success banner hidden again.
    vi.advanceTimersByTime(5000);
    expect(document.getElementById('formSuccess').hidden).toBe(true);
  });
});
