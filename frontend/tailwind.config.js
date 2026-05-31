/** Brand palette pulled from the original index.html so the React port
 *  matches the existing site pixel-for-pixel. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream:       '#faf7f2',
        blush:       '#f5ede6',
        rose:        '#d4a09a',
        gold:        '#b8935a',
        'gold-light':'#e8d5b7',
        sage:        '#8fa88a',
        charcoal:    '#2c2420',
        brown:       '#5c3d2e',
        muted:       '#8a7a70',
        ink:         '#1a1008', // footer background
        // ---- Admin dashboard palette (slate neutrals + single blue accent) ----
        // Aliases redirect to native Tailwind slate/blue values so existing
        // pages using text-admin / bg-admin-soft pick up the spec colors.
        admin:       '#2563eb', // blue-600 — single brand accent
        'admin-deep':'#1d4ed8', // blue-700 — active/pressed
        'admin-soft':'#eff6ff', // blue-50 — active-nav tint
        'admin-ink': '#1e40af', // blue-800
        'dash-bg':   '#f7f8fa', // app background
        'dash-line': '#e5e7eb', // slate-200 — default border
        'dash-text': '#334155', // slate-700 — body text
        'dash-mute': '#64748b', // slate-500 — muted/labels
      },
      boxShadow: {
        card: '0 20px 60px rgba(80, 40, 20, 0.14)',
        soft: '0 6px 30px rgba(80, 40, 20, 0.08)',
        dash: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.05)',
        'dash-md': '0 4px 6px -1px rgba(16, 24, 40, 0.06), 0 2px 4px -2px rgba(16, 24, 40, 0.05)',
        'dash-lg': '0 10px 24px -6px rgba(16, 24, 40, 0.08), 0 4px 8px -4px rgba(16, 24, 40, 0.06)',
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body:    ['Inter', 'sans-serif'],
      },
      keyframes: {
        marqueeScroll: {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        heroFloat: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-12px)' },
        },
        badgeFloat: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        marquee:   'marqueeScroll 30s linear infinite',
        heroFloat: 'heroFloat 6s ease-in-out infinite',
        badgeFloat:'badgeFloat 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
