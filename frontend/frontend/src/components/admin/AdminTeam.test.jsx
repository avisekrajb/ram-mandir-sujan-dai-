import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import AdminTeam from './AdminTeam';
import api from '../../services/api';

jest.mock('../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: () => ({ lang: 'en', t: {} }) }));
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
const t = {};

const members = [
  { _id: 'm1', name: { en: 'Ram Sharma', ne: 'राम शर्मा' }, roleType: 'president', role: { ne: 'अध्यक्ष' }, enabled: true, email: 'ram@temple.np', order: 0 },
  { _id: 'm2', name: { en: 'Sita Devi', ne: 'सीता देवी' }, roleType: 'member', role: { ne: 'सदस्य' }, enabled: false, email: 'sita@temple.np', order: 1 },
];

const settings = {
  teamPageTitle: { en: 'Committee', ne: 'कार्यसमिति' },
  teamContent: [
    { key: 'c1', title: { en: 'Purpose' }, paragraphs: { p1: { en: 'One' } }, listTitle: {}, points: [], showMembers: true, order: 0 },
  ],
};

const load = () => {
  api.get.mockImplementation((url) => {
    if (url === '/admin/team/roles') return Promise.resolve({ data: { labels: { president: { en: 'President', ne: 'अध्यक्ष' } }, hierarchy: {} } });
    if (url === '/admin/settings') return Promise.resolve({ data: settings });
    return Promise.resolve({ data: {} });
  });
};

const render = async (team = members, setTeam = jest.fn()) => {
  load();
  await act(async () => { root.render(<AdminTeam team={team} setTeam={setTeam} t={t} />); });
  return setTeam;
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  api.get.mockReset();
  api.put.mockReset();
  api.post.mockReset();
  api.delete.mockReset();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.querySelectorAll('[role=dialog]').forEach((d) => d.closest('div[role=presentation]')?.remove());
});

