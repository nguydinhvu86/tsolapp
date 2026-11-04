import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    corePlugins: {
        // ⛔ CRITICAL: DO NOT SET preflight = true ⛔
        // True will inject Tailwind's CSS reset, instantly breaking all Legacy UI 
        // components such as layouts and tables in globals.css. Leave this false!
        preflight: false,
    },
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
            },
            fontSize: {
                '2xs': ['0.6875rem', { lineHeight: '0.95rem', letterSpacing: '0.01em' }],
                'xs': ['0.75rem', { lineHeight: '1.05rem', letterSpacing: '0.005em' }],
                'sm': ['0.8125rem', { lineHeight: '1.2rem', letterSpacing: '-0.005em' }],
                'base': ['0.875rem', { lineHeight: '1.35rem', letterSpacing: '-0.01em' }],
                'md': ['0.9375rem', { lineHeight: '1.4rem', letterSpacing: '-0.01em' }],
                'lg': ['1.05rem', { lineHeight: '1.5rem', letterSpacing: '-0.015em' }],
                'xl': ['1.1875rem', { lineHeight: '1.6rem', letterSpacing: '-0.02em' }],
                '2xl': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
                '3xl': ['1.625rem', { lineHeight: '2rem', letterSpacing: '-0.03em' }],
                '4xl': ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.035em' }],
            },
            colors: {
                primary: {
                    DEFAULT: '#05A613',
                    hover: '#048c10',
                },
                surface: {
                    DEFAULT: '#ffffff',
                    hover: '#f8fafc',
                },
                indigo: colors.emerald,
                blue: colors.emerald,
            },
            boxShadow: {
                sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            }
        },
    },
    plugins: [],
};

export default config;
