import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import AdminAbout from './AdminAbout';
import api from '../../services/api';

jest.mock('../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn(), post: jest.fn() } }));

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
const t = {};

const about = {
  hero: { title: { en: 'Welcome' }, image: 'https://cdn/hero.jpg' },
  introText: { en: 'Intro copy' },
  sections: [
    { key: 's1', title: { en: 'History' }, body: { en: 'Old' }, paragraphs: { p1: { en: 'P one' } }, listTitle: {}, points: [], image: '', enabled: true },
    { key: 's2', title: { en: 'Rituals' }, body: { en: 'Body' }, paragraphs: {}, listTitle: {}, points: [], image: '', enabled: false },
  ],
  activities: [
    { key: 'a1', title: { en: 'Bhajan' }, desc: {}, paragraphs: {}, enabled: true },
  ],
};

const load = () => api.get.mockResolvedValue({ data: { data: JSON.parse(JSON.stringify(about)) } });

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  api.get.mockReset();
  api.put.mockReset();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.querySelectorAll('[role=dialog]').forEach((d) => d.closest('div[role=presentation]')?.remove());
});

const render = async () => {
  load();
  await act(async () => { root.render(<AdminAbout t={t} />); });
};
const $ = (s) => container.querySelector(s);
const $$ = (s) => [...container.querySelectorAll(s)];
const dialog = () => document.querySelector('[role=dialog]');
const type = (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const click = (el) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

describe('AdminAbout layout', () => {
  test('renders four numbered cards', async () => {
    await render();
    const headings = $$('h3').map((h) => h.textContent);
    expect(headings).toEqual(['Hero Banner', 'Intro Text', 'About Sections', 'Activities & Programs']);
  });

  test('sections and activities are compact rows, not expanded forms', async () => {
    await render();
    expect($$('li')).toHaveLength(3); // 2 sections + 1 activity
    // The paragraph editors are not on the page any more.
    expect($('#sec-p1')).toBeNull();
    expect($('#act-p1')).toBeNull();
  });

  test('no save bar until something is edited', async () => {
    await render();
    expect(container.textContent).not.toContain('You have unsaved changes.');

    type($('#about-intro'), 'New intro');
    expect(container.textContent).toContain('You have unsaved changes.');
  });
});

describe('AdminAbout popups', () => {
  test('editing a section opens it in a popup with every field', async () => {
    await render();
    const editBtn = $$('button').find((b) => /Edit/.test(b.textContent));
    click(editBtn);

    const dlg = dialog();
    expect(dlg).not.toBeNull();
    expect(dlg.querySelector('#sec-title').value).toBe('History');
    expect(dlg.querySelector('#sec-p1').value).toBe('P one');
    // Image, list heading and bullets are all in here.
    expect(dlg.textContent).toContain('Image');
    expect(dlg.querySelector('#sec-list-title')).not.toBeNull();
  });

  test('a paragraph edit keeps the legacy description in step with paragraph 1', async () => {
    await render();
    click($$('button').find((b) => /Edit/.test(b.textContent)));

    type(dialog().querySelector('#sec-p1'), 'Rewritten opening');
    await act(async () => {
      click($$('button').find((b) => /Save About Page/.test(b.textContent)));
    });

    const sent = api.put.mock.calls[0][1];
    expect(sent.sections[0].paragraphs.p1.en).toBe('Rewritten opening');
    expect(sent.sections[0].body.en).toBe('Rewritten opening');
  });

  test('editing an activity opens its own popup', async () => {
    await render();
    const editBtns = $$('button').filter((b) => /Edit/.test(b.textContent));
    click(editBtns[editBtns.length - 1]);

    const dlg = dialog();
    expect(dlg.querySelector('#act-title').value).toBe('Bhajan');
    expect(dlg.querySelector('#act-desc')).not.toBeNull();
  });

  test('adding a section creates it and opens it straight away', async () => {
    await render();
    click($$('button').find((b) => /Add Section/.test(b.textContent)));

    expect(dialog()).not.toBeNull();
    expect(dialog().querySelector('#sec-title').value).toBe('New Section');
  });

  test('adding an activity opens its popup too', async () => {
    await render();
    click($$('button').find((b) => /Add Activity/.test(b.textContent)));
    expect(dialog().querySelector('#act-title').value).toBe('New Activity');
  });

  test('closing a popup keeps the edit (nothing is thrown away)', async () => {
    await render();
    click($$('button').find((b) => /Edit/.test(b.textContent)));
    type(dialog().querySelector('#sec-title'), 'Renamed');

    click(dialog().querySelector('button[aria-label=Close]'));
    expect(dialog()).toBeNull();
    expect(container.textContent).toContain('Renamed');
  });
});

describe('AdminAbout row controls', () => {
  test('hide flips the visible pill', async () => {
    await render();
    const hideBtn = $$('button').find((b) => b.getAttribute('aria-label') === 'Hide');
    click(hideBtn);
    expect($$('button').filter((b) => b.getAttribute('aria-label') === 'Show').length).toBe(2);
  });

  test('delete removes the row after confirming', async () => {
    await render();
    click($$('button').find((b) => b.getAttribute('aria-label') === 'Remove'));
    expect($$('li')).toHaveLength(2); // was 3
  });

  test('move up and down reorder, and the first row cannot move up', async () => {
    await render();
    const ups = $$('button').filter((b) => b.getAttribute('aria-label') === 'Move up');
    expect(ups[0].disabled).toBe(true);

    click($$('button').filter((b) => b.getAttribute('aria-label') === 'Move down')[0]);
    const titles = $$('li span.min-w-0').map((s) => s.textContent);
    expect(titles).toEqual(['Rituals', 'History', 'Bhajan']);
  });

  test('bullet points can be added inside the section popup', async () => {
    await render();
    click($$('button').find((b) => /Edit/.test(b.textContent)));
    click([...dialog().querySelectorAll('button')].find((b) => /Add Point/.test(b.textContent)));
    const inputs = [...dialog().querySelectorAll('input[type=text]')].filter((i) => /Point/.test(i.getAttribute('aria-label') || ''));
    expect(inputs).toHaveLength(1);
  });
});

describe('AdminAbout save', () => {
  test('saves hero, intro, sections and activities together', async () => {
    await render();
    type($('#about-hero-title'), 'New hero title');
    await act(async () => {
      click($$('button').find((b) => /Save About Page/.test(b.textContent)));
    });

    expect(api.put).toHaveBeenCalledWith('/about', expect.objectContaining({
      hero: expect.objectContaining({ image: 'https://cdn/hero.jpg' }),
      introText: expect.objectContaining({ en: 'Intro copy' }),
      sections: expect.any(Array),
      activities: expect.any(Array),
    }));
  });

  test('the save bar disappears once the page is reloaded clean', async () => {
    await render();
    type($('#about-intro'), 'Changed');
    expect(container.textContent).toContain('You have unsaved changes.');

    load();
    await act(async () => {
      click($$('button').find((b) => /Save About Page/.test(b.textContent)));
    });
    expect(container.textContent).not.toContain('You have unsaved changes.');
  });
});