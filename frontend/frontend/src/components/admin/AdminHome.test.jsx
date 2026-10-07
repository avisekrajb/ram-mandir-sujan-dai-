import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import AdminHome from './AdminHome';
import api from '../../services/api';

// LanguageSwitcher reads the enabled languages from the server.
jest.mock('../../hooks/useEnabledLanguages', () => () => ['en', 'ne', 'hi', 'zh', 'ta']);
jest.mock('../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
const t = {};

const settings = {
  heroVideo: 'https://cdn.example/old.mp4',
  heroImage: null,
  heroEnabled: true,
  heroTitle: { en: 'Shree Ramchandra Temple', ne: 'श्री रामचन्द्र मन्दिर' },
  heroTagline: { en: 'Where devotion meets the sacred banks of Bagmati' },
  heroShloka: {
    enabled: true,
    invocation: { en: 'Salutations to Lord Shri Ramachandra.' },
    stutiLabel: { en: 'Hymn to Shri Rama:' },
    verse: { en: 'I seek refuge in Lord Shri Ramachandra' },
  },
  galleryImages: [{ url: 'https://cdn.example/g1.jpg' }],
  aboutPreview: {
    images: [],
    title: { en: 'About the Temple' },
    text: { en: 'A beacon of devotion.' },
    enabled: true,
  },
  liveVideo: { enabled: true, url: 'https://youtube.com/embed/x', title: { en: 'Live Darshan' }, description: { en: 'Join us' } },
};

const updateSettings = jest.fn(() => Promise.resolve());

const render = async (over = {}) => {
  api.get.mockResolvedValue({ data: settings });
  await act(async () => {
    root.render(<AdminHome settings={{ ...settings, ...over }} updateSettings={updateSettings} t={t} />);
  });
};

const clickByText = async (label) => {
  const node = [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
  expect(node).toBeTruthy();
  await act(async () => { node.click(); });
};

const setValue = async (el, value) => {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  updateSettings.mockClear();
  api.post.mockReset();
  // jsdom's window.confirm is a stub that returns undefined, which reads as
  // "cancelled" and would skip the handler entirely.
  window.confirm = jest.fn(() => true);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// The hero banner used to live on its own /admin/hero screen. It is managed from
// the Home page now, and these lock in that nothing was dropped on the way.
describe('AdminHome - merged hero banner', () => {
  it('shows the photo upload control alongside the video control when no media is set', async () => {
    await render({ heroVideo: null, heroImage: null });
    const labels = [...container.querySelectorAll('button')].map((b) => b.textContent).join(' | ');
    expect(labels).toMatch(/Upload hero video/);
    expect(labels).toMatch(/Upload hero photo/);
  });

  it('saves hero title, tagline and shloka together with the rest of the home page', async () => {
    await render();
    const payload = await (async () => {
      await clickByText('Save Home Settings');
      return updateSettings.mock.calls[0][0];
    })();
    expect(payload).toHaveProperty('heroTitle');
    expect(payload).toHaveProperty('heroTagline');
    expect(payload).toHaveProperty('heroShloka');
    expect(payload.heroShloka).toHaveProperty('verse');
    expect(payload.heroShloka).toHaveProperty('invocation');
    expect(payload.heroShloka).toHaveProperty('stutiLabel');
    // the fields the home page already owned must still be saved
    expect(payload).toHaveProperty('galleryImages');
    expect(payload).toHaveProperty('aboutPreview');
    expect(payload).toHaveProperty('liveVideo');
    expect(payload).toHaveProperty('heroEnabled');
  });

  it('writes a hero video removal to the server instead of only clearing it on screen', async () => {
    await render();
    const remove = container.querySelector('[aria-label="Remove video"]');
    expect(remove).toBeTruthy();
    await act(async () => { remove.click(); });
    expect(updateSettings).toHaveBeenCalledWith({ heroVideo: null });
  });

  it('writes a hero photo removal to the server', async () => {
    await render({ heroVideo: null, heroImage: 'https://cdn.example/hero.jpg' });
    const remove = container.querySelector('[aria-label="Remove photo"]');
    expect(remove).toBeTruthy();
    await act(async () => { remove.click(); });
    expect(updateSettings).toHaveBeenCalledWith({ heroImage: null });
  });

  it('saves an edited hero title for the language that is being edited', async () => {
    await render();
    const titleInput = container.querySelector('input[type="text"]');
    await setValue(titleInput, 'Edited temple name');
    await clickByText('Save Home Settings');
    expect(updateSettings.mock.calls[0][0].heroTitle.en).toBe('Edited temple name');
  });

  it('unwraps a legacy array-shaped shloka so the text is not lost', async () => {
    await render({ heroShloka: { verse: [{ en: 'Legacy verse text' }] } });
    const verse = [...container.querySelectorAll('textarea')].find((ta) => ta.value === 'Legacy verse text');
    expect(verse).toBeTruthy();
  });

  it('hides the hero banner when the show-on-homepage toggle is switched off', async () => {
    await render();
    const toggle = container.querySelector('input[type="checkbox"]');
    // A real click toggles the box and fires React's onChange; dispatching a
    // bare 'change' event does not reach it.
    await act(async () => { toggle.click(); });
    await clickByText('Save Home Settings');
    expect(updateSettings.mock.calls[0][0].heroEnabled).toBe(false);
  });
});