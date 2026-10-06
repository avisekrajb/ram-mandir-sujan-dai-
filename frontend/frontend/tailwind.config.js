/** @type {import('tailwindcss').Config} */

// Theme: white and warm neutrals with the logo's red (#A80808, measured from the
// logo image) used sparingly as the accent. The pale tints (50-200) are neutral
// greys, not pinks, so the red only appears where it is meant to.
// Semantic Tailwind colours (green = success, red-500 = error, amber =
// pending, blue = info) are intentionally left for status UI.
const logo = {
  50: '#F7F5F4',
  100: '#EFEBE9',
  200: '#E2DBD8',
  300: '#C9A9A9',
  400: '#C25B5B',
  500: '#B92B2B',
  600: '#A80808', // the logo's red
  700: '#820606', // hover / pressed
  800: '#660505',
  900: '#4A0404',
};

// Warm neutral scale (very slightly tinted toward the logo red). Replaces
// Tailwind's cool blue-grey `gray`/`slate` so the ~1,400 grey utilities used
// across the admin panel and site match the theme's ink/line/panel tokens.
const warmGray = {
  50: '#FBF8F8',  // = panel
  100: '#F5F0EF',
  200: '#ECE5E4', // = line
  300: '#DCD3D2',
  400: '#A89E9D',
  500: '#7A7171',
  600: '#5E5757', // = ink-soft
  700: '#463F3F',
  800: '#2E2828',
  900: '#1C1717', // = ink
  950: '#120E0E',
};

module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          brand: logo,
          gray: warmGray,
          slate: warmGray,
          // Legacy token names kept so existing classes keep working; all now
          // resolve to shades of the theme colour.
          vermilion: logo[600],      // primary actions / accents
          maroon: logo[600],         // headings: the theme colour itself
          'maroon-deep': logo[700],  // dark gradients, hover
          marigold: logo[200],       // soft accent on dark backgrounds
          leaf: logo[800],
          // Neutrals (warm, very slightly tinted toward the logo red).
          // These names were used across the app (~1,200 places) but never
          // defined, so they silently produced no CSS.
          ink: '#1C1717',
          'ink-soft': '#5E5757',
          mute: '#6F6868',
          line: '#ECE5E4',
          panel: '#FBF8F8',
        },
        borderRadius: {
          rt: '0.875rem',
        },
        boxShadow: {
          rt: '0 1px 2px rgba(28, 23, 23, 0.04), 0 10px 28px -14px rgba(28, 23, 23, 0.16)',
        },
        // Type scale: 12 / 14 / 16 / 18 / 20 / 24 / 32 / 36 / 48. text-3xl is 32px so it
        // matches the section-title size (see TYPE SCALE in index.css).
        fontSize: {
          '3xl': ['2rem', { lineHeight: '2.5rem' }],
        },
        fontFamily: {
          // Headings: Fraunces; body/UI: Inter. Mukta covers Devanagari
          // (Nepali/Hindi), which neither Latin face includes.
          serif: ['Fraunces', 'Mukta', 'Georgia', 'serif'],
          sans: ['Inter', 'Mukta', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        },
      },
    },
    plugins: [],
  }