const $ = (s) => container.querySelector(s);
const $$ = (s) => [...container.querySelectorAll(s)];
const dialog = () => document.querySelector('[role=dialog]');
// Dialog buttons live in the portal, outside the container.
const dialogBtn = (re) => [...dialog().querySelectorAll('button')].find((b) => re.test(b.textContent));
// A card's own buttons, found within one card only.
const cardAt = (i) => $$('h3')[i].closest('div.rounded-xl');
const type = (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const click = (el) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const byText = (re) => $$('button').find((b) => re.test(b.textContent));

describe('AdminTeam layout', () => {
  test('renders two numbered cards', async () => {
    await render();
    const headings = $$('h3').map((h) => h.textContent);
    expect(headings).toEqual(['Team Members', 'Committee Page Content']);
  });

  test('members are listed with a role badge and a status pill', async () => {
    await render();
    expect(container.textContent).toContain('President');
    expect(container.textContent).toContain('Active');
    expect(container.textContent).toContain('Hidden');
  });

  test('grid and list views both work', async () => {
    await render();
    expect($('table')).toBeNull();
    click(byText(/^List$/));
    expect($('table')).not.toBeNull();
    click(byText(/^Grid$/));
    expect($('table')).toBeNull();
  });

  test('search filters the members', async () => {
    await render();
    type($('input[type=search]'), 'sita');
    expect(container.textContent).toContain('सीता देवी');
    expect(container.textContent).not.toContain('राम शर्मा');
  });
});

describe('AdminTeam member popup', () => {
  test('Add Member opens a blank popup, not a whole new page', async () => {
    await render();
    // The list is still on the page behind the dialog.
    expect(container.textContent).toContain('राम शर्मा');

    click(byText(/Add Member/));
    expect(dialog()).not.toBeNull();
    expect(dialog().querySelector('#tm-name').value).toBe('');
    expect(dialog().querySelector('#tm-email')).not.toBeNull();
    expect(dialog().querySelector('#tm-bio')).not.toBeNull();
  });

  test('Edit opens the popup filled in with that member', async () => {
    await render();
    click(byText(/Edit/));
    expect(dialog().querySelector('#tm-name').value).toBe('Ram Sharma');
    expect(dialog().querySelector('#tm-role').value).toBe('president');
  });

test('saving a new member posts and closes', async () => {
    api.post.mockResolvedValue({ data: { _id: 'm3', name: { en: 'New Person' } } });
    const setTeam = await render();

    click(byText(/Add Member/));
    type(dialog().querySelector('#tm-name'), 'New Person');
    await act(async () => { click(dialogBtn(/Add Member/)); });

    expect(api.post).toHaveBeenCalledWith('/admin/team', expect.objectContaining({ name: expect.objectContaining({ en: 'New Person' }) }));
    expect(setTeam).toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });

  test('saving an existing member puts, and fills a blank role from the default', async () => {
    api.put.mockResolvedValue({ data: { ...members[0] } });
    await render();

    click(byText(/Edit/));
    type(dialog().querySelector('#tm-custom-role'), '');
    await act(async () => { click(dialogBtn(/Update Member/)); });

    const payload = api.put.mock.calls[0][1];
    expect(api.put.mock.calls[0][0]).toBe('/admin/team/m1');
    expect(payload.role.en).toBe('President');
  });

  test('a member with no English name is refused before any request', async () => {
    await render();
    click(byText(/Add Member/));
    await act(async () => { click(dialogBtn(/Add Member/)); });
    expect(api.post).not.toHaveBeenCalled();
    // Still open, so the name can be typed.
    expect(dialog()).not.toBeNull();
  });

  test('cancel closes without saving', async () => {
    await render();
    click(byText(/Edit/));
    type(dialog().querySelector('#tm-name'), 'Changed');
    click(dialogBtn(/Cancel/));
    expect(api.put).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });
});

describe('AdminTeam row actions', () => {
  test('hide/show toggles straight away, without the popup', async () => {
    api.put.mockResolvedValue({ data: { ...members[0], enabled: false } });
    const setTeam = await render();

    const hideBtn = $$('button').find((b) => b.getAttribute('aria-label') === 'Hide');
    await act(async () => { click(hideBtn); });
    expect(api.put).toHaveBeenCalledWith('/admin/team/m1', expect.objectContaining({ enabled: false }));
    expect(setTeam).toHaveBeenCalled();
  });

test('delete asks first, then removes just that member', async () => {
    api.delete.mockResolvedValue({ data: { success: true } });
    const setTeam = await render();

    await act(async () => { click($$('button').find((b) => b.getAttribute('aria-label') === 'Delete')); });
    expect(api.delete).toHaveBeenCalledWith('/admin/team/m1');
    // m1 gone, m2 kept.
    expect(setTeam).toHaveBeenCalledWith([members[1]]);
  });
});

describe('AdminTeam committee content', () => {
test('sections are compact rows that open a popup', async () => {
    await render();
    expect($('#tc-title')).toBeNull();
    // The committee card's own Edit, not a member card's.
    const contentCard = cardAt(1);
    const edit = [...contentCard.querySelectorAll('button')].find((b) => /Edit/.test(b.textContent));
    click(edit);

    expect(dialog().querySelector('#tc-title').value).toBe('Purpose');
    expect(dialog().querySelector('#tc-p1').value).toBe('One');
  });

  test('a save bar appears only once the content is changed', async () => {
    await render();
    expect(container.textContent).not.toContain('You have unsaved changes.');

    type($('#team-page-title'), 'New title');
    expect(container.textContent).toContain('You have unsaved changes.');
  });

test('saving content sends the page title and the sections', async () => {
    api.put.mockResolvedValue({ data: {} });
    await render();

    // The card edits in Nepali first, so that is the field that changes.
    type($('#team-page-title'), 'नयाँ कार्यसमिति');
    await act(async () => { click(byText(/Save Content/)); });

    expect(api.put).toHaveBeenCalledWith('/admin/settings', expect.objectContaining({
      teamPageTitle: expect.objectContaining({ en: 'Committee', ne: 'नयाँ कार्यसमिति' }),
      teamContent: expect.any(Array),
    }));
  });

  test('the members toggle flips on the row', async () => {
    await render();
    const toggle = $$('button[aria-pressed]').find((b) => b.getAttribute('title'));
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    click(toggle);
    expect($$('button[aria-pressed]').find((b) => b.getAttribute('title')).getAttribute('aria-pressed')).toBe('false');
  });

  test('adding a section opens it straight away', async () => {
    await render();
    click(byText(/Add Section/));
    expect(dialog()).not.toBeNull();
    expect(dialog().querySelector('#tc-title').value).toBe('');
  });
});
