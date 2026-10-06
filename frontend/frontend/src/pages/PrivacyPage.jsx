import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/common/PageHeader';
import { formatDate as formatLocaleDate } from '../utils/formatDate';


const PrivacyPage = () => {
  const { t, lang } = useLanguage();

  return (
    <div className="min-h-screen bg-white pt-10 sm:pt-14 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto pb-12">
        <div className="mb-10">
          <PageHeader>{t.privacyTitle || 'Privacy Policy'}</PageHeader>
        </div>
        
        <div className="prose prose-slate max-w-none space-y-4">
          <p className="text-sm text-ink-soft">
            {t.privacyLastUpdated || 'Last updated:'} {new Date().getFullYear()}
          </p>
          
          <p className="text-ink-soft leading-relaxed">
            {t.privacyIntro || 'Shree Ramchandra Temple respects your privacy and is committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.'}
          </p>

          <h2 className="text-xl font-serif font-semibold text-maroon mt-6">
            {t.privacyDataTitle || 'Data We Collect'}
          </h2>
          <p className="text-ink-soft leading-relaxed">
            {t.privacyDataText || 'We may collect, use, store and transfer different kinds of personal data about you including: identity data (name, username), contact data (email address, phone number), technical data (IP address, browser type), and usage data (how you use our website).'}
          </p>

          <h2 className="text-xl font-serif font-semibold text-maroon mt-6">
            {t.privacyUseTitle || 'How We Use Your Data'}
          </h2>
          <p className="text-ink-soft leading-relaxed">
            {t.privacyUseText || 'We use your data to provide and improve our services, process donations, manage bookings, send notifications, and comply with legal obligations. We only collect data that is necessary for these purposes.'}
          </p>

          <h2 className="text-xl font-serif font-semibold text-maroon mt-6">
            {t.privacySecurityTitle || 'Data Security'}
          </h2>
          <p className="text-ink-soft leading-relaxed">
            {t.privacySecurityText || 'We have implemented appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way. We limit access to your personal data to those who have a genuine business need to know it.'}
          </p>

          <h2 className="text-xl font-serif font-semibold text-maroon mt-6">
            {t.privacyContactTitle || 'Contact Us'}
          </h2>
          <p className="text-ink-soft leading-relaxed">
            {t.privacyContactText || 'If you have any questions about this privacy policy or our privacy practices, please contact us at:'}
          </p>
          <p className="text-ink-soft">
            <strong>{t.a6_privacyEmailLabel || 'Email:'}</strong> info@ramchandratemple.org.np<br />
            <strong>{t.a6_privacyAddressLabel || 'Address:'}</strong> {t.a6_privacyAddressValue || 'Battisputali, Gaushala, Kathmandu, Nepal'}
          </p>

          <p className="text-xs text-mute mt-8 pt-4 border-t border-gray-200">
            {t.privacyUpdated || 'This policy was last updated on'} {formatLocaleDate(new Date(), lang)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;