import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import api from '../../services/api';
import { GalleryUploadModal, GalleryEditModal, detailsFromItem, hasDetails, validateDetails } from './GalleryForms';

jest.mock('../../services/api', () => ({ __esModule: true, default: { post: jest.fn(), put: jest.fn() } }));
jest.mock('../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
  api.post.mockReset();
  api.put.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  console.error.mockRestore();
});

const render = (ui) => act(() => { root.render(ui); });
const $ = (selector) => container.querySelector(selector);
const type = (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const pickFile = (file) => act(() => {
  const input = $('input[type=file]');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
const submit = async () => { await act(async () => { $('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); };
const alerts = () => [...container.querySelectorAll('[role=alert]')].map((e) => e.textContent);
const photo = () => new File(['x'], 'aarti.jpg', { type: 'image/jpeg' });

const t = {};

describe('details helpers', () => {
  test('a stand-in caption is not a title', () => {
    expect(hasDetails({ title: { en: '' }, cap: { en: 'Gallery Image' }, description: { en: 'Text' } })).toBe(false);
    expect(hasDetails({ title: { en: '' }, cap: { en: 'WhatsApp Image 2026-07-24 at 11.02' }, description: { en: 'Text' } })).toBe(false);
  });

  test('a real title and description in either language is enough', () => {
    expect(hasDetails({ title: { ne: 'आरती' }, description: { en: 'Evening lamps.' } })).toBe(true);
    expect(hasDetails({ title: { en: 'Aarti' }, description: { en: '  ' } })).toBe(false);
  });

  test('a real caption stands in for the title when editing', () => {
    expect(detailsFromItem({ cap: { en: 'Evening aarti' }, title: {}, description: {} }).title.en).toBe('Evening aarti');
    expect(detailsFromItem({ cap: { en: 'Gallery Image' }, title: {}, description: {} }).title.en).toBe('');
  });

  test('both fields are checked', () => {
    const found = validateDetails({ title: { en: '', ne: '' }, description: { en: '', ne: 'विवरण' } }, t);
    expect(Object.keys(found)).toEqual(['title']);
  });
});

describe('GalleryUploadModal', () => {
  test('sends nothing until a file, a title and a description are there', async () => {
    const onUploaded = jest.fn();
    render(<GalleryUploadModal t={t} onClose={() => {}} onUploaded={onUploaded} />);

    await submit();
    expect(api.post).not.toHaveBeenCalled();
    expect(alerts().length).toBeGreaterThanOrEqual(3); // file, title, description

    pickFile(photo());
    await submit();
    expect(api.post).not.toHaveBeenCalled();
    expect(alerts().sort()).toEqual(['Add a description in English or Nepali.', 'Add a title in English or Nepali.']);

    type($('#gu-title-en'), 'Evening aarti');
    await submit();
    expect(api.post).not.toHaveBeenCalled();
    expect(alerts()).toEqual(['Add a description in English or Nepali.']);
  });

  test('uploads a photo with Nepali and English text', async () => {
    api.post.mockResolvedValue({ data: { data: { _id: 'new1' } } });
    const onUploaded = jest.fn();
    render(<GalleryUploadModal t={t} onClose={() => {}} onUploaded={onUploaded} />);

    pickFile(photo());
    type($('#gu-title-ne'), 'साँझको आरती');
    type($('#gu-description-en'), 'Lamps and bells at dusk.');
    await submit();

    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, form] = api.post.mock.calls[0];
    expect(url).toBe('/admin/gallery');
    expect(form.get('photo').name).toBe('aarti.jpg');
    const data = JSON.parse(form.get('data'));
    expect(data.title).toEqual({ en: '', ne: 'साँझको आरती' });
    expect(data.cap).toEqual(data.title);
    expect(data.description).toEqual({ en: 'Lamps and bells at dusk.', ne: '' });
    expect(onUploaded).toHaveBeenCalledWith({ _id: 'new1' });
  });

  test('a video goes to the video endpoint with its text as form fields', async () => {
    api.post.mockResolvedValue({ data: { data: { _id: 'v1' } } });
    render(<GalleryUploadModal t={t} onClose={() => {}} onUploaded={() => {}} />);

    pickFile(new File(['x'], 'rath.mp4', { type: 'video/mp4' }));
    type($('#gu-title-en'), 'Rath yatra');
    type($('#gu-description-en'), 'The chariot leaves the temple.');
    await submit();

    const [url, form] = api.post.mock.calls[0];
    expect(url).toBe('/admin/gallery/video');
    expect(form.get('video').name).toBe('rath.mp4');
    expect(JSON.parse(form.get('title')).en).toBe('Rath yatra');
    expect(JSON.parse(form.get('description')).en).toBe('The chariot leaves the temple.');
  });

  test('refuses a file that is neither a photo nor a video', () => {
    render(<GalleryUploadModal t={t} onClose={() => {}} onUploaded={() => {}} />);
    pickFile(new File(['x'], 'notes.pdf', { type: 'application/pdf' }));
    expect(alerts()).toEqual(['Please choose a photo or a video.']);
  });

  test('refuses a photo over 10 MB', () => {
    render(<GalleryUploadModal t={t} onClose={() => {}} onUploaded={() => {}} />);
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    pickFile(big);
    expect(alerts()[0]).toMatch(/too large/);
  });
});

describe('GalleryEditModal', () => {
  const item = { _id: 'p1', type: 'photo', photo: 'x.jpg', category: 'temple', cap: { en: 'Gallery Image' }, title: { en: '', hi: 'हिन्दी शीर्षक' }, description: { en: '' } };

  test('will not save with the title or description blank', async () => {
    render(<GalleryEditModal item={item} t={t} onClose={() => {}} onSaved={() => {}} />);
    await submit();
    expect(api.put).not.toHaveBeenCalled();
    expect(alerts().length).toBe(2);
  });

  test('saves both languages and keeps the ones it does not edit', async () => {
    api.put.mockResolvedValue({ data: { data: { ...item, _id: 'p1' } } });
    const onSaved = jest.fn();
    render(<GalleryEditModal item={item} t={t} onClose={() => {}} onSaved={onSaved} />);

    type($('#ge-title-en'), 'Temple front');
    type($('#ge-description-ne'), 'मन्दिरको अगाडिको भाग।');
    await submit();

    const [url, payload] = api.put.mock.calls[0];
    expect(url).toBe('/admin/gallery/p1');
    expect(payload.title).toEqual({ en: 'Temple front', ne: '', hi: 'हिन्दी शीर्षक' });
    expect(payload.description.ne).toBe('मन्दिरको अगाडिको भाग।');
    expect(payload.category).toBe('temple');
    expect(onSaved).toHaveBeenCalled();
  });

  test('a video keeps its own category', async () => {
    api.put.mockResolvedValue({ data: { data: {} } });
    const video = { _id: 'v1', type: 'video', photo: 'v.mp4', category: 'videos', title: { en: 'Procession' }, description: { en: 'Rath yatra.' } };
    render(<GalleryEditModal item={video} t={t} onClose={() => {}} onSaved={() => {}} />);
    expect($('#ge-category')).toBeNull();
    await submit();
    expect(api.put.mock.calls[0][1]).not.toHaveProperty('category');
  });
});
