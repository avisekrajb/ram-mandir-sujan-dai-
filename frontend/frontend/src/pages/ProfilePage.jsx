import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import OmLoader from '../components/common/OmLoader';
import PageHero from '../components/common/PageHero';
import { 
  Mail, Phone, MapPin, User, ClipboardList, Gift, LogOut, 
  ChevronRight, Camera, X, Check, AlertCircle
} from 'lucide-react';

const ProfilePage = () => {
  const { t } = useLanguage();
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  const [bookings, setBookings] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    profilePhoto: user?.profilePhoto || null,
  });
  const [errors, setErrors] = useState({});
  const fetched = useRef(false);

  // Check if user is a Google user (missing phone or address)
  const isGoogleUser = !user?.phone || !user?.address || user?.phone === '' || user?.address === '';

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const fetchData = async () => {
      try {
        const [bookingsRes, donationsRes] = await Promise.all([
          api.get('/bookings/my'),
          api.get('/donations/my')
        ]);
        setBookings(bookingsRes.data);
        setDonations(donationsRes.data);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/users/upload-profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const updatedUser = { ...user, profilePhoto: response.data.url };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfileData({ ...profileData, profilePhoto: response.data.url });
      showToast('Profile photo updated successfully', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const validateProfile = () => {
    const newErrors = {};
    if (!profileData.name || profileData.name.trim().length < 2) {
      newErrors.name = 'Name is required';
    }
    if (!profileData.phone || profileData.phone.trim().length < 10) {
      newErrors.phone = 'Valid phone number is required';
    }
    if (!profileData.address || profileData.address.trim().length < 3) {
      newErrors.address = 'Address is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setUploading(true);
    try {
      const response = await api.put('/users/profile', {
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
      });
      
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditing(false);
      setErrors({});
      showToast(t.savedSuccess || 'Profile updated successfully', 'success');
    } catch (error) {
      console.error('Save profile error:', error);
      showToast(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Remove your profile photo?')) return;
    setUploading(true);
    try {
      await api.delete('/users/profile-photo');
      const updatedUser = { ...user, profilePhoto: null };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfileData({ ...profileData, profilePhoto: null });
      showToast('Profile photo removed', 'success');
    } catch (error) {
      console.error('Remove photo error:', error);
      showToast('Failed to remove photo', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <OmLoader size="md" color="maroon" />
      </div>
    );
  }

  return (
    <main>
      <PageHero title={t.myProfile} sub={t.profileDetails} />

      <section className="max-w-2xl mx-auto px-6 py-12">
        {/* Google User Notice */}
        {isGoogleUser && !editing && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Complete Your Profile</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Please add your phone number and address to complete your profile.
              </p>
              <button
                onClick={() => setEditing(true)}
                className="mt-2 text-xs font-semibold text-vermilion hover:text-[#820606] transition-colors"
              >
                Add Details Now →
              </button>
            </div>
          </div>
        )}

        {/* Profile Card with Photo */}
        <div className="bg-white border border-line rounded-rt p-6 shadow-rt text-center">
          <div className="relative inline-block">
            <div 
              className={`w-24 h-24 rounded-full border-4 border-marigold overflow-hidden ${
                uploading ? 'opacity-50' : ''
              }`}
            >
              {profileData.profilePhoto ? (
                <img 
                  src={profileData.profilePhoto} 
                  alt={user?.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-maroon to-maroon-deep text-white text-3xl font-bold flex items-center justify-center">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-2 bg-vermilion text-white rounded-full shadow-lg hover:bg-[#820606] transition-all disabled:opacity-50"
              title="Change photo"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {profileData.profilePhoto && (
              <button
                onClick={handleRemovePhoto}
                disabled={uploading}
                className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all disabled:opacity-50 text-xs"
                title="Remove photo"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <h3 className="text-lg font-serif font-semibold mt-3">{user?.name}</h3>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-panel text-maroon">
            <User size={11} /> {t.profile}
          </span>
          {user?.isGoogleUser && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-600 ml-2">
              Google
            </span>
          )}
          {uploading && (
            <div className="mt-2 text-xs text-ink-soft">Uploading...</div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white border border-line rounded-rt p-4 text-center shadow-rt">
            <ClipboardList size={20} className="text-vermilion mx-auto mb-1" />
            <div className="text-xl font-extrabold font-serif">{bookings.length}</div>
            <div className="text-xs text-ink-soft">{t.totalBookings}</div>
          </div>
          <div className="bg-white border border-line rounded-rt p-4 text-center shadow-rt">
            <Gift size={20} className="text-leaf mx-auto mb-1" />
            <div className="text-xl font-extrabold font-serif">{donations.length}</div>
            <div className="text-xs text-ink-soft">{t.totalDonated}</div>
          </div>
        </div>

        {/* Details - Editable */}
        <div className="bg-white border border-line rounded-rt p-4 shadow-rt mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-serif font-semibold">{t.memberDetails}</h4>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-semibold text-vermilion hover:text-[#820606] transition-colors bg-transparent border-0"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setErrors({});
                    setProfileData({
                      name: user?.name || '',
                      phone: user?.phone || '',
                      address: user?.address || '',
                      profilePhoto: user?.profilePhoto || null,
                    });
                  }}
                  className="text-xs font-semibold text-ink-soft hover:text-ink transition-colors bg-transparent border-0"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={uploading}
                  className="text-xs font-semibold text-vermilion hover:text-[#820606] transition-colors bg-transparent border-0 disabled:opacity-50"
                >
                  <Check size={14} className="inline mr-1" /> Save
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 py-2 border-b border-line">
            <User size={16} className="text-vermilion flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs uppercase text-ink-soft block">{t.fullName}</span>
              {editing ? (
                <>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    aria-label={t.fullName}
                    className={`w-full text-sm font-medium border rounded-lg px-2 py-1 focus:outline-none ${
                      errors.name ? 'border-red-500 focus:border-red-500' : 'border-line focus:border-vermilion'
                    }`}
                  />
                  {errors.name && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.name}</span>
                  )}
                </>
              ) : (
                <strong className="text-sm">{user?.name}</strong>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 py-2 border-b border-line">
            <Mail size={16} className="text-vermilion flex-shrink-0" />
            <div>
              <span className="text-xs uppercase text-ink-soft block">{t.email}</span>
              <strong className="text-sm">{user?.email}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2 border-b border-line">
            <Phone size={16} className="text-vermilion flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs uppercase text-ink-soft block">{t.phone}</span>
              {editing ? (
                <>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    aria-label={t.phone}
                    className={`w-full text-sm font-medium border rounded-lg px-2 py-1 focus:outline-none ${
                      errors.phone ? 'border-red-500 focus:border-red-500' : 'border-line focus:border-vermilion'
                    }`}
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.phone}</span>
                  )}
                </>
              ) : (
                <strong className="text-sm">{user?.phone || '—'}</strong>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <MapPin size={16} className="text-vermilion flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs uppercase text-ink-soft block">{t.address}</span>
              {editing ? (
                <>
                  <input
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    aria-label={t.address}
                    className={`w-full text-sm font-medium border rounded-lg px-2 py-1 focus:outline-none ${
                      errors.address ? 'border-red-500 focus:border-red-500' : 'border-line focus:border-vermilion'
                    }`}
                    placeholder="Enter your address"
                  />
                  {errors.address && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.address}</span>
                  )}
                </>
              ) : (
                <strong className="text-sm">{user?.address || '—'}</strong>
              )}
            </div>
          </div>

          {/* Google User Info Note */}
          {isGoogleUser && !editing && (
            <div className="mt-3 pt-3 border-t border-dashed border-line">
              <p className="text-xs text-ink-soft flex items-center gap-1.5">
                <AlertCircle size={12} className="text-amber-500" />
                Please add your phone and address to complete your profile.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white border border-line rounded-rt p-3 shadow-rt mt-4">
          <h4 className="text-sm font-serif font-semibold px-1 mb-2">{t.quickActions}</h4>
          <button
            onClick={() => navigate('/mybookings')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-panel hover:bg-panel/70 transition-colors text-sm font-medium"
          >
            <span className="flex items-center gap-2"><ClipboardList size={15} className="text-vermilion" /> {t.myBookings}</span>
            <ChevronRight size={14} className="text-ink-soft" />
          </button>
          <button
            onClick={() => navigate('/donate')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-panel hover:bg-panel/70 transition-colors text-sm font-medium mt-1.5"
          >
            <span className="flex items-center gap-2"><Gift size={15} className="text-vermilion" /> {t.navDonate}</span>
            <ChevronRight size={14} className="text-ink-soft" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-sm font-medium mt-1.5"
          >
            <LogOut size={15} /> {t.logout}
          </button>
        </div>
      </section>
    </main>
  );
};

export default ProfilePage;