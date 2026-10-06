import React, { useState, useEffect, useMemo, useRef } from 'react';
import PageHeader from '../components/common/PageHeader';
import SubTitle from '../components/common/SubTitle';
import { motion } from "framer-motion";
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import OmLoader from '../components/common/OmLoader';
import DonationReceipt from '../components/common/DonationReceipt';
import { 
  QrCode,
  AlertCircle,
  Check,
  Building2,
  User,
  Loader2,
  Shield,
  Lock,
  Banknote,
  Send,
  Copy,
  Landmark,
  Info,
  MapPin,
  Tag,
  Camera,
  ShieldCheck,
  X
} from 'lucide-react';

// The sandbox logins for the payment gateways are only shown while testing, never on the live site.
const SHOW_SANDBOX_HINTS = process.env.REACT_APP_ENV !== 'production';

// Payment icons from public folder
const PaymentIcons = {
  esewa: '/esewa.jpeg',
  khalti: '/khalti.jpeg',
  ips: '/ips.jpeg',
  bank: 'https://cdn-icons-png.flaticon.com/512/1011/1011876.png',
};

// Cloudinary stores absolute URLs, but older records may hold a bare public-id
// path. Defined at module level so the account card can use it too.
const getFullImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dibusz4ag';
    return `https://res.cloudinary.com/${cloudName}/image/upload/${url}`;
  }
  return url;
};

const getLocalized = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || obj.ne || '';
};

// paragraphs is a free-length list; older records stored a fixed { p1..p4 } object
const readParagraphs = (raw, lang) => {
  if (Array.isArray(raw)) return raw.map((p) => getLocalized(p, lang)).filter(Boolean);
  if (raw && typeof raw === 'object') {
    return Object.keys(raw)
      .filter((k) => /^p\d+$/i.test(k))
      .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
      .map((k) => getLocalized(raw[k], lang))
      .filter(Boolean);
  }
  return [];
};

