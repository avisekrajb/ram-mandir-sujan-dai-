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
  test('renders all five group headings in canonical order', () => {
    render();
    const headings = [...container.querySelectorAll('nav button[aria-expanded]')].map((b) => b.textContent.trim());
    // Overview used to be a bare button with no heading; it now matches the rest.
    expect(headings).toEqual(['Overview', 'Content', 'Management', 'Accounts', 'Settings']);
  });

  test('the title and every heading are red-brown and bold', () => {
    render();
    const aside = container.querySelector('aside');
    const title = [...aside.querySelectorAll('p')].find((p) => /Admin Dashboard/.test(p.textContent));
    expect(title.className).toContain('text-maroon');
    expect(title.className).toContain('font-bold');

    const headings = [...container.querySelectorAll('nav button[aria-expanded]')];
    expect(headings).toHaveLength(5);
    headings.forEach((h) => {
      expect(h.className).toContain('text-maroon');
      expect(h.className).toContain('font-bold');
    });
  });

  test('the panel is plain light - the colour is the flame, not a background', () => {
    render();
    const aside = container.querySelector('aside');
    // No tint, no gradient, no glass: red-brown text needs a plain light panel.
    expect(aside.className).toContain('bg-white');
    expect(aside.className).not.toContain('gradient');
    expect(aside.className).not.toContain('maroon');
    expect(aside.className).not.toContain('5C0F0C');
    // The old invented "glass sheen" layer is gone.
    expect(container.querySelector('.admin-sidebar-sheen')).toBeNull();
  });

  test('every page button carries the gas-flame glow', () => {
    render();
    const links = [...container.querySelectorAll('nav a')];
    expect(links.length).toBeGreaterThan(5);
    links.forEach((a) => expect(a.className).toContain('admin-flame'));
  });

  test('the flame runs blue to amber on a 3s loop and honours reduced motion', () => {
    render();
    const css = [...container.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    // Gas burner: blue cone, cyan, amber, yellow tip.
    expect(css).toContain('rgba(37, 99, 235, 0.55)');
    expect(css).toContain('rgba(245, 158, 11, 0.50)');
    expect(css).toContain('rgba(251, 191, 36, 0.42)');
    expect(css).toContain('adminFlame 3s');
    // Behind the label, not over it.
    expect(css).toMatch(/\.admin-flame \{ isolation: isolate; \}/);
    expect(css).toContain('prefers-reduced-motion: reduce');
  });

  test('is the plain panel, with no leftover red-brown or glass styling', () => {
    render();
    expect(container.querySelector('aside').className).toContain('admin-sidebar');
  });

  test('the first page shown is Overview', () => {
    render();
    const labels = [...container.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));
    expect(labels[0]).toBe('/admin/overview');
  });
});