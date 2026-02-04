/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#192BC2', // Deep Blue
                    light: '#3c4ed6',
                    dark: '#101c85'
                },
                background: '#0f111a', // Very dark blue/gray for background
                surface: '#1e202e', // Card background
                text: {
                    primary: '#e2e8f0', // Soft white
                    secondary: '#94a3b8', // Gray
                    muted: '#64748b'
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
