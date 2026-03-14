import type { Config } from "tailwindcss";

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
            colors: {
                primary: {
                    DEFAULT: '#4f46e5',
                    hover: '#4338ca',
                },
                surface: {
                    DEFAULT: '#ffffff',
                    hover: '#f8fafc',
                },
            },
            boxShadow: {
                sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            },
            keyframes: {
                'priority-high-bg-blink': {
                    '0%, 100%': { backgroundColor: '#dcfce3' },
                    '50%': { backgroundColor: '#86efac' },
                },
                'priority-urgent-bg-blink': {
                    '0%, 100%': { backgroundColor: '#fca5a5' },
                    '33%': { backgroundColor: '#fef08a' },
                    '66%': { backgroundColor: '#86efac' },
                }
            },
            animation: {
                'priority-high-bg': 'priority-high-bg-blink 2s ease-in-out infinite',
                'priority-urgent-bg': 'priority-urgent-bg-blink 1.5s linear infinite',
            }
        },
    },
    plugins: [],
};

export default config;
