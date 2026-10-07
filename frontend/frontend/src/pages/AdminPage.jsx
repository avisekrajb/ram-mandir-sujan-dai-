import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import OmLoader from '../components/common/OmLoader';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminCommandPalette from '../components/admin/AdminCommandPalette';
import AdminAccountMenu from '../components/admin/AdminAccountMenu';
import ForcePasswordChange from '../components/admin/ForcePasswordChange';
import NoAccess from '../components/admin/NoAccess';
import { getAdminPageTitle } from '../components/admin/adminNav';
import { areaForPage, hasArea, isSuperAdminOnlyPage } from '../utils/permissions';

// Admin Components
import AdminOverview from '../components/admin/AdminOverview';
import AdminAccounts from '../components/admin/AdminAccounts';
import AdminAccess from '../components/admin/AdminAccess';
import AdminAudit from '../components/admin/AdminAudit';
import AdminProfile from '../components/admin/AdminProfile';
import AdminLivePuja from '../components/admin/AdminLivePuja';
import AdminHeader from '../components/admin/AdminHeader';
import AdminOfflineNotice from '../components/admin/AdminOfflineNotice';
import AdminQuote from '../components/admin/AdminQuote';
import AdminTimings from '../components/admin/AdminTimings';
import AdminAbout from '../components/admin/AdminAbout';
import AdminHistory from '../components/admin/AdminHistory';
import AdminTeam from '../components/admin/AdminTeam';
import AdminLogo from '../components/admin/AdminLogo';
import AdminEvents from '../components/admin/AdminEvents';
import AdminGallery from '../components/admin/AdminGallery';
import AdminDonations from '../components/admin/AdminDonations';
import AdminBookings from '../components/admin/AdminBookings';
import AdminBookingContent from '../components/admin/AdminBookingContent';

import AdminNotice from '../components/admin/AdminNotice';
import AdminDailyAarti from '../components/admin/AdminDailyAarti';
import AdminBlogs from '../components/admin/AdminBlogs';
import AdminHome from '../components/admin/AdminHome';
import AdminFooter from '../components/admin/AdminFooter';
import AdminSocial from '../components/admin/AdminSocial'; // <-- Import AdminSocial
import AdminFacebookVideos from '../components/admin/AdminFacebookVideos'; // <-- Import AdminFacebookVideos
import AdminNotifications from './AdminNotifications';
import AdminBell from '../components/admin/AdminBell';
import CloudPhotoPage from './CloudPhotoPage';
import AdminContact from '../components/admin/AdminContact';
import AdminReviews from '../components/admin/AdminReviews';
import AdminNewsletter from '../components/admin/AdminNewsletter';
import AdminVisitor from '../components/admin/AdminVisitor';
import AdminBackup from '../components/admin/AdminBackup';
import AdminAccount from '../components/admin/AdminAccount';

import { Menu, Bell, Search } from 'lucide-react';
import LanguageMenu from '../components/common/header/LanguageMenu';
import useEnabledLanguages from '../hooks/useEnabledLanguages';

// Remembered per browser: whether the desktop sidebar is the slim icon rail.
const RAIL_KEY = 'admin:sidebar-rail';
const readRail = () => {
  try { return localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; }
};

