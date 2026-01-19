module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        foreground: "#111827",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },
        primary: {
          DEFAULT: "#2563EB",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F3F4F6",
          foreground: "#111827",
        },
        muted: {
          DEFAULT: "#F9FAFB",
          foreground: "#6B7280",
        },
        accent: {
          DEFAULT: "#F3F4F6",
          foreground: "#111827",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        border: "#E5E7EB",
        input: "#E5E7EB",
        ring: "#2563EB",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        // Tablet-specific breakpoints
        'tablet': '768px',
        'tablet-lg': '1024px',
        // Mobile-first approach
        'mobile': '320px',
        'mobile-lg': '425px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
        '8xl': '6rem',
        '9xl': '8rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    },
  },
  plugins: [],
}; 