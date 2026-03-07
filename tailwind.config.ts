import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#4f46e5',
                    hover: '#4338ca',
                    light: '#e0e7ff',
                    dark: '#3730a3',
                },
                surface: '#ffffff',
                background: '#f4f4f5',
                border: '#e4e4e7',
            },
            borderRadius: {
                DEFAULT: '10px',
                lg: '0.5rem',
                xl: '0.75rem',
            },
            boxShadow: {
                sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
                lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
            }
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    }
}
export default config