const AdminPage = () => {
  const { t, lang, setLang } = useLanguage();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rail, setRail] = useState(readRail);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isSuper = user?.role === 'superadmin';
  const [unreadCount, setUnreadCount] = useState(0);
  // Highest unread count already sounded, so a re-render (or a route change
  // re-reading the same count) does not replay the bell.
  const soundPlayedFor = useRef(0);
  const enabledLangs = useEnabledLanguages();
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [team, setTeam] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [galleryVideos, setGalleryVideos] = useState([]);
  const [donations, setDonations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);
  // Whether the access check below has finished. A browser tab can hold an older copy of
  // the signed-in user (the super administrator may have changed their areas since), so
  // the first load waits for the server's current copy.
  const [synced, setSynced] = useState(false);

  // Pick up changes the super administrator made to this admin's access (or a
  // forced password change) before deciding what to load. refreshUser updates the
  // auth context, so `user` below is already the current copy once `synced` is true.
  useEffect(() => {
    let live = true;
    refreshUser().then(() => { if (live) setSynced(true); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per panel visit
  }, []);

  useEffect(() => {
    // Wait for the access check. While a temporary password is still in use every admin
    // call is refused (the password screen shows instead); load once it has been changed.
    if (!synced || fetched.current || user?.mustChangePassword) return;
    fetched.current = true;

    const fetchData = async () => {
      try {
        // allSettled: one failing endpoint must not blank every other section.
        // Only what this admin may open: an admin restricted by the super
        // administrator would otherwise get a 403 (and an error toast) for
        // every area they do not have.
        const sources = [
          ['/admin/settings', setSettings],
          hasArea(user, 'users') && ['/admin/users', setUsers],
          ['/events', setEvents],
          ['/admin/history', setHistory],
          ['/admin/team', setTeam],
          ['/admin/gallery', setGallery],
          ['/admin/gallery/videos', setGalleryVideos],
          hasArea(user, 'donations') && ['/admin/donations', setDonations],
          hasArea(user, 'bookings') && ['/admin/bookings', setBookings],
        ].filter(Boolean);
        const results = await Promise.allSettled(sources.map(([url]) => api.get(url)));
        const failed = [];
        results.forEach((result, i) => {
          const [url, setter] = sources[i];
          if (result.status === 'fulfilled') {
            setter(result.value.data);
          } else {
            failed.push(url);
            console.error(`Error loading ${url}:`, result.reason);
          }
        });
        // Success is silent (a toast on every visit was only noise); problems are not.
        if (failed.length > 0) {
          showToast((t.a5_adminDataPartial || 'Some admin data could not be loaded ({failed} of {total})').replace('{failed}', failed.length).replace('{total}', sources.length), 'error');
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
        showToast(error.response?.data?.message || t.a5_adminDataLoadError || 'Error loading admin data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Runs once (guarded by the fetched ref) as soon as the access check is done and
    // no temporary password is pending.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced, user?.mustChangePassword]);

  // A 403 NO_AREA_ACCESS means the stored permissions are stale: say so and re-sync.
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error.response?.status === 403 && error.response?.data?.code === 'NO_AREA_ACCESS') {
          showToast(error.response.data.message, 'error');
          refreshUser();
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers are stable enough; avoid re-subscribing
  }, []);

  // Ctrl/Cmd+K (or "/" outside a text field) opens the jump-to palette.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const toggleRail = () => {
    setRail((r) => {
      try { localStorage.setItem(RAIL_KEY, r ? '0' : '1'); } catch { /* private mode */ }
      return !r;
    });
  };

  // Unread notifications for the bell badge; refreshed on every admin page change.
  useEffect(() => {
    let active = true;
    api
      .get('/admin/notifications', { params: { limit: 1 } })
      .then((res) => { if (active) setUnreadCount(res.data?.stats?.unread || 0); })
      .catch(() => { if (active) setUnreadCount(0); });
    return () => { active = false; };
  }, [location.pathname]);

  /*
   * Play the bell sound the admin uploaded when the unread count goes up.
   * Nothing plays until the browser has had a gesture, which every admin click
   * on the bell or a menu provides; the promise rejection is expected the first
   * time and is not an error worth surfacing.
   */
  useEffect(() => {
    const url = settings?.bellSound?.url;
    if (!url || settings?.bellSound?.enabled === false) return;
    if (unreadCount <= 0) return;
    if (soundPlayedFor.current >= unreadCount) return;

    const audio = new Audio(url);
    audio.volume = 0.6;
    const played = audio.play();
    if (played && typeof played.catch === 'function') played.catch(() => {});
    soundPlayedFor.current = unreadCount;
  }, [unreadCount, settings?.bellSound?.url, settings?.bellSound?.enabled]);

  // ========== UPDATE SETTINGS FUNCTION ==========
  const updateSettings = async (newSettings) => {
    try {
      // If newSettings is a function, call it with current settings
      const settingsToUpdate = typeof newSettings === 'function' 
        ? newSettings(settings) 
        : newSettings;
      
      const response = await api.put('/admin/settings', settingsToUpdate);
      setSettings(response.data);
      showToast(t.savedSuccess || 'Changes saved', 'success');
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast(error.response?.data?.message || 'Error updating settings', 'error');
      throw error;
    }
  };

  // A temporary password issued by the super administrator must be replaced
  // before anything else in the panel opens.
  if (user?.mustChangePassword) return <ForcePasswordChange />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <OmLoader size="lg" color="vermilion" className="mx-auto mb-4" />
          <p className="text-ink-soft text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Helper to get page title
  const getPageTitle = () =>
    getAdminPageTitle(t, location.pathname.split('/admin/')[1], user?.role === 'superadmin');

  // Pages the super administrator closed to this admin (or that are super-admin
  // only) render a notice instead of the page; the server refuses them too.
  const pagePath = (location.pathname.split('/admin/')[1] || '').replace(/\/$/, '');
  const pageArea = areaForPage(pagePath);
/*
 * Pages only a super administrator may open, whatever areas they hold: the
 * header (the site's own chrome), backups (a copy of everything, downloadable
 * and restorable) and the notification bell sound (uploaded, and heard by the
 * whole office). The server refuses these too, so hiding them here is about not
 * offering a door that would only fail. The list lives in utils/permissions so
 * this guard and the navigation cannot disagree.
 */
const superOnlyPage = isSuperAdminOnlyPage(pagePath);
const blocked = (pageArea && !hasArea(user, pageArea)) || (superOnlyPage && !isSuper);

  return (
    <div className="flex min-h-screen bg-panel admin-page">
      {/* Sidebar column.
          w-0 on mobile because the <aside> is fixed there (a fixed child
          contributes no width, so the spacer must be forced to 0 or the main
          column is pushed 288px right). At lg the aside becomes static, so the
          spacer reserves exactly its width.
          flex-shrink-0 stops wide media sections (video / photo grids) from
          squeezing the sidebar.
          lg:relative lg:z-40 makes this column a stacking context at lg. Without
          it the sidebar sits in the z-index:auto layer, and any positioned
          element in the content column (sticky header z-30, sticky table
          headers z-10, gallery lightbox z-50) paints on top of it.
          Below lg the column is z-50: a sticky element always forms its own
          stacking layer, so without it the drawer (and its backdrop) painted
          underneath the z-40 top bar. */}
      <div className={`sticky top-0 z-50 h-screen flex-shrink-0 w-0 transition-[width] duration-300 lg:relative lg:z-40 ${rail ? 'lg:w-[76px]' : 'lg:w-72'}`}>
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} rail={rail} onToggleRail={toggleRail} onSearch={() => setPaletteOpen(true)} />
      </div>

      {/* Main Content - scrollable independently.
          min-w-0 lets it shrink below its content width; overflow-y-auto also
          computes overflow-x to auto, so a wide media section scrolls inside
          this column instead of escaping over the sidebar. */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto main-content-scroll">
        {/* sticky top-0 AND left-0: the column is a scroll container, so pinning
            only vertically still lets the header slide sideways and carry the
            menu button out of view when a wide section is scrolled.
            z-40 lifts it above the content column's sticky bits (z-10 table
            headers); modals at z-50 / z-[9999] still cover it. */}
        <header className="sticky top-0 left-0 z-40 flex h-[72px] items-center justify-between gap-3 border-b border-line bg-white/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* shrink-0 + relative z-10 so layout pressure from the title can
                never squeeze or cover the toggle. */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label={t?.openMenu || 'Open menu'}
              className="icon-btn relative z-10 w-11 shrink-0 lg:hidden"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            {/* truncate instead of wrap: a long page title can then never push
                the button out of the header on a narrow phone. */}
            <h1 className="min-w-0 truncate font-serif text-lg font-semibold text-ink sm:text-xl">
              {getPageTitle()}
            </h1>
          </div>
          
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={t.k7_searchAdmin || 'Search the admin panel'}
              className="hidden h-10 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-sm text-mute transition-colors hover:border-brand-300 hover:text-ink md:inline-flex"
            >
              <Search size={15} aria-hidden="true" />
              <span className="pr-6">{t.k7_searchShort || 'Search'}</span>
              <kbd className="rounded border border-line px-1.5 text-[11px] font-medium">Ctrl K</kbd>
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={t.k7_searchAdmin || 'Search the admin panel'}
              className="icon-btn hidden w-11 sm:inline-flex md:hidden"
            >
              <Search size={18} aria-hidden="true" />
            </button>
            {enabledLangs.length > 1 && (
              <LanguageMenu lang={lang} setLang={setLang} enabled={enabledLangs} label={t.language || 'Language'} />
            )}
            <button
              type="button"
              onClick={() => navigate('/admin/notifications')}
              aria-label={unreadCount > 0 ? `${t.notifications || 'Notifications'} (${unreadCount})` : (t.notifications || 'Notifications')}
              className="icon-btn relative w-11"
            >
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-vermilion px-1 text-xs font-bold text-white ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div className="ml-1 border-l border-line pl-2 sm:pl-3">
              <AdminAccountMenu />
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto content-scroll">
          {blocked ? (
            <NoAccess superOnly={superOnlyPage && !isSuper} />
          ) : (
          <Routes>
            {/* Overview */}
            <Route index element={<AdminOverview 
              settings={settings} users={users} events={events} 
              donations={donations} bookings={bookings} 
              t={t} lang={lang} 
            />} />
            <Route path="overview" element={<AdminOverview 
              settings={settings} users={users} events={events} 
              donations={donations} bookings={bookings} 
              t={t} lang={lang} 
            />} />

            {/* Home Settings */}
            <Route path="home" element={<AdminHome 
              settings={settings} updateSettings={updateSettings} t={t} 
            />} />

            {/* Accounts: users, admins & access, audit log, my account */}
            <Route path="users" element={<AdminAccounts t={t} />} />
            <Route path="access" element={<AdminAccess t={t} />} />
            <Route path="audit" element={<AdminAudit t={t} />} />
            <Route path="profile" element={<AdminProfile t={t} />} />

            {/* Content Management */}
            {/* Header: the thin strip above the navbar, which can be hidden */}
            <Route path="header" element={<AdminHeader t={t} />} />
            {/* Offline notice and its sound. Super-admin only, like the header above. */}
            <Route path="offline" element={<AdminOfflineNotice t={t} />} />
            {/* Hero banner lives on the Home page - see AdminHome */}
            {/* Live Puja: the YouTube channel and the fallback video */}
            <Route path="live-puja" element={<AdminLivePuja
              settings={settings} updateSettings={updateSettings} t={t}
            />} />
            <Route path="quote" element={<AdminQuote 
              settings={settings} updateSettings={updateSettings} t={t} 
            />} />
            <Route path="timings" element={<AdminTimings 
              settings={settings} updateSettings={updateSettings} t={t} 
            />} />
            <Route path="about" element={<AdminAbout 
              settings={settings} updateSettings={updateSettings} t={t} 
            />} />
            
            {/* History */}
            <Route path="history" element={<AdminHistory 
              history={history} 
              setHistory={setHistory} 
              t={t} 
              settings={settings} 
              updateSettings={updateSettings}
            />} />
            
            <Route path="team" element={<AdminTeam 
              team={team} setTeam={setTeam} t={t} 
            />} />
            <Route path="logo" element={<AdminLogo 
              settings={settings} updateSettings={updateSettings} t={t} 
            />} />

            {/* Footer Settings */}
            <Route path="footer" element={<AdminFooter 
              settings={settings} updateSettings={updateSettings} t={t} 
            />} />

            {/* Events & Gallery */}
            <Route path="events" element={<AdminEvents 
              events={events} setEvents={setEvents} t={t} 
              settings={settings} updateSettings={updateSettings}
            />} />
            <Route path="events/aarti" element={<AdminDailyAarti 
              settings={settings} updateSettings={updateSettings} t={t} 
            />} />
            <Route path="gallery" element={<AdminGallery 
              gallery={gallery} setGallery={setGallery} 
              galleryVideos={galleryVideos} setGalleryVideos={setGalleryVideos} 
              t={t} 
            />} />

            {/* Donations & Bookings */}
            <Route path="donations" element={<AdminDonations
              donations={donations} setDonations={setDonations}
              settings={settings} updateSettings={updateSettings}
              onSaved={setSettings} t={t} lang={lang}
            />} />
            <Route path="account" element={<AdminAccount />} />
            <Route path="bookings" element={<AdminBookings 
              bookings={bookings} setBookings={setBookings} t={t}
            />} />
            {/* The wording of the booking page itself (heading, labels, buttons, messages). */}
                <Route path="booking-content" element={<AdminBookingContent t={t} />} />

            {/* Notice & Blogs */}
            <Route path="notice" element={<AdminNotice 
              settings={settings} updateSettings={updateSettings} t={t} 
            />} />
            <Route path="blogs" element={<AdminBlogs 
              settings={settings} updateSettings={updateSettings} t={t} 
            />} />

            {/* Contact Messages */}
            <Route path="contact" element={<AdminContact t={t} />} />

            {/* Subscribers and the mail sent to them (events, blog posts, festival wishes) */}
            <Route path="newsletter" element={<AdminNewsletter />} />

            {/* Visitor reviews (approve / hide / delete) */}
            <Route path="reviews" element={<AdminReviews t={t} />} />

            {/* Visitor Analytics */}
            <Route path="visitors" element={<AdminVisitor t={t} />} />

            {/* Backup & Restore */}
            <Route path="backup" element={<AdminBackup t={t} />} />

            {/* Cloud Storage */}
            <Route path="cloud" element={<CloudPhotoPage />} />

            {/* Notifications & Settings */}
            <Route path="notifications" element={<AdminNotifications />} />
              {/* Bell sound for the notification bell (area: system, see permissions.js) */}
              <Route path="bell" element={<AdminBell t={t} />} />
            {/* The old "Admin Settings" address now opens My account. */}
            <Route path="settings" element={<AdminProfile t={t} />} />

            {/* Social Links - NEW */}
            <Route path="social" element={<AdminSocial 
              settings={settings} 
              updateSettings={updateSettings} 
              t={t} 
            />} />

            {/* Facebook Video Embeds */}
            <Route path="facebook-video" element={<AdminFacebookVideos 
              settings={settings} 
              updateSettings={updateSettings} 
              t={t}
            />} />
          </Routes>
          )}
        </div>
      </div>

      <AdminCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

        {/* Hide scrollbar styles */}
        <style>{`
        /* Hide scrollbar for main content */
        .main-content-scroll::-webkit-scrollbar,
        .content-scroll::-webkit-scrollbar {
          width: 0;
          display: none;
        }
        .main-content-scroll,
        .content-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Clip the admin shell so the page itself never scrolls (the main column
           scrolls instead). MUST be clip, not hidden: overflow:hidden creates
           a scroll container, which becomes the nearest scrollport for
           position:sticky and silently kills it. overflow:clip clips the same
           way without creating a scrollport. */
        .admin-page {
          overflow: clip;
        }

        /* Keep the admin column out of horizontal scrolling entirely.
           overflow-y:auto on its own computes overflow-x to auto, turning the
           column into a two-axis scroll container; wide media sections then make
           it scroll sideways and drag the sticky header (and the menu button)
           off screen. overflow-x:clip stops that without creating a scrollport.
           Wide tables keep scrolling because they carry their own
           overflow-x-auto wrapper. */
        .content-scroll {
          overflow-x: clip;
        }

        /* Smooth scrolling */
        .main-content-scroll {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default AdminPage;