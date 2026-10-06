import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { useToast } from './context/ToastContext';
import { ScrollProvider } from './context/ScrollContext';
import { SocialProvider } from './context/SocialContext';
import { VisitorProvider } from './context/VisitorContext';
import { CropProvider } from './context/CropContext';
import { BackupProvider } from './context/BackupContext';
import { AdminLogsProvider } from './context/AdminLogsContext';
import { FullscreenProvider } from './context/FullscreenContext';
import { ChatbotProvider } from './context/ChatbotContext'; // <-- Import ChatbotProvider
import Layout from './components/common/Layout';
import PrivateRoute from './routes/PrivateRoute';
import AdminRoute from './routes/AdminRoute';
import SuperAdminRoute from './routes/SuperAdminRoute';
import NoticeModal from './components/modals/NoticeModal';
import MaintenanceModal from './components/modals/MaintenanceModal';
import ScrollToTop from './components/common/ScrollToTop';
import RouteSeo from './components/common/RouteSeo';
import ScrollToTopButton from './components/common/ScrollToTopButton';
import SocialFloating from './components/common/SocialFloating';
import Chatbot from './components/chatbot/Chatbot'; // <-- Import Chatbot component
import CookieConsent from './components/common/CookieConsent';

// Components
import AuthModal from './components/modals/AuthModal';
import ForgotPasswordModal from './components/modals/ForgotPasswordModal';
import OmLoader from './components/common/OmLoader';
import { playWelcomeSound } from './utils/templeSound';
import { loadAdminTranslations } from './utils/i18n';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const BlogsPage = lazy(() => import('./pages/BlogsPage'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const DonatePage = lazy(() => import('./pages/DonatePage'));
const DonateSuccess = lazy(() => import('./pages/DonateSuccess'));
const DonateFailure = lazy(() => import('./pages/DonateFailure'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'));
// The admin panels' dictionaries are not in the public bundle; they are fetched together with the panel, and the panel renders once both are here.
const AdminPage = lazy(() => Promise.all([import('./pages/AdminPage'), loadAdminTranslations()]).then(([module]) => module));
const SuperAdminPage = lazy(() => Promise.all([import('./pages/SuperAdminPage'), loadAdminTranslations()]).then(([module]) => module));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const RamPage = lazy(() => import('./pages/RamPage'));
const DynamicPage = lazy(() => import('./pages/DynamicPage'));
const UnicodeConverterPage = lazy(() => import('./pages/UnicodeConverterPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));

function App() {
  const { logout, loading } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const location = useLocation();
  const [authModal, setAuthModal] = useState(null);
  const [forgotModal, setForgotModal] = useState(false);

  // Components outside the Layout (e.g. the chatbot) open the login/sign-up
  // dialog with: window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' })).
  useEffect(() => {
    const open = (e) => setAuthModal(e.detail === 'signup' ? 'signup' : 'login');
    window.addEventListener('open-auth', open);
    return () => window.removeEventListener('open-auth', open);
  }, []);

  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/super/admin');

  // Temple bell + Om once the public site has loaded (never in the admin
  // panels). playWelcomeSound only ever plays once per page load.
  useEffect(() => {
    if (!loading && !isAdminRoute) playWelcomeSound();
  }, [loading, isAdminRoute]);

  const handleLogout = () => {
    // Header already shows its own logout confirmation modal,
    // so just log out here to avoid showing the prompt twice.
    logout();
    showToast(t.loggedOut, 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <OmLoader size="lg" color="maroon" />
      </div>
    );
  }

  return (
    <FullscreenProvider>
      <ScrollProvider>
        <SocialProvider>
          <VisitorProvider>
            <CropProvider>
              <BackupProvider>
                <AdminLogsProvider>
                  <ChatbotProvider> {/* <-- Add ChatbotProvider wrapper */}
                    {/* Scroll to top on route change */}
                    <ScrollToTop />

                    {/* Page title, description, canonical and social-share tags for the route */}
                    <RouteSeo />

                    {/* Maintenance Mode Modal - Blocks site when super admin enables it */}
                    <MaintenanceModal />

                    {/* Public-site extras. Not shown inside the admin panels: the
                        notice popup, chat bubble, cookie bar and social icons only
                        covered the admin's own controls. */}
                    {!isAdminRoute && (
                      <>
                        {/* Scroll to top button - shows when scrolling down */}
                        <ScrollToTopButton />

                        {/* Notice Modal - Shows on first visit */}
                        <NoticeModal />

                        {/* Floating Social Icons */}
                        <SocialFloating />

                        {/* Chatbot */}
                        <Chatbot />

                        {/* Cookie consent bar - Shows until the user chooses */}
                        <CookieConsent />
                      </>
                    )}

                    {!isAdminRoute ? (
                      <Layout onLogout={handleLogout} setAuthModal={setAuthModal}>
                        <Suspense fallback={
                          <div className="min-h-[60vh] flex items-center justify-center">
                            <OmLoader size="lg" color="maroon" />
                          </div>
                        }>
                          <Routes>
                            {/* ==============================================================
                                PUBLIC ROUTES - Accessible without login (No authentication required)
                                ============================================================== */}
                            
                            {/* Home */}
                            <Route path="/" element={<HomePage />} />
                            
                            {/* About & Team - IMPORTANT: More specific routes FIRST */}
                            <Route path="/about" element={<AboutPage />} />
                            
                            {/* Team listing page */}
                            <Route path="/templeteams" element={<TeamPage />} />
                            
                            {/* History */}
                            <Route path="/history" element={<HistoryPage />} />
                            
                            {/* Blogs */}
                            <Route path="/blogs" element={<BlogsPage />} />
                            <Route path="/blogs/:id" element={<BlogDetail />} />
                            
                            {/* Events */}
                            <Route path="/events" element={<EventsPage />} />
                            
                            {/* Gallery - PUBLIC (No login required) */}
                            <Route path="/gallery" element={<GalleryPage />} />
                            <Route path="/gallery/:tab" element={<GalleryPage />} />
                            
                            {/* Donate - PUBLIC (No login required) */}
                            <Route path="/donate" element={<DonatePage />} />
                            <Route path="/donate/success" element={<DonateSuccess />} />
                            <Route path="/donate/failure" element={<DonateFailure />} />
                            
                            {/* Contact */}
                            <Route path="/contact" element={<ContactPage />} />
                            
                            {/* Reset Password */}
                            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                            
                            {/* Privacy & Terms & Ram */}
                            <Route path="/privacy" element={<PrivacyPage />} />
                            <Route path="/terms" element={<TermsPage />} />
                            <Route path="/ram" element={<RamPage />} />
                            
                            {/* Dynamic Pages for custom footer links */}
                            <Route path="/page-*" element={<DynamicPage />} />

                            {/* Unicode Converter & Calendar */}
                            <Route path="/tools" element={<UnicodeConverterPage />} />
                            <Route path="/unicode-converter" element={<Navigate to="/tools#text" replace />} />
                            <Route path="/calendar" element={<CalendarPage />} />
                            
                            {/* ==============================================================
                                PROTECTED ROUTES - Login required
                                ============================================================== */}
                            
                            {/* Booking - Requires login */}
                            <Route path="/booking" element={<PrivateRoute><BookingPage /></PrivateRoute>} />
                            
                            {/* Profile - Requires login */}
                            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                            
                            {/* My Bookings - Requires login */}
                            <Route path="/mybookings" element={<PrivateRoute><MyBookingsPage /></PrivateRoute>} />
                            
                            {/* ==============================================================
                                ADMIN ROUTES - Admin only
                                ============================================================== */}
                            <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
                            
                            {/* ==============================================================
                                404 - Catch all - MUST be last
                                ============================================================== */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </Suspense>
                      </Layout>
                    ) : (
                      <Suspense fallback={
                        <div className="min-h-screen flex items-center justify-center bg-panel">
                          <OmLoader size="lg" color="maroon" />
                        </div>
                      }>
                        <Routes>
                          <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
                          <Route path="/super/admin/*" element={<SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>} />
                        </Routes>
                      </Suspense>
                    )}

                    {/* Auth Modal */}
                    <AuthModal 
                      open={authModal} 
                      onClose={() => setAuthModal(null)} 
                      onSuccess={() => setAuthModal(null)}
                      setForgotModal={setForgotModal}
                    />
                    
                    {/* Forgot Password Modal */}
                    <ForgotPasswordModal
                      open={forgotModal}
                      onClose={() => setForgotModal(false)}
                    />
                  </ChatbotProvider> {/* <-- Close ChatbotProvider */}
                </AdminLogsProvider>
              </BackupProvider>
            </CropProvider>
          </VisitorProvider>
        </SocialProvider>
      </ScrollProvider>
    </FullscreenProvider>
  );
}

export default App;