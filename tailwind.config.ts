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
