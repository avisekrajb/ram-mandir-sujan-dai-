import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/common/Layout';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import RestrictedRoute from './RestrictedRoute';

// Pages
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import HistoryPage from '../pages/HistoryPage';
import EventsPage from '../pages/EventsPage';
import GalleryPage from '../pages/GalleryPage';
import BookingPage from '../pages/BookingPage';
import DonatePage from '../pages/DonatePage';
import ContactPage from '../pages/ContactPage';
import ProfilePage from '../pages/ProfilePage';
import MyBookingsPage from '../pages/MyBookingsPage';
import AdminPage from '../pages/AdminPage';

const AppRoutes = ({ onLogout, setAuthModal }) => {
  return (
    <Layout onLogout={onLogout} setAuthModal={setAuthModal}>
      <Routes>
        {/*
          A time-boxed suspension lets the person in but holds them to the home
          page, so the one allowed route sits outside the guard below.
        */}
        <Route path="/" element={<HomePage />} />
        <Route
          path="*"
          element={
            <RestrictedRoute>
              <Routes>
                <Route path="/about" element={<AboutPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/gallery/:tab" element={<GalleryPage />} />
                <Route path="/booking" element={<PrivateRoute><BookingPage /></PrivateRoute>} />
                <Route path="/donate" element={<PrivateRoute><DonatePage /></PrivateRoute>} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                <Route path="/mybookings" element={<PrivateRoute><MyBookingsPage /></PrivateRoute>} />
                <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </RestrictedRoute>
          }
        />
      </Routes>
    </Layout>
  );
};

export default AppRoutes;