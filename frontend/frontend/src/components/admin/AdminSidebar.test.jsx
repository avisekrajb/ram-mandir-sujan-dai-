import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { getAdminSections, getAdminPages } from './adminNav';

jest.mock('../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'superadmin', areas: {} }, logout: jest.fn() }) }));
jest.mock('../../hooks/useSiteSettings', () => () => ({ logo: {} }));

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
const t = {};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = () => act(() => {
  root.render(<MemoryRouter><AdminSidebar isOpen onClose={() => {}} t={t} /></MemoryRouter>);
});

describe('admin navigation order', () => {
  test('Overview comes first, then each category in turn', () => {
    const ids = getAdminSections(t, true, null).map((s) => s.id);
    expect(ids).toEqual(['main', 'content', 'management', 'accounts', 'settings']);
  });

  test('Overview is the first page listed', () => {
    expect(getAdminPages(t, true, null)[0].key).toBe('overview');
  });

  test('the order survives a user who may open only some areas', () => {
    const narrow = { role: 'staff', areas: { content: true } };
    const ids = getAdminSections(t, false, narrow).map((s) => s.id);
    // Only the sections they may open, still in the canonical order.
    expect(ids).toEqual(['content', 'settings']);
  });
});

describe('AdminSidebar glass panel', () => {
  test('renders every section heading in canonical order', () => {
    render();
    const headings = [...container.querySelectorAll('nav button[aria-expanded]')].map((b) => b.textContent.trim());
    expect(headings).toEqual(['Content', 'Management', 'Accounts', 'Settings']);
    // Overview sits above them, with no group heading of its own.
    expect(container.textContent).toContain('Overview');
    expect(headings).not.toContain('Overview');
  });

  test('carries the red-brown glass layers and the 3s sheen', () => {
    render();
    const aside = container.querySelector('aside');
    expect(aside.className).toContain('backdrop-blur-xl');
    expect(aside.className).toContain('admin-sidebar');
    expect(container.querySelector('.admin-sidebar-sheen')).not.toBeNull();

    const css = [...container.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    expect(css).toContain('adminSidebarSheen 3s');
    // The motion has to stop for anyone who asked for less of it.
    expect(css).toContain('prefers-reduced-motion: reduce');
  });

  test('the first page shown is Overview', () => {
    render();
    const firstLink = container.querySelector('nav a[href="/admin/overview"]');
    expect(firstLink).not.toBeNull();
    const labels = [...container.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));
    expect(labels[0]).toBe('/admin/overview');
  });
});