import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import AdminLogo from './AdminLogo';
import { Card, Dropzone, SaveBar } from './kit/PageShell';

jest.mock('../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../../services/api', () => ({ __esModule: true, default: { post: jest.fn(), put: jest.fn() } }));

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
const t = {};
const settings = { logo: { photo: 'https://cdn/logo.png', text: { en: 'Shree Ramchandra', ne: 'श्री रामचन्द्र' } } };

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  // Portalled dialogs are mounted outside the container.
  document.body.querySelectorAll('[role=dialog]').forEach((d) => d.closest('div[role=presentation]')?.remove());
});

const render = (ui) => act(() => { root.render(ui); });
const $ = (sel) => container.querySelector(sel);
const $$ = (sel) => [...container.querySelectorAll(sel)];
const type = (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

describe('PageShell', () => {
  test('Card shows its number, icon, title and description', () => {
    render(<Card n={3} title="Styling" description="Pick a size">body</Card>);
    expect($('h3').textContent).toBe('Styling');
    expect(container.textContent).toContain('Pick a size');
    expect($('.rounded-full.bg-brand-600').textContent).toBe('3');
  });

  test('Card leaves the number out when n is not given', () => {
    render(<Card title="No number">body</Card>);
    expect($('.bg-brand-600')).toBeNull();
  });

  test('SaveBar stays hidden until there is something to save', () => {
    const onSave = jest.fn();
    const { rerender } = { rerender: null };
    render(<SaveBar dirty={false} onSave={onSave} />);
    expect($('button')).toBeNull();
    act(() => { root.render(<SaveBar dirty saving={false} onSave={onSave} />); });
    expect($('button')).not.toBeNull();
  });

  test('Dropzone only offers Remove once there is a picture', () => {
    const ref = React.createRef();
    render(<Dropzone inputRef={ref} onPick={() => {}} empty={<span>pick</span>} />);
    expect(container.textContent).toContain('pick');
    expect($$('button').length).toBe(0);
    act(() => { root.render(<Dropzone inputRef={ref} onPick={() => {}} onRemove={() => {}} preview="x.png" empty={<span>pick</span>} />); });
    expect($$('button').length).toBe(1);
  });
});

describe('AdminLogo', () => {
  test('renders the three numbered cards and the saved preview', () => {
    render(<AdminLogo settings={settings} updateSettings={jest.fn()} t={t} />);
    const headings = $$('h3').map((h) => h.textContent);
    expect(headings).toEqual(['Live Preview', 'Logo Image', 'Logo Text']);
    // The saved picture is what the preview shows.
    expect($('img').getAttribute('src')).toBe('https://cdn/logo.png');
  });

  test('no save bar until something changes, then it appears', () => {
    render(<AdminLogo settings={settings} updateSettings={jest.fn()} t={t} />);
    expect($('#logo-text')).not.toBeNull();
    expect(container.textContent).not.toContain('You have unsaved changes.');

    type($('#logo-text'), 'Edited name');
    expect(container.textContent).toContain('You have unsaved changes.');
  });

  test('editing the text previews immediately', () => {
    render(<AdminLogo settings={settings} updateSettings={jest.fn()} t={t} />);
    type($('#logo-text'), 'Edited name');
    const preview = $('.border-dashed');
    expect(preview.textContent).toContain('Edited name');
  });

  test('styling opens in a popup and edits from there', () => {
    render(<AdminLogo settings={settings} updateSettings={jest.fn()} t={t} />);
    // The dialog is portalled onto document.body, not into the page container.
    expect(document.querySelector('[role=dialog]')).toBeNull();

    const stylingBtn = $$('button').find((b) => /Styling/.test(b.textContent));
    act(() => { stylingBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const dialog = document.querySelector('[role=dialog]');
    expect(dialog).not.toBeNull();
    // Size and shape pickers live in the popup, not on the page.
    expect(dialog.textContent).toContain('Logo Size');
    expect(dialog.textContent).toContain('Logo Shape');
    expect(container.textContent).not.toContain('Logo Size');
  });

  test('a size picked in the popup changes the preview', () => {
    render(<AdminLogo settings={settings} updateSettings={jest.fn()} t={t} />);
    const stylingBtn = $$('button').find((b) => /Styling/.test(b.textContent));
    act(() => { stylingBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const dialog = document.querySelector('[role=dialog]');
    const large = [...dialog.querySelectorAll('button[role=radio]')].find((b) => b.textContent.trim() === '2XL');
    act(() => { large.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(container.textContent).toContain('You have unsaved changes.');
    expect($('.border-dashed img')).not.toBeNull();
  });

  test('saving sends the whole logo object', async () => {
    const updateSettings = jest.fn().mockResolvedValue(undefined);
    render(<AdminLogo settings={settings} updateSettings={updateSettings} t={t} />);

    type($('#logo-text'), 'Edited name');
    await act(async () => {
      $$('button').find((b) => /Save all settings/.test(b.textContent)).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(updateSettings).toHaveBeenCalledTimes(1);
    const payload = updateSettings.mock.calls[0][0];
    expect(payload.logo.text.en).toBe('Edited name');
    expect(payload.logo.photo).toBe('https://cdn/logo.png');
  });

  test('discard puts the saved values back', () => {
    render(<AdminLogo settings={settings} updateSettings={jest.fn()} t={t} />);
    type($('#logo-text'), 'Edited name');
    expect($('#logo-text').value).toBe('Edited name');

    const discard = $$('button').find((b) => /Discard/.test(b.textContent));
    act(() => { discard.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect($('#logo-text').value).toBe('Shree Ramchandra');
  });
});