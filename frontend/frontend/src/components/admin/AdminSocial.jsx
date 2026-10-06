import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube, 
  Linkedin, 
  Mail, 
  MessageCircle, 
  Phone,
  Plus,
  Trash2,
  Save,
  Edit,
  Eye,
  EyeOff,
  GripVertical,
  X,
  Check,
  Globe,
  Link as LinkIcon
} from 'lucide-react';

const AdminSocial = ({ settings, updateSettings, t }) => {
  useLanguage(); // keep context subscription (re-render on language change)
  const { showToast } = useToast();
  const [socialLinks, setSocialLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [newLink, setNewLink] = useState({
    platform: 'facebook',
    url: '',
    label: '',
    enabled: true,
    icon: 'Facebook'
  });

  // Platform options
  const platformOptions = [
    { value: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
    { value: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
    { value: 'twitter', label: 'Twitter / X', icon: Twitter, color: '#000000' },
    { value: 'youtube', label: 'YouTube', icon: Youtube, color: '#FF0000' },
    { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
    { value: 'email', label: 'Email', icon: Mail, color: '#EA4335' },
    { value: 'phone', label: 'Phone', icon: Phone, color: '#34B7F1' },
  ];

  // Load social links from settings
  useEffect(() => {
    if (settings?.socialLinks) {
      setSocialLinks(settings.socialLinks);
    } else {
      // Default social links if none exist
      const defaults = [
        { platform: 'facebook', url: 'https://facebook.com/shreramchandratemple', label: 'Facebook', enabled: true, icon: 'Facebook' },
        { platform: 'instagram', url: 'https://instagram.com/shreramchandratemple', label: 'Instagram', enabled: true, icon: 'Instagram' },
        { platform: 'youtube', url: 'https://youtube.com/@shreramchandratemple', label: 'YouTube', enabled: true, icon: 'Youtube' },
      ];
      setSocialLinks(defaults);
    }
  }, [settings]);

  // Save social links
  const saveSocialLinks = async () => {
    setLoading(true);
    try {
      const updatedSettings = {
        ...settings,
        socialLinks: socialLinks
      };
      await updateSettings(updatedSettings);
      showToast((t.a3_social_saved || 'Social links saved successfully!'), 'success');
    } catch (error) {
      console.error('Error saving social links:', error);
      showToast(error.response?.data?.message || (t.a3_social_saveFailed || 'Error saving social links'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add new social link
  const addSocialLink = () => {
    if (!newLink.url.trim()) {
      showToast((t.a3_social_enterUrl || 'Please enter a URL'), 'warning');
      return;
    }

    const platform = platformOptions.find(p => p.value === newLink.platform);
    const newEntry = {
      ...newLink,
      label: newLink.label || platform?.label || newLink.platform,
      icon: platform?.label || 'Globe'
    };

    setSocialLinks([...socialLinks, newEntry]);
    setNewLink({
      platform: 'facebook',
      url: '',
      label: '',
      enabled: true,
      icon: 'Facebook'
    });
    showToast((t.a3_social_added || 'Social link added!'), 'success');
  };

  // Remove social link
  const removeSocialLink = (index) => {
    const updated = socialLinks.filter((_, i) => i !== index);
    setSocialLinks(updated);
    showToast((t.a3_social_removed || 'Social link removed'), 'info');
  };

  // Toggle enabled status
  const toggleEnabled = (index) => {
    const updated = [...socialLinks];
    updated[index].enabled = !updated[index].enabled;
    setSocialLinks(updated);
  };

  // Update social link
  const updateSocialLink = (index, field, value) => {
    const updated = [...socialLinks];
    updated[index][field] = value;
    setSocialLinks(updated);
  };

  // Move social link up/down
  const moveLink = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= socialLinks.length) return;
    const updated = [...socialLinks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSocialLinks(updated);
  };

  // Get platform color
  const getPlatformColor = (platform) => {
    const found = platformOptions.find(p => p.value === platform);
    return found?.color || '#6B6B72';
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    const found = platformOptions.find(p => p.value === platform);
    return found?.icon || Globe;
  };

  // Preview social link URL
  const getPreviewUrl = (url) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-ink">{t.a3_social_title || 'Social Media Links'}</h2>
            <p className="text-sm text-ink-soft mt-1">
              {t.a3_social_hint || 'Manage social media icons that appear on the floating social bar'}
            </p>
          </div>
          <button
            onClick={saveSocialLinks}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-vermilion text-white rounded-full font-medium hover:bg-vermilion/80 transition-all disabled:opacity-50 shadow-lg shadow-black/10"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {t.saveChanges || 'Save Changes'}
          </button>
        </div>

        {/* List of social links */}
        <div className="space-y-3">
          {socialLinks.map((link, index) => {
            const Icon = getPlatformIcon(link.platform);
            const color = getPlatformColor(link.platform);
            const isEditing = editingIndex === index;

            return (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  link.enabled 
                    ? 'border-gray-200 bg-white hover:border-gray-300' 
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                {/* Drag handle */}
                <div className="cursor-grab text-ink-soft/30 hover:text-ink-soft">
                  <GripVertical size={16} />
                </div>

                {/* Platform Icon */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon size={18} style={{ color }} />
                </div>

                {/* Link details */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <select
                          aria-label={(t.a3_social_platform || 'Platform')} value={link.platform}
                          onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line"
                        >
                          {platformOptions.map(p => (
                            <option key={p.value} value={p.value}>{p.value === 'email' ? (t.email || 'Email') : p.value === 'phone' ? (t.phone || 'Phone') : p.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          aria-label={(t.a3_social_label || 'Label')} value={link.label}
                          onChange={(e) => updateSocialLink(index, 'label', e.target.value)}
                          placeholder={(t.a3_social_label || 'Label')}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line"
                        />
                      </div>
                      <input
                        type="url"
                        aria-label={(t.a3_social_url || 'URL')} value={link.url}
                        onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink text-sm">
                          {link.label || link.platform}
                        </span>
                        {!link.enabled && (
                          <span className="text-xs text-mute bg-gray-100 px-2 py-0.5 rounded-full">
                            {t.a3_c_disabled || 'Disabled'}
                          </span>
                        )}
                      </div>
                      <a
                        href={getPreviewUrl(link.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-ink-soft hover:text-vermilion truncate block"
                      >
                        {link.url || (t.a3_social_noUrl || 'No URL set')}
                      </a>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                        title={(t.saveChanges || 'Save Changes')}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-ink-soft transition-colors"
                        title={(t.cancel || 'Cancel')}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Preview link */}
                      {link.url && link.enabled && (
                        <a
                          href={getPreviewUrl(link.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-brand-50 text-brand-500 transition-colors"
                          title={(t.a3_social_openLink || 'Open link')}
                        >
                          <LinkIcon size={16} />
                        </a>
                      )}

                      {/* Toggle enabled */}
                      <button
                        onClick={() => toggleEnabled(index)}
                        className={`p-2 rounded-lg transition-colors ${
                          link.enabled 
                            ? 'hover:bg-green-50 text-green-600' 
                            : 'hover:bg-gray-100 text-ink-soft'
                        }`}
                        title={link.enabled ? (t.a3_c_disable || 'Disable') : (t.a3_c_enable || 'Enable')}
                      >
                        {link.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => setEditingIndex(index)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-ink-soft transition-colors"
                        title={(t.edit || 'Edit')}
                      >
                        <Edit size={16} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => removeSocialLink(index)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        title={(t.delete || 'Delete')}
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Move up/down */}
                      <div className="flex flex-col">
                        <button
                          onClick={() => moveLink(index, -1)}
                          aria-label={(t.a3_c_moveUp || 'Move up')}
                          disabled={index === 0}
                          className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveLink(index, 1)}
                          aria-label={(t.a3_c_moveDown || 'Move down')}
                          disabled={index === socialLinks.length - 1}
                          className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add new social link */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-ink mb-3">{t.a3_social_addNew || 'Add New Social Link'}</h3>
          <div className="flex flex-wrap gap-3">
            <select
              aria-label={(t.a3_social_platform || 'Platform')} value={newLink.platform}
              onChange={(e) => setNewLink({ ...newLink, platform: e.target.value })}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line"
            >
              {platformOptions.map(p => (
                <option key={p.value} value={p.value}>{p.value === 'email' ? (t.email || 'Email') : p.value === 'phone' ? (t.phone || 'Phone') : p.label}</option>
              ))}
            </select>
            <input
              type="text"
              aria-label={(t.a3_social_labelOptional || 'Label (optional)')} value={newLink.label}
              onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
              placeholder={(t.a3_social_labelOptional || 'Label (optional)')}
              className="flex-1 min-w-[150px] px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line"
            />
            <input
              type="url"
              aria-label={(t.a3_social_url || 'URL')} value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              placeholder="https://..."
              className="flex-1 min-w-[200px] px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line"
            />
            <button
              onClick={addSocialLink}
              className="flex items-center gap-2 px-5 py-2 bg-maroon text-white rounded-xl font-medium hover:bg-maroon/80 transition-all"
            >
              <Plus size={16} />
              {t.a3_social_add || 'Add'}
            </button>
          </div>
        </div>

        {/* Preview section */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-ink mb-3">{t.a3_social_previewTitle || 'Preview - Floating Social Bar'}</h3>
          <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center">
            <div className="flex gap-3">
              {socialLinks.filter(l => l.enabled && l.url).map((link, index) => {
                const Icon = getPlatformIcon(link.platform);
                const color = getPlatformColor(link.platform);
                return (
                  <a
                    key={index}
                    href={getPreviewUrl(link.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md"
                    style={{ backgroundColor: color }}
                    title={link.label || link.platform}
                  >
                    <Icon size={20} className="text-white" />
                  </a>
                );
              })}
              {socialLinks.filter(l => l.enabled && l.url).length === 0 && (
                <span className="text-sm text-ink-soft">{t.a3_social_noActive || 'No active social links to preview'}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small Chevron components for the AdminSocial component
const ChevronUp = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const ChevronDown = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default AdminSocial;