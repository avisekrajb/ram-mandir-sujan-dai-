/**
 * The booking page's own wording: the 36 strings that are the form, the buttons
 * and the messages, as opposed to the section titles and bullet points (which
 * are already editable in Admin → Bookings as `bookingContent`).
 *
 * One list, used by the admin editor to build its form and by the booking page
 * to fold saved values over the built-in wording. Keeping the two in step is the
 * whole point: a key added here appears in the editor without anyone having to
 * remember a second place, and a key removed here stops being offered.
 *
 * Every value is a { en, ne, hi, zh, ta } object. Empty means "not overridden",
 * so the page falls back to the wording it ships with.
 */

export const LANGS = [
  ['en', 'English'],
  ['ne', 'नेपाली'],
  ['hi', 'हिन्दी'],
  ['zh', '中文'],
  ['ta', 'தமிழ்'],
];

export const TEXT_GROUPS = [
  {
    id: 'heading',
    labelKey: 'a1_bpcHeading',
    fallback: 'Page heading',
    fields: [
      // a1_bpcPageTitle, not a1_bpcTitle: the page heading uses a1_bpcTitle, and one
      // key cannot be both "Booking Page Content" and "Page title" — the second
      // would overwrite the first.
      { key: 'title', labelKey: 'a1_bpcPageTitle', fallback: 'Page title' },
      { key: 'subtitle', labelKey: 'a1_bpcSubtitle', fallback: 'Subtitle under the title' },
      { key: 'templeDesc', labelKey: 'a1_bpcTempleDesc', fallback: 'Short description above the form' },
    ],
  },
  {
    id: 'fields',
    labelKey: 'a1_bpcFields',
    fallback: 'Form fields',
    fields: [
      { key: 'name', labelKey: 'a1_bpcName', fallback: 'Full name label' },
      { key: 'phone', labelKey: 'a1_bpcPhone', fallback: 'Phone label' },
      { key: 'date', labelKey: 'a1_bpcDate', fallback: 'Date label' },
      { key: 'pujaType', labelKey: 'a1_bpcPujaType', fallback: 'Puja type label' },
      { key: 'description', labelKey: 'a1_bpcDescription', fallback: 'Instructions label' },
      { key: 'descriptionPlaceholder', labelKey: 'a1_bpcPlaceholder', fallback: 'Instructions placeholder' },
      { key: 'optional', labelKey: 'a1_bpcOptional', fallback: '“Optional” marker' },
      { key: 'selectPuja', labelKey: 'a1_bpcSelectPuja', fallback: 'Puja type dropdown prompt' },
      { key: 'bookYourPuja', labelKey: 'a1_bpcBookYourPuja', fallback: 'Form heading' },
    ],
  },
  {
    id: 'buttons',
    labelKey: 'a1_bpcButtons',
    fallback: 'Buttons',
    fields: [
      { key: 'bookNow', labelKey: 'a1_bpcBookNow', fallback: 'Submit button' },
      { key: 'bookNowLabel', labelKey: 'a1_bpcBookNowLabel', fallback: 'Small “Book now” label' },
      { key: 'loginContinue', labelKey: 'a1_bpcLoginContinue', fallback: 'Login button' },
      { key: 'viewMyBookings', labelKey: 'a1_bpcViewMyBookings', fallback: 'Show my bookings' },
      { key: 'hideBookings', labelKey: 'a1_bpcHideBookings', fallback: 'Hide my bookings' },
      { key: 'downloadBooking', labelKey: 'a1_bpcDownloadBooking', fallback: 'Download booking' },
      { key: 'download', labelKey: 'a1_bpcDownload', fallback: 'Download' },
      { key: 'makeBooking', labelKey: 'a1_bpcMakeBooking', fallback: 'Make your first booking' },
    ],
  },
  {
    id: 'messages',
    labelKey: 'a1_bpcMessages',
    fallback: 'Messages',
    fields: [
      { key: 'booking', labelKey: 'a1_bpcBooking', fallback: '“Booking…” while submitting' },
      { key: 'secure', labelKey: 'a1_bpcSecure', fallback: 'Secure-booking note' },
      { key: 'unavailable', labelKey: 'a1_bpcUnavailable', fallback: '“Unavailable”' },
      { key: 'loginRequired', labelKey: 'a1_bpcLoginRequired', fallback: 'Login-required heading' },
      { key: 'loginMsg', labelKey: 'a1_bpcLoginMsg', fallback: 'Login-required message' },
      { key: 'thankYou', labelKey: 'a1_bpcThankYou', fallback: 'Thank-you message' },
      { key: 'unavailableMsg', labelKey: 'a1_bpcUnavailableMsg', fallback: 'Bookings-closed message' },
      { key: 'dateLimitMsg', labelKey: 'a1_bpcDateLimitMsg', fallback: 'Date-limit-reached message' },
      { key: 'pastDateMsg', labelKey: 'a1_bpcPastDateMsg', fallback: 'Past-date message' },
      { key: 'limitReached', labelKey: 'a1_bpcLimitReached', fallback: '“Limit reached”' },
      { key: 'available', labelKey: 'a1_bpcAvailable', fallback: '“Available”' },
      { key: 'noSlots', labelKey: 'a1_bpcNoSlots', fallback: 'No-slots message' },
      { key: 'slotsAvailable', labelKey: 'a1_bpcSlotsAvailable', fallback: '“slots available”' },
      { key: 'myBookings', labelKey: 'a1_bpcMyBookings', fallback: 'My-bookings heading' },
      { key: 'noBookings', labelKey: 'a1_bpcNoBookings', fallback: 'No-bookings message' },
      { key: 'bookingDetails', labelKey: 'a1_bpcBookingDetails', fallback: 'Booking-details heading' },
    ],
  },
];

/** group id -> [field key], used to flatten what the server sends. */
export const GROUP_OF_KEY = TEXT_GROUPS.reduce((acc, group) => {
  acc[group.id] = group.fields.map((f) => f.key);
  return acc;
}, {});

export const ALL_TEXT_KEYS = TEXT_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

/**
 * Fold saved wording over the page's built-in labels.
 *
 * A saved value wins only for the reader's own language, and English is the
 * fallback before the built-in wording is, so a field left blank in Nepali does
 * not suddenly show an empty label.
 *
 * @param {object} saved   the `bookingPage` group from the settings document
 * @param {string} lang    active language code
 * @param {object} builtin the page's own labels for that language
 */
export const pickBookingText = (saved, lang, builtin) => {
  const out = { ...builtin };
  if (!saved) return out;
  TEXT_GROUPS.forEach((group) => {
    const bucket = saved[group.id];
    if (!bucket) return;
    group.fields.forEach(({ key }) => {
      const value = bucket[key];
      if (!value) return;
      // Trimmed before the test: a value of " " is not a label, it is a blank
      // field someone typed into. Other admin pages post the whole settings
      // document back, so this cannot rely on the editor having pruned it.
      const picked = (value[lang] || value.en || '').trim();
      if (picked) out[key] = picked;
    });
  });
  return out;
};

export default TEXT_GROUPS;