/* ===== "दान तथा सहयोग" published content, shown below the donation form ===== */
const DonatePageContent = ({ settings }) => {
  const { lang } = useLanguage();

  const sections = useMemo(
    () =>
      (Array.isArray(settings?.donateContent) ? settings.donateContent : [])
        .filter((s) => s && s.enabled !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [settings]
  );

  const title = getLocalized(settings?.donatePageTitle, lang);
  const intro = getLocalized(settings?.donateIntro, lang);

  if (!title && !intro && sections.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24">
      {title && (
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-serif text-4xl sm:text-5xl lg:text-6xl text-center text-[#A80808] leading-tight"
        >
          {title}
        </motion.h2>
      )}

      {title && <div className="mx-auto mt-5 flex items-center justify-center gap-2" aria-hidden="true">
            <span className="h-[3px] w-14 rounded-full bg-gradient-to-r from-transparent to-[#A80808]/50" />
            <span className="h-2 w-2 rotate-45 rounded-[2px] bg-[#A80808]" />
            <span className="h-[3px] w-14 rounded-full bg-gradient-to-l from-transparent to-[#A80808]/50" />
          </div>}

      {intro && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[#3A3A40] text-lg sm:text-xl leading-[1.9] text-justify max-w-3xl mx-auto mt-8"
        >
          {intro}
        </motion.p>
      )}

      <div className="mt-12 space-y-14">
        {sections.map((section, index) => {
          const sectionTitle = getLocalized(section.title, lang);
          const desc = getLocalized(section.desc, lang);
          const paragraphs = readParagraphs(section.paragraphs, lang);
          const listTitle = getLocalized(section.listTitle, lang);
          const points = (section.points || []).map((p) => getLocalized(p, lang)).filter(Boolean);

          return (
            <motion.div
              key={section.key || index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-baseline gap-4 mb-5">
                <span
                  className="text-base sm:text-lg tracking-widest text-[#A80808]/70 font-semibold shrink-0"
                  style={{ fontFamily: 'serif', minWidth: '2.5rem' }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                {sectionTitle && (
                  <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#A80808] leading-tight">
                    {sectionTitle}
                  </h3>
                )}
              </div>

              {desc && (
                <p className="text-[#3A3A40] leading-[1.9] text-lg text-justify ml-10 sm:ml-[3.5rem] mt-4">
                  {desc}
                </p>
              )}

              {paragraphs.length > 0 && (
                <div className="ml-10 sm:ml-[3.5rem] mt-4 space-y-4">
                  {paragraphs.map((text, i) => (
                    <p key={i} className="text-[#3A3A40] leading-[1.9] text-lg text-justify">
                      {text}
                    </p>
                  ))}
                </div>
              )}

              {listTitle && (
                <p className="font-semibold text-lg sm:text-xl text-[#A80808] ml-10 sm:ml-[3.5rem] mt-6 mb-3">
                  {listTitle}
                </p>
              )}

              {points.length > 0 && (
                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3 ml-10 sm:ml-[3.5rem] mt-4">
                  {points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="shrink-0 mt-2.5 w-2 h-2 rounded-full"
                        style={{ background: '#A80808' }}
                      />
                      <span className="text-[#3A3A40] leading-relaxed text-lg">{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

/* ===== Account number + QR block =====
 * Rendered in two situations:
 *   1. the super admin has switched off every online gateway, in which case this
 *      becomes the only way to donate (no amount form at all), and
 *   2. normally, underneath the donation form, as extra information.
 */
const CopyableValue = ({ value, className = '' }) => {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const copy = async (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(value));
      } else {
        const el = document.createElement('textarea');
        el.value = String(value);
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="flex items-center gap-2.5">
      <span className={`font-mono font-bold tracking-[0.12em] break-all ${className}`}>
        {value}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy account number"
        className={`shrink-0 w-11 h-11 sm:w-8 sm:h-8 rounded-lg grid place-items-center transition-all ${
          copied
            ? 'bg-[#A80808] text-white'
            : 'bg-[#A80808]/8 text-[#A80808] hover:bg-[#A80808]/15'
        }`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
};

/**
 * Compact account card for the narrow 30% column.
 * At that width a side-by-side label/value row squeezes the value, so labels sit
 * above their values instead and the account number stays the visual anchor.
 */
const MiniAccountCard = ({ account, t }) => {
  const typeLabel =
    {
      current: t.accTypeCurrent || 'Current Account',
      savings: t.accTypeSavings || 'Savings Account',
      fixed: t.accTypeFixed || 'Fixed Deposit',
      wallet: t.accTypeWallet || 'Wallet',
      other: t.accTypeOther || 'Account',
    }[account.accountType] || t.accTypeOther || 'Account';

  const instruction = account.instruction || account.note || '';
  const accountName = account.title || account.bankName || '—';

  const details = [
    { key: 'name', label: t.accountName || 'Account Name', value: account.title },
    { key: 'bank', label: t.bankName || 'Bank Name', value: account.bankName },
    { key: 'type', label: t.accountTypeLabel || 'Account Type', value: typeLabel },
    { key: 'holder', label: t.accountHolder || 'Account Holder', value: account.accountHolder },
    { key: 'branch', label: t.branchLabel || 'Branch', value: account.branch },
  ].filter((row) => row.value);

  return (
    <div className="relative rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/60 p-3.5 pl-4 overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full w-1"
        style={{ background: '#A80808' }}
      />

      {/* name + optional per-account QR */}
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-vermilion">
            {typeLabel}
          </p>
          <p className="font-serif text-sm text-gray-900 leading-tight break-words">
            {accountName}
          </p>
          {account.bankName && account.bankName !== accountName && (
            <p className="text-xs text-gray-500 break-words leading-tight mt-0.5">
              {account.bankName}
            </p>
          )}
        </div>
        {account.qrPhoto && (
          <img loading="lazy"
            src={getFullImageUrl(account.qrPhoto)}
            alt={account.bankName || 'Account QR'}
            className="w-12 h-12 rounded-lg object-contain bg-white border border-gray-200 p-1 flex-shrink-0"
          />
        )}
      </div>

      {/* account number — still the boldest thing in the card */}
      <div className="rounded-lg bg-white border-2 border-vermilion/15 px-3 py-2 mb-2.5">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">
          {t.accountNumber || 'Account Number'}
        </p>
        <CopyableValue
          value={account.accountNumber}
          className="text-base sm:text-base text-[#A80808]"
        />
      </div>

      {/* stacked label / value rows */}
      <dl className="space-y-1.5">
        {details.map((row) => (
          <div key={row.key} className="min-w-0">
            <dt className="text-xs text-gray-400 leading-tight">{row.label}</dt>
            <dd className="text-xs font-semibold text-gray-800 break-words leading-snug">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {instruction && (
        <div className="mt-2.5 rounded-lg bg-marigold/10 border border-marigold/25 px-2.5 py-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A6410]">
            {t.instruction || 'Instruction'}
          </p>
          <p className="text-xs text-gray-700 leading-relaxed mt-0.5 break-words">
            {instruction}
          </p>
        </div>
      )}
    </div>
  );
};

const DonationAccountDetails = ({ accounts, qrImage, qrEnabled, qrLoading, t, variant = 'full' }) => {
  const list = Array.isArray(accounts) ? accounts.filter((a) => a && a.active !== false) : [];
  const showQr = qrEnabled && (qrImage || qrLoading);

  if (list.length === 0 && !showQr) return null;

  // 'full'  — wide card, roomy type (used below the online payment form)
  // 'mini'  — compact card for the narrow 30% column beside the proof form
  const isFull = variant === 'full';
  const isMini = variant === 'mini';

  return (
    <div
      className={
        isMini
          ? 'bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden'
          : isFull
            ? 'bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden'
            : 'bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden'
      }
    >
      {/* header */}
      <div
        className={`relative text-white overflow-hidden ${
          isMini ? 'px-4 py-4' : 'px-6 sm:px-8 py-6 sm:py-7'
        }`}
        style={{ background: '#820606' }}
      >
        <div
          className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #E2DBD8 0%, transparent 70%)' }}
        />
        <div className={`relative flex items-center ${isMini ? 'gap-2.5' : 'gap-3 sm:gap-4'}`}>
          <div
            className={`rounded-2xl bg-white/15 backdrop-blur grid place-items-center flex-shrink-0 ${
              isMini ? 'w-9 h-9' : 'w-11 h-11 sm:w-12 sm:h-12'
            }`}
          >
            <Landmark size={isMini ? 17 : 22} />
          </div>
          <div className="min-w-0">
            <h2
              className={`font-serif leading-tight break-words ${
                isMini ? 'text-base' : isFull ? 'text-2xl sm:text-3xl' : 'text-lg'
              }`}
            >
              {isFull || isMini
                ? t.bankTransferTitle || 'Bank Transfer Details'
                : t.paymentMethods || 'Payment Methods'}
            </h2>
            {/* The subtitle is dropped in the mini variant: at 30% width it wraps
                to four or five lines and pushes the account number out of view. */}
            {!isMini && (
              <p className="text-white/80 text-sm mt-0.5">
                {isFull
                  ? t.bankTransferSubtitle ||
                    'Transfer directly to the temple account below, or scan the QR code.'
                  : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={isMini ? 'p-4' : 'p-6 sm:p-8'}>
        {list.length > 0 && (
          isMini ? (
            // Mini lives in a narrow column, so accounts always stack.
            <div className="space-y-3">
              {list.map((account, i) => (
                <MiniAccountCard key={account._id || account.accountNumber || i} account={account} t={t} />
              ))}
            </div>
          ) : (
          // auto-fit rather than a fixed 2-column grid: empty tracks collapse, so
          // a single account fills the whole width instead of sitting in a 50%
          // column, two accounts split evenly, and three or more get more columns.
          // `min(100%, 300px)` keeps it from overflowing narrow phones.
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            }}
          >
            {list.map((account, i) => {
              const typeLabel =
                {
                  current: t.accTypeCurrent || 'Current Account',
                  savings: t.accTypeSavings || 'Savings Account',
                  fixed: t.accTypeFixed || 'Fixed Deposit',
                  wallet: t.accTypeWallet || 'Wallet',
                  other: t.accTypeOther || 'Account',
                }[account.accountType] || t.accTypeOther || 'Account';

              // `note` is the legacy field; `instruction` wins when present.
              const instruction = account.instruction || account.note || '';
              const accountName = account.title || account.bankName || t.bankTransferTitle || 'Temple Account';

              // Detail rows shown in the label/value list under the account number.
              const details = [
                { key: 'name', label: t.accountName || 'Account Name', value: account.title, Icon: Tag },
                { key: 'bank', label: t.bankName || 'Bank Name', value: account.bankName, Icon: Building2 },
                { key: 'type', label: t.accountTypeLabel || 'Account Type', value: typeLabel, Icon: Landmark },
                { key: 'holder', label: t.accountHolder || 'Account Holder', value: account.accountHolder, Icon: User },
                { key: 'branch', label: t.branchLabel || 'Branch', value: account.branch, Icon: MapPin },
              ].filter((row) => row.value);

              return (
                <div
                  key={account._id || account.accountNumber || i}
                  className="group relative rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/60 p-5 transition-all hover:shadow-lg hover:border-[#A80808]/30"
                >
                  {/* corner accent */}
                  <div
                    className="absolute top-0 left-0 h-full w-1 rounded-l-2xl"
                    style={{ background: '#A80808' }}
                  />

                  {/* Head: name + account type */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#A80808]/8 text-[#A80808] grid place-items-center flex-shrink-0">
                      <Building2 size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#820606]">
                        {typeLabel}
                      </p>
                      <p className="font-serif text-lg text-gray-900 leading-tight break-words">
                        {accountName}
                      </p>
                      {account.bankName && account.bankName !== accountName && (
                        <p className="text-xs text-gray-500 break-words">{account.bankName}</p>
                      )}
                    </div>
                    {account.qrPhoto && (
                      <img loading="lazy"
                        src={getFullImageUrl(account.qrPhoto)}
                        alt={account.bankName || 'Account QR'}
                        className="w-16 h-16 rounded-lg object-contain bg-white border border-gray-200 p-1 flex-shrink-0"
                      />
                    )}
                  </div>

                  {/* Account number — bold, the thing donors copy */}
                  <div className="rounded-xl bg-white border-2 border-[#A80808]/15 px-4 py-3 mb-3 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                      {t.accountNumber || 'Account Number'}
                    </p>
                    <CopyableValue
                      value={account.accountNumber}
                      className="text-xl sm:text-2xl text-[#A80808]"
                    />
                  </div>

                  {/* Label / value details. A two-column grid rather than a fixed
                      label width, so longer translations (Tamil, Chinese) wrap
                      instead of squeezing the value. */}
                  <dl className="grid grid-cols-1 sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                    {details.map((row) => (
                      <React.Fragment key={row.key}>
                        <dt className="flex items-start gap-2 text-xs text-gray-400 min-w-0 sm:pt-0.5">
                          <row.Icon
                            size={14}
                            className="text-gray-400 flex-shrink-0 mt-0.5"
                          />
                          <span className="break-words">{row.label}</span>
                        </dt>
                        <dd className="font-semibold text-gray-800 min-w-0 break-words sm:pl-0">
                          {row.value}
                        </dd>
                      </React.Fragment>
                    ))}
                  </dl>

                  {/* Optional instruction */}
                  {instruction && (
                    <div className="mt-3 rounded-lg bg-marigold/10 border border-marigold/25 px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#8A6410]">
                        {t.instruction || 'Instruction'}
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed mt-0.5">
                        {instruction}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )
        )}

        {/* Main QR panel */}
        {showQr && (
          <div
            className={`${
              list.length > 0
                ? isMini
                  ? 'mt-4 pt-4 border-t border-dashed border-gray-200'
                  : 'mt-6 pt-6 border-t border-dashed border-gray-200'
                : ''
            } text-center`}
          >
            <p
              className={`font-bold uppercase tracking-widest text-gray-400 ${
                isMini ? 'text-xs mb-2' : 'text-xs mb-3'
              }`}
            >
              {t.scanQR || 'Scan to Pay'}
            </p>

            {qrLoading ? (
              <div
                className={`mx-auto rounded-2xl bg-gray-50 border border-gray-200 grid place-items-center ${
                  isMini ? 'w-32 h-32' : 'w-48 h-48'
                }`}
              >
                <OmLoader size="md" color="maroon" />
              </div>
            ) : (
              <div className="relative inline-block">
                <div
                  className={`rounded-2xl bg-white border-2 border-gray-100 shadow-sm ${
                    isMini ? 'p-2' : 'p-3 sm:p-4'
                  }`}
                >
                  <img loading="lazy"
                    src={qrImage}
                    alt={t.donationQR || 'Donation QR code'}
                    className={
                      isMini
                        ? 'w-28 h-28 object-contain'
                        : 'w-44 h-44 sm:w-52 sm:h-52 object-contain'
                    }
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <div
                  className={`absolute -inset-2 rounded-3xl -z-10`}
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(246,197,195,0.25), rgba(160, 20, 16,0.15))',
                  }}
                />
              </div>
            )}

            <p className={`text-gray-500 ${isMini ? 'text-xs mt-3' : 'text-xs mt-4'}`}>
              {t.scanQRHint || 'Scan with eSewa, Khalti, FonePay or any banking app'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   DONATION PROOF FORM
   For donations made outside the site (bank transfer, cash). The donor
   attaches a payment screenshot and/or a transaction number so the committee
   has something to verify against; at least one of the two is required.
   ============================================================ */
const DonationProofForm = ({ t, user, amount, setAmount, name, setName, email, setEmail, phone, setPhone, message, setMessage, onSubmitted, showHeading = true }) => {
  const { showToast } = useToast();

  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const tiers = [108, 501, 1100, 2100, 5100, 11000];

  // Free the object URL on change/unmount so the preview cannot leak.
  useEffect(() => {
    if (!screenshot) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(screenshot);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

  const hasProof = Boolean(screenshot) || Boolean(transactionId.trim());

  const pickFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(t?.uploadImageOnly || 'Please upload an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t?.imageTooLarge || 'Image must be less than 5MB', 'error');
      return;
    }
    setScreenshot(file);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer?.files?.[0]);
  };

  const clearAll = () => {
    setScreenshot(null);
    setTransactionId('');
    setDone(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      showToast(t?.loginRequiredDonate || 'Please login to submit your donation', 'warning');
      return;
    }

    // The core rule: a screenshot or a transaction number, at least one.
    if (!hasProof) {
      setError(
        t?.proofRequired ||
          'Please upload a payment screenshot or enter the transaction number (at least one is required).'
      );
      showToast(t?.proofRequiredShort || 'Screenshot or transaction number is required', 'error');
      return;
    }

    if (!amount || Number(amount) < 1) {
      showToast(t?.validAmount || 'Please enter a valid amount', 'error');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Upload the screenshot first so the donation record carries the URL.
      let screenshotUrl = '';
      if (screenshot) {
        const fd = new FormData();
        fd.append('image', screenshot);
        const up = await api.post('/donations/screenshot', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        screenshotUrl = up.data?.url || '';
        if (!screenshotUrl) throw new Error('Screenshot upload failed');
      }

      await api.post('/donations', {
        amount: Number(amount),
        paymentMethod: 'bank',
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone || '',
        message: message || '',
        transactionId: transactionId.trim(),
        screenshot: screenshotUrl,
      });

      setDone(true);
      showToast(t?.donationSubmitted || 'Donation submitted for approval', 'success');
      onSubmitted?.();
    } catch (err) {
      console.error('Donation proof submit error:', err);
      setError(err.response?.data?.message || err.message || t?.donationFailed || 'Submission failed');
      showToast(err.response?.data?.message || t?.donationFailed || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all text-sm bg-white';

  return (
    // autoComplete is off so the browser cannot overwrite donor-typed details
    // with a previously saved address.
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
    >
      {/* header */}
      <div
        className="relative px-6 sm:px-8 py-6 text-white overflow-hidden"
        style={{ background: '#820606' }}
      >
        <div
          className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #E2DBD8 0%, transparent 70%)' }}
        />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center flex-shrink-0">
            <Camera size={21} />
          </div>
          <div className="min-w-0">
            <h2 className={`font-serif ${showHeading ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>
              {t?.submitDonationProof || 'Submit Your Donation Proof'}
            </h2>
            <p className="text-white/80 text-sm mt-0.5">
              {t?.submitDonationProofHint ||
                'Transferred the money already? Send us the screenshot or transaction number and we will verify it.'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {done && (
          <div className="rounded-xl bg-[#A80808]/[0.06] border border-[#A80808]/20 px-4 py-3.5 flex items-start gap-3 mb-6">
            <Check size={18} className="text-[#A80808] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#A80808]">
                {t?.donationSubmitted || 'Donation submitted for approval'}
              </p>
              <p className="text-xs text-[#A80808]/75 mt-0.5">
                {t?.donationSubmittedHint ||
                  'Our committee will verify your payment and email you once it is accepted or rejected.'}
              </p>
            </div>
          </div>
        )}

        {/* Two columns on desktop: details on the left, the proof panel on the
            right. Stacks to a single column on phones. */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
          {/* ---------- Left: amount + contact ---------- */}
          <div className="lg:col-span-7 space-y-5">
            {/* Amount */}
            <div>
              <p className="text-xs font-medium text-ink-soft mb-3 uppercase tracking-wider">
                {t?.quickAmounts || 'Quick Amounts'}
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {tiers.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className="py-3 px-2 rounded-xl border text-sm font-semibold transition-all duration-200 hover:shadow-md"
                    style={{
                      background: Number(amount) === v ? '#A80808' : '#fff',
                      color: Number(amount) === v ? '#fff' : '#333',
                      borderColor: Number(amount) === v ? '#A80808' : '#e5e5e5',
                    }}
                  >
                    NPR {v.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-ink-soft mb-1.5 uppercase tracking-wider">
                  {t?.customAmount || 'Custom Amount'} (NPR)
                </label>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={inputClass}
                  placeholder={t?.enterAmount || 'Enter amount'}
                
      autoComplete="off"/>
              </div>
            </div>

            {/* Contact */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-ink-soft mb-1.5 uppercase tracking-wider">
                  {t?.yourName || 'Your Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder={t?.yourName || 'Your Name'}
                  required
                
      autoComplete="off"/>
              </div>
<div className="min-w-0">
                <label className="block text-xs font-medium text-ink-soft mb-1.5 uppercase tracking-wider">
                  {t?.yourEmail || 'Your Email'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="your@email.com"
                  required
                  autoComplete="off"/>
                {/* Says where this address is used, so nobody is surprised by
                    mail from the temple later. */}
                <p className="mt-1.5 text-xs text-mute leading-relaxed">
                  {t?.donateEmailHint ||
                    'The receipt and any update about this donation are sent to this address.'}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-ink-soft mb-1.5 uppercase tracking-wider">
                  {t?.phoneNumber || 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="98XXXXXXXX"
                
      autoComplete="off"/>
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-medium text-ink-soft mb-1.5 uppercase tracking-wider">
                  {t?.message || 'Message'} ({t?.optional || 'optional'})
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={inputClass}
                  placeholder={t?.messagePlaceholder || 'Your message...'}
                
      autoComplete="off"/>
              </div>
            </div>
          </div>

          {/* ---------- Right: the proof panel ---------- */}
          <div className="lg:col-span-5">
            {/* ---- Proof: screenshot OR transaction number ---- */}
            <div className="h-full rounded-2xl border-2 border-dashed border-gray-200 p-5 bg-gray-50/60 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={16} className="text-[#A80808] flex-shrink-0" />
                <p className="text-sm font-bold text-gray-800 min-w-0">
              {t?.paymentProof || 'Payment Proof'}
              <span className="text-red-500"> *</span>
            </p>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {t?.proofRequiredHint ||
              'Upload the payment screenshot or type the transaction number. At least one is required.'}
          </p>

          {/* Stacked, not side by side: this column is narrower on desktop and
              stacked also keeps the upload target large on phones. */}
          <div className="space-y-4">
            {/* Screenshot upload */}
            <div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed grid place-items-center text-center transition-all min-h-[190px] p-4 overflow-hidden ${
                  dragOver
                    ? 'border-vermilion bg-vermilion/[0.06]'
                    : preview
                      ? 'border-[#A80808]/20 bg-white'
                      : 'border-gray-300 bg-white hover:border-vermilion'
                } cursor-pointer`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    pickFile(e.target.files[0]);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                {preview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={preview} alt="Screenshot preview" className="max-h-40 object-contain" />
                    <span className="text-xs font-semibold text-[#A80808]">
                      {t?.screenshotAttached || 'Screenshot attached'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 grid place-items-center">
                      <Camera size={24} className="text-gray-300" />
                    </div>
                    <p className="text-xs font-bold text-gray-600">
                      {t?.uploadScreenshot || 'Upload Screenshot'}
                    </p>
                    <p className="text-xs">{t?.dropImageHere || 'Drop the image here'}</p>
                    <p className="text-xs text-gray-300">
                      {t?.fileHint || 'JPG / PNG / WEBP • max 5MB'}
                    </p>
                  </div>
                )}

                {preview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScreenshot(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white grid place-items-center hover:bg-red-600 transition-colors"
                    aria-label={t?.remove || 'Remove'}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Transaction number */}
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5 uppercase tracking-wider">
                {t?.transactionNumber || 'Transaction Number'}
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => {
                  setTransactionId(e.target.value);
                  if (e.target.value.trim()) setError('');
                }}
                className={`${inputClass} font-mono tracking-wide`}
                placeholder={t?.transactionNumberPlaceholder || 'e.g. 0C1234XYZ9876'}
              
      autoComplete="off"/>
              <p className="text-xs text-gray-400 mt-1.5">
                {t?.transactionNumberHint ||
                  'From your eSewa / Khalti / bank confirmation SMS or receipt.'}
              </p>

              {/* which of the two we have */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`w-4 h-4 rounded-full grid place-items-center flex-shrink-0 ${
                      screenshot ? 'bg-[#A80808] text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {screenshot ? <Check size={11} /> : <X size={11} />}
                  </span>
                  <span className={screenshot ? 'text-[#A80808] font-semibold' : 'text-gray-400'}>
                    {t?.screenshot || 'Screenshot'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`w-4 h-4 rounded-full grid place-items-center flex-shrink-0 ${
                      transactionId.trim()
                        ? 'bg-[#A80808] text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {transactionId.trim() ? <Check size={11} /> : <X size={11} />}
                  </span>
                  <span
                    className={
                      transactionId.trim() ? 'text-[#A80808] font-semibold' : 'text-gray-400'
                    }
                  >
                    {t?.transactionNumber || 'Transaction Number'}
                  </span>
                </div>
              </div>
            </div>
          </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-3 text-xs text-red-700">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              {!user && (
                <p className="text-xs text-ink-soft flex items-start gap-1.5 mt-4">
                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                  <span>{t?.loginRequiredDonate || 'Please login to record your donation'}</span>
                </p>
              )}

              {/* Actions sit inside the right column so the button lines up with
                  the proof panel on desktop. */}
              <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting || done}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50"
                  style={{ background: '#A80808' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#660505';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#A80808';
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t?.submitting || 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      {t?.submitProof || 'Submit Donation Proof'}
                    </>
                  )}
                </button>

                {(screenshot || transactionId) && !done && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="px-4 py-3.5 text-sm font-semibold text-ink-soft border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    {t?.clear || 'Clear'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

const DonatePage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [settings, setSettings] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('esewa');
  const [amount, setAmount] = useState(501);
  /*
   * The contact fields are left empty on purpose. They used to be filled from
   * the signed-in account, which quietly sent the account e-mail / phone to the
   * temple even when the donor was giving on behalf of somebody else. Whoever
   * makes the donation types their own details.
   */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [showRedirect, setShowRedirect] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentDonation, setCurrentDonation] = useState(null);
  const [donationConfig, setDonationConfig] = useState(null);
  const [qrPhoto, setQrPhoto] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);

  const tiers = [108, 501, 1100, 2100, 5100, 11000];

  const gatewayColors = {
    esewa: { base: '#60BB46', hover: '#4CAF50' },
    khalti: { base: '#5C2D91', hover: '#482270' },
    ips: { base: '#1a56db', hover: '#1245a8' },
    bank: { base: '#A80808', hover: '#660505' },
  };

  const gatewayLabels = {
    esewa: 'Pay with eSewa',
    khalti: 'Pay with Khalti',
    ips: 'Pay with IPS',
    bank: t.donateBtn || 'Donate Now',
  };

  const gatewayNames = {
    esewa: 'eSewa',
    khalti: 'Khalti',
    ips: 'IPS',
    bank: 'Bank Transfer',
  };

  const redirectViaForm = (url, data) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    Object.entries(data).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const savePendingPayment = (donationId, method) => {
    localStorage.setItem('pendingDonationId', donationId);
    localStorage.setItem('pendingDonationAmount', amount);
    localStorage.setItem('pendingMethod', method);
  };

  // Public donation config — which gateways the super admin has switched on,
  // the QR image and the account numbers. Read once per visit.
  useEffect(() => {
    const fetchDonationConfig = async () => {
      try {
        const response = await api.get('/donations/config');
        const config = response.data?.data || null;
        setDonationConfig(config);
        setQrPhoto(config?.qrPhoto || null);
      } catch (error) {
        console.error('Error fetching donation config:', error);
      } finally {
        setQrLoading(false);
      }
    };
    fetchDonationConfig();
  }, []);

  // Fetch settings only
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/admin/settings');
        setSettings(response.data);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // ---------- feature switches set by the super admin ----------
  // Until the config loads, everything reads as enabled so the page never flashes
  // an empty state on a slow connection.
  const features = {
    esewaEnabled: donationConfig?.features?.esewaEnabled !== false,
    khaltiEnabled: donationConfig?.features?.khaltiEnabled !== false,
    ipsEnabled: donationConfig?.features?.ipsEnabled !== false,
    qrEnabled: donationConfig?.features?.qrEnabled !== false,
    showBankDetails: donationConfig?.features?.showBankDetails !== false,
  };

  // The config endpoint deliberately returns `qrPhoto: null` when the super admin
  // has switched the QR off. That `null` must win over the raw settings value, so
  // the disabled case is resolved explicitly here rather than with a `??` chain
  // (which would skip the null and leak the image back in).
  const qrUrl = getFullImageUrl(
    donationConfig ? donationConfig.qrPhoto : qrPhoto || settings?.donate?.qrPhoto || null
  );
  const qrShown = features.qrEnabled === false ? false : !!qrUrl;

  const enabledGateways = [
    features.esewaEnabled ? 'esewa' : null,
    features.khaltiEnabled ? 'khalti' : null,
    features.ipsEnabled ? 'ips' : null,
  ].filter(Boolean);

  const donateAccounts = Array.isArray(donationConfig?.accounts) ? donationConfig.accounts : [];

  const visibleAccounts = features.showBankDetails
    ? donateAccounts.filter((a) => a && a.active !== false)
    : [];

  // No gateway left on -> the account numbers (and QR) are the only way to give.
  const accountOnlyMode = enabledGateways.length === 0;

  // Keep the selection on a gateway the super admin has not switched off.
  useEffect(() => {
    if (enabledGateways.length === 0) return;
    if (!enabledGateways.includes(selectedMethod)) {
      setSelectedMethod(enabledGateways[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    donationConfig?.features?.esewaEnabled,
    donationConfig?.features?.khaltiEnabled,
    donationConfig?.features?.ipsEnabled,
  ]);

  const handleEsewaPayment = async () => {
    if (!user) {
      showToast(t.loginRequiredDonate || 'Please login to donate', 'warning');
      navigate('/');
      return;
    }

    if (!amount || Number(amount) < 1) {
      showToast(t.validAmount || 'Please enter a valid amount', 'error');
      return;
    }

    setPaymentProcessing(true);
    setShowRedirect(true);

    try {
      const response = await api.post('/payment/esewa/initiate', {
        amount: Number(amount),
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        message: message || '',
      });

      if (!response.data.success) {
        showToast(response.data.message || 'Payment initiation failed', 'error');
        setPaymentProcessing(false);
        setShowRedirect(false);
        return;
      }

      const { data, url, donationId } = response.data;

      savePendingPayment(donationId, 'esewa');

      setTimeout(() => {
        redirectViaForm(url, data);
        setPaymentProcessing(false);
        setShowRedirect(false);
      }, 3000);

    } catch (error) {
      console.error('Payment initiation error:', error);
      showToast(error.response?.data?.message || 'Payment initiation failed', 'error');
      setPaymentProcessing(false);
      setShowRedirect(false);
    }
  };

  const handleKhaltiPayment = async () => {
    if (!user) {
      showToast(t.loginRequiredDonate || 'Please login to donate', 'warning');
      navigate('/');
      return;
    }

    if (!amount || Number(amount) < 1) {
      showToast(t.validAmount || 'Please enter a valid amount', 'error');
      return;
    }

    setPaymentProcessing(true);
    setShowRedirect(true);

    try {
      const response = await api.post('/payment/khalti/initiate', {
        amount: Number(amount),
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        message: message || '',
      });

      if (!response.data.success) {
        showToast(response.data.message || 'Payment initiation failed', 'error');
        setPaymentProcessing(false);
        setShowRedirect(false);
        return;
      }

      const { data, donationId } = response.data;

      savePendingPayment(donationId, 'khalti');

      setTimeout(() => {
        window.location.href = data.paymentUrl;
        setPaymentProcessing(false);
        setShowRedirect(false);
      }, 2500);

    } catch (error) {
      console.error('Khalti payment initiation error:', error);
      showToast(error.response?.data?.message || 'Payment initiation failed', 'error');
      setPaymentProcessing(false);
      setShowRedirect(false);
    }
  };

  const handleIpsPayment = async () => {
    if (!user) {
      showToast(t.loginRequiredDonate || 'Please login to donate', 'warning');
      navigate('/');
      return;
    }

    if (!amount || Number(amount) < 1) {
      showToast(t.validAmount || 'Please enter a valid amount', 'error');
      return;
    }

    setPaymentProcessing(true);
    setShowRedirect(true);

    try {
      const response = await api.post('/payment/ips/initiate', {
        amount: Number(amount),
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        message: message || '',
      });

      if (!response.data.success) {
        showToast(response.data.message || 'Payment initiation failed', 'error');
        setPaymentProcessing(false);
        setShowRedirect(false);
        return;
      }

      const { data, url, donationId } = response.data;

      savePendingPayment(donationId, 'ips');

      setTimeout(() => {
        redirectViaForm(url, data);
        setPaymentProcessing(false);
        setShowRedirect(false);
      }, 3000);

    } catch (error) {
      console.error('IPS payment initiation error:', error);
      showToast(error.response?.data?.message || 'Payment initiation failed', 'error');
      setPaymentProcessing(false);
      setShowRedirect(false);
    }
  };

  const handleDonate = async () => {
    if (!user) {
      showToast(t.loginRequiredDonate || 'Please login to donate', 'warning');
      navigate('/');
      return;
    }

    if (selectedMethod === 'esewa') {
      await handleEsewaPayment();
      return;
    }

    if (selectedMethod === 'khalti') {
      await handleKhaltiPayment();
      return;
    }

    if (selectedMethod === 'ips') {
      await handleIpsPayment();
      return;
    }

    if (!amount || Number(amount) < 1) {
      showToast(t.validAmount || 'Please enter a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/donations', { 
        amount: Number(amount),
        paymentMethod: selectedMethod,
        name: name || user?.name || 'Anonymous',
        email: email || user?.email || '',
        phone: phone || user?.phone || '',
        message: message || '',
      });
      
      setDone(true);
      
      // Set current donation for receipt
      setCurrentDonation(response.data);
      setShowReceipt(true);
      
      showToast(t.donateThanks || `NPR ${amount} — Thank you for your generous donation!`, 'success');
      
      // Send email with PDF receipt
      try {
        await api.post('/donations/send-email-with-pdf', {
          donationId: response.data._id,
          email: email || user?.email,
          name: name || user?.name,
          amount: Number(amount)
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
      
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (error) {
      console.error('Donation error:', error);
      showToast(error.response?.data?.message || 'Donation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const allPaymentMethods = [
    {
      id: 'esewa',
      name: 'eSewa',
      icon: <img src={PaymentIcons.esewa} alt="eSewa" className="w-8 h-8 object-contain" />,
      color: '#60BB46',
      bgColor: 'bg-[#A80808]/[0.06]',
      borderColor: 'border-[#A80808]/25',
      description: 'Pay with eSewa wallet',
      available: features.esewaEnabled
    },
    {
      id: 'khalti',
      name: 'Khalti',
      icon: <img src={PaymentIcons.khalti} alt="Khalti" className="w-8 h-8 object-contain" />,
      color: '#5C2D91',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      description: 'Pay with Khalti wallet',
      available: features.khaltiEnabled
    },
    {
      id: 'ips',
      name: 'IPS',
      icon: <img src={PaymentIcons.ips} alt="IPS" className="w-8 h-8 object-contain" />,
      color: '#1a56db',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      description: 'Pay with ConnectIPS via your bank',
      available: features.ipsEnabled
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: <Banknote size={24} className="text-gray-600" />,
      color: '#059669',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-300',
      description: 'Direct bank transfer',
      available: true
    }
  ];

  // Only the gateways the super admin has left switched on are offered.
  const paymentMethods = allPaymentMethods.filter((m) => m.available);

  // Guards the submit button against the single frame before the effect above
  // corrects a selection that the super admin has switched off.
  const activeMethod = enabledGateways.includes(selectedMethod)
    ? selectedMethod
    : enabledGateways[0] || selectedMethod;

  // Redirect overlay
  if (showRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(180deg, #FBF8F8 0%, #ffffff 50%, #FBF8F8 100%)" }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#A80808]/[0.06] flex items-center justify-center mx-auto mb-4">
            <OmLoader size="lg" color="maroon" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-ink mb-2">Redirecting to {gatewayNames[selectedMethod]}...</h2>
          <p className="text-ink-soft">Please wait while we redirect you to the payment gateway.</p>
          <div className="mt-4 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#A80808] rounded-full animate-[progress_3s_ease-in-out]" />
          </div>
          <p className="text-xs text-mute mt-3">You will be redirected in a moment...</p>
        </div>
        <style>{`
          @keyframes progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #ffffff 0, #FBF8F8 22rem, #FBF8F8 100%)" }}>
      {/* The old "Support the Temple" PageHero banner was removed on request.
          A compact heading block replaces it so the page still has a title
          without the full-height hero image. */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
        <PageHeader sub={t?.donateIntro || 'Your contribution helps preserve this sacred place'} subClassName="sm:!text-lg">
          {t?.donateTitle || 'Support the Temple'}
        </PageHeader>
      </div>

      {/* ================================================================
          ACCOUNT-NUMBER-ONLY MODE
          Every online gateway (eSewa / Khalti / IPS) has been switched off by
          the super admin. Bank Transfer Details sits in a compact 30% column on
          the left; the Donation Proof form takes the 70% on the right.
          ================================================================ */}
      {accountOnlyMode && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-24">
          <div className="grid lg:grid-cols-10 gap-6 lg:gap-7 items-start">
            {/* ---------- Left: 30% (slides in after the proof form) ---------- */}
            <motion.div
              initial={{ opacity: 0, x: -48 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-3 space-y-4 lg:sticky lg:top-28"
            >
              <DonationAccountDetails
                variant="mini"
                accounts={visibleAccounts}
                qrImage={qrUrl}
                qrEnabled={features.qrEnabled}
                qrLoading={qrLoading}
                t={t}
              />

              {visibleAccounts.length === 0 && !qrShown && (
                <div className="text-center px-5 py-10 rounded-2xl bg-white border border-dashed border-gray-200">
                  <Info size={26} className="mx-auto text-gray-300 mb-2.5" />
                  <p className="font-serif text-base text-gray-700">
                    {t.donationUnavailable || 'Online donation is being updated'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {t.donationUnavailableHint ||
                      'Please contact the temple office for donation details.'}
                  </p>
                </div>
              )}

              {visibleAccounts.length > 0 && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-amber-800">
                    {t.bankTransferHelpful ||
                      'After transferring, please submit your screenshot or transaction number so your donation can be verified.'}
                  </p>
                </div>
              )}
            </motion.div>

            {/* ---------- Right: 70% (slides in first) ---------- */}
            <motion.div
              initial={{ opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7"
            >
              <DonationProofForm
                t={t}
                user={user}
                amount={amount}
                setAmount={setAmount}
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                phone={phone}
                setPhone={setPhone}
                message={message}
                setMessage={setMessage}
                onSubmitted={() => {
                  setCurrentDonation(null);
                  setShowReceipt(false);
                }}
              />
            </motion.div>
          </div>
        </div>
      )}

      {/* ================================================================
          ONLINE PAYMENT MODE
          ================================================================ */}
      {!accountOnlyMode && (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="grid lg:grid-cols-5 gap-8 items-start">

          {/* Left Column - Donation Form */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-10"
          >
            {done && (
              <div className="bg-[#A80808]/[0.06] text-[#A80808] px-4 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 mb-6 border border-[#A80808]/20">
                <Check size={16} /> {t.donateThanks || 'Thank you for your generous donation!'}
              </div>
            )}

            <SubTitle className="mb-6">{t.donateTitle || 'Make a Donation'}</SubTitle>

            {/* eSewa Secure Badge */}
            {selectedMethod === 'esewa' && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#A80808]/[0.06] rounded-lg border border-[#A80808]/20">
                <Lock size={14} className="text-[#A80808]" />
                <span className="text-xs text-[#A80808] font-medium">Secured by eSewa</span>
                <span className="text-xs text-[#A80808] ml-auto">Test Mode</span>
              </div>
            )}

            <p className="text-xs font-medium text-mute mb-3 uppercase tracking-wider">
              {t.quickAmounts || 'Quick Amounts'}
            </p>
            
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {tiers.map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="py-3 px-2 rounded-lg border text-sm font-semibold transition-all duration-200 hover:shadow-md"
                  style={{
                    background: amount === v ? "#A80808" : "#fff",
                    color: amount === v ? "#fff" : "#333",
                    borderColor: amount === v ? "#A80808" : "#e5e5e5",
                  }}
                >
                  NPR {v.toLocaleString()}
                </button>
              ))}
            </div>

            <p className="text-xs text-mute text-center mb-4">{t.or || 'or'}</p>

            <div className="mb-6">
              <label className="block text-xs font-medium text-mute mb-1.5 uppercase tracking-wider">
                {t.customAmount || 'Custom Amount'} (NPR)
              </label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all"
                placeholder="Enter amount"
              
      autoComplete="off"/>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-mute mb-1.5 uppercase tracking-wider">
                  {t.yourName || 'Your Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all"
                  placeholder="Your Name"
                  required
                
      autoComplete="off"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-mute mb-1.5 uppercase tracking-wider">
                  {t.yourEmail || 'Your Email'} <span className="text-red-500">*</span>
                </label>
<input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all"
                  placeholder="your@email.com"
                  required
                  autoComplete="off"/>
                <p className="mt-1.5 text-xs text-mute leading-relaxed">
                  {t.donateEmailHint ||
                    'The receipt and any update about this donation are sent to this address.'}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-mute mb-1.5 uppercase tracking-wider">
                  {t.phoneNumber || 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all"
                  placeholder="98XXXXXXXX"
                
      autoComplete="off"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-mute mb-1.5 uppercase tracking-wider">
                  Message (Optional)
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all"
                  placeholder="Your message..."
                
      autoComplete="off"/>
              </div>
            </div>

            <button
              onClick={handleDonate}
              disabled={loading || done || paymentProcessing}
              className="w-full px-8 py-3.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: gatewayColors[activeMethod].base }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.background = gatewayColors[activeMethod].hover; 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.background = gatewayColors[activeMethod].base; 
              }}
            >
              {loading || paymentProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t.processing || 'Processing...'}
                </>
              ) : (
                <>
                  {activeMethod === 'esewa' && <img src={PaymentIcons.esewa} alt="eSewa" className="w-5 h-5 object-contain" />}
                  {activeMethod === 'khalti' && <img src={PaymentIcons.khalti} alt="Khalti" className="w-5 h-5 object-contain" />}
                  {activeMethod === 'ips' && <img src={PaymentIcons.ips} alt="IPS" className="w-5 h-5 object-contain" />}
                  {activeMethod === 'bank' && <Banknote size={16} />}
                  {gatewayLabels[activeMethod]}
                </>
              )}
            </button>
            
            {!user && (
              <p className="text-xs text-ink-soft mt-3 text-center">
                <AlertCircle size={12} className="inline mr-1" />
                {t.loginRequiredDonate || 'Please login to record your donation'}
              </p>
            )}

            {SHOW_SANDBOX_HINTS && selectedMethod === 'esewa' && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 text-center">
                  <Shield size={12} className="inline mr-1" />
                  Test eSewa: 9806800001 / Nepal@123 / MPIN: 1122
                </p>
                <p className="text-xs text-amber-600 text-center mt-1">
                  Use these credentials to test the payment (OTP: 123456)
                </p>
              </div>
            )}

            {SHOW_SANDBOX_HINTS && selectedMethod === 'khalti' && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 text-center">
                  <Shield size={12} className="inline mr-1" />
                  Test Khalti: 9800000005 / PIN: 1111 / OTP: 987654
                </p>
                <p className="text-xs text-purple-600 text-center mt-1">
                  If MPIN is locked, use another number (9800000000 – 9800000005)
                </p>
              </div>
            )}

            {SHOW_SANDBOX_HINTS && selectedMethod === 'ips' && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 text-center">
                  <Shield size={12} className="inline mr-1" />
                  IPS Test Mode – you will complete payment through the ConnectIPS UAT gateway
                </p>
                <p className="text-xs text-blue-600 text-center mt-1">
                  Payment is verified using your bank log-in + OTP
                </p>
              </div>
            )}
          </motion.div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Payment Methods */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <h3 className="font-serif text-lg mb-4" style={{ color: "#A80808" }}>
                {t.paymentMethods || 'Payment Methods'}
              </h3>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div 
                    key={method.id}
                    onClick={() => method.available && setSelectedMethod(method.id)}
                    className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedMethod === method.id 
                        ? `${method.bgColor} ${method.borderColor} border-2` 
                        : method.available ? 'border-gray-100 hover:border-gray-300' : 'border-gray-100 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-gray-100">
                      {method.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink">{method.name}</span>
                        {selectedMethod === method.id && (
                          <Check size={16} className="text-[#A80808]" />
                        )}
                        {!method.available && (
                          <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Soon</span>
                        )}
                      </div>
                      <p className="text-xs text-mute truncate">{method.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code - only when the super admin has left it switched on */}
            {features.qrEnabled !== false && (qrShown || qrLoading) && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 text-center">
              <h3 className="font-serif text-lg mb-4" style={{ color: "#A80808" }}>
                {t.scanQR || 'Scan to Pay'}
              </h3>
              <div className="mx-auto w-44 h-44 bg-gray-50 rounded-xl grid place-items-center border border-gray-200 overflow-hidden relative">
                {qrLoading ? (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <OmLoader size="md" color="maroon" />
                    <p className="text-xs text-gray-400 mt-2">Loading QR...</p>
                  </div>
                ) : qrUrl ? (
                  <img 
                    src={qrUrl} 
                    alt="QR Code" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('QR image failed to load:', qrUrl);
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      const fallback = document.createElement('div');
                      fallback.className = 'flex flex-col items-center justify-center w-full h-full';
                      fallback.innerHTML = `
                        <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h-2m2 0h2M4 12v1m4 0h4m-4 0v4m0-4h-2" />
                        </svg>
                        <p class="text-xs text-gray-400 mt-1">QR Code not available</p>
                        <button class="mt-2 text-xs text-[#A80808] hover:underline flex items-center gap-1" onclick="window.location.reload()">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Refresh
                        </button>
                      `;
                      parent.appendChild(fallback);
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <QrCode size={48} className="text-gray-300" />
                    <p className="text-xs text-gray-400 mt-2">No QR Code uploaded</p>
                    <p className="text-xs text-gray-300 mt-1">Please check back later</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-mute mt-3">eSewa / Khalti / IPS / FonePay</p>
            </div>
            )}
          </motion.div>
        </div>

        {/* Bank account numbers, shown under the form when the super admin
            has left them switched on. */}
        {visibleAccounts.length > 0 && (
          <div className="mt-8">
            <DonationAccountDetails
              accounts={visibleAccounts}
              qrImage={null}
              qrEnabled={false}
              qrLoading={false}
              t={t}
            />
          </div>
        )}

        {/* Manual / bank transfer donations, submitted with a screenshot or
            transaction number for the committee to verify. */}
        <div className="mt-8">
          <DonationProofForm
            t={t}
            user={user}
            amount={amount}
            setAmount={setAmount}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            message={message}
            setMessage={setMessage}
            onSubmitted={() => {
              setDone(false);
              setShowReceipt(false);
              setCurrentDonation(null);
            }}
          />
        </div>
      </div>
      )}

      {/* Donation Receipt Modal */}
      {showReceipt && currentDonation && (
        <DonationReceipt
          donation={currentDonation}
          onClose={() => {
            setShowReceipt(false);
            setCurrentDonation(null);
          }}
          settings={settings}
        />
      )}

      <DonatePageContent settings={settings} />
    </div>
  );
};

export default DonatePage;