/**
 * NativeWind はレイアウト（余白・並び・角丸・文字サイズ）専用。
 * 色は theme/tokens.ts の PlatformColor（semantic system color）を style で渡す（SPEC §11）。
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      borderRadius: {
        xp: '12px',
        card: '10px',
        big: '18px',
      },
    },
  },
  plugins: [],
};
