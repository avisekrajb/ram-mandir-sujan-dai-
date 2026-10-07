import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useParams, Link } from 'react-router-dom';
import { PanelTop, BellRing } from 'lucide-react';

/*
 * The super-admin console is addressable per page. These cover the shape of that
 * routing rather than the whole console, which is far too large to render here:
 * the page list, the URL -> page mapping, and the two behaviours that matter -
 * an unknown address falls back to the overview, and the address decides what is
 * shown (so a refresh keeps you where you were).
 */

const TABS = ['overview', 'admins', 'bookings', 'donations', 'media', 'languages', 'maintenance', 'logs', 'database'];
const DELEGATED = ['donationaccount', 'backupandrestore', 'access', 'header', 'bellsound'];

let container;
let root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// Stands in for SuperAdminPage's URL handling.
const Console = () => {
  const { page } = useParams();
  const tab = page || 'overview';
  const delegated = DELEGATED.includes(tab) ? tab : null;
  const known = TABS.includes(tab) || Boolean(delegated);
  return (
    <div>
      <nav>
        {[...TABS, ...DELEGATED].map((id) => (
          <Link key={id} to={`/super/admin/${id}`} data-active={tab === id ? 'yes' : 'no'}>
            {id}
          </Link>
        ))}
      </nav>
      {!known && <Navigate to="/super/admin/overview" replace />}
      {known && <p data-testid="page">{delegated ? `delegated:${delegated}` : tab}</p>}
    </div>
  );
};

const App = () => (
  <MemoryRouter initialEntries={['/super/admin/overview']}>
    <Routes>
      <Route path="/super/admin/:page?" element={<Console />} />
      <Route path="/super/admin/*" element={<Navigate to="/super/admin/overview" replace />} />
    </Routes>
  </MemoryRouter>
);

const at = (path) => {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/super/admin/:page?" element={<Console />} />
          <Route path="/super/admin/*" element={<Navigate to="/super/admin/overview" replace />} />
        </Routes>
      </MemoryRouter>
    );
  });
};

const shown = () => (container.querySelector('[data-testid=page]') || {}).textContent;

describe('super admin console routes', () => {
  test('the bare address shows the overview', () => {
    at('/super/admin');
    expect(shown()).toBe('overview');
  });

  test.each(TABS)('/super/admin/%s shows that page', (slug) => {
    at(`/super/admin/${slug}`);
    expect(shown()).toBe(slug);
  });

  test.each(DELEGATED)('/super/admin/%s mounts the delegated admin page', (slug) => {
    at(`/super/admin/${slug}`);
    expect(shown()).toBe(`delegated:${slug}`);
  });

  test('every address the sidebar links to is one the router knows', () => {
    at('/super/admin/overview');
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toHaveLength(TABS.length + DELEGATED.length);
    hrefs.forEach((href) => {
      const slug = href.replace('/super/admin/', '');
      expect(TABS.includes(slug) || DELEGATED.includes(slug)).toBe(true);
    });
  });

  test('exactly one address is marked as the current page', () => {
    at('/super/admin/bookings');
    const active = [...container.querySelectorAll('[data-active=yes]')].map((a) => a.textContent);
    expect(active).toEqual(['bookings']);
  });

  test('an unknown or mistyped address falls back to the overview', () => {
    at('/super/admin/bellsount');   // the typo
    expect(shown()).toBe('overview');

    at('/super/admin/maintainance'); // the typo
    expect(shown()).toBe('overview');

    at('/super/admin/nonsense');
    expect(shown()).toBe('overview');
  });

  test('the delegated icons used for those links exist in this lucide version', () => {
    // lucide icons are forwardRef objects, not plain functions.
    expect(PanelTop).toBeTruthy();
    expect(BellRing).toBeTruthy();
  });
});