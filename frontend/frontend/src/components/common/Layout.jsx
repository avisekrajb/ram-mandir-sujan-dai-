import React from 'react';
import TopInfoBar from './TopInfoBar';
import HeaderMarquee from './HeaderMarquee';
import Header from './Header';
import Footer from './Footer';
import StayUpdated from './StayUpdated';

/**
 * Public page shell. The header is part of the page flow (tier 2 sticks to the top),
 * so the page needs no top offset.
 *
 * Page views are tracked once, app-wide, by VisitorProvider
 * (context/VisitorContext); this component used to post a second, duplicate
 * /visitors/track on every navigation.
 */
const Layout = ({ children, onLogout, setAuthModal }) => (
  <div className="flex min-h-screen flex-col bg-white">
    <TopInfoBar />
    <HeaderMarquee />
    <Header onLogout={onLogout} setAuthModal={setAuthModal} />
    <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
      {children}
    </main>
    {/* "Stay updated" on every public page (Admin -> Footer can hide it) */}
    <StayUpdated />
    <Footer />
  </div>
);

export default Layout;
