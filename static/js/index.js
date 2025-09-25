tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#165DFF',
        secondary: '#36CFC9',
        accent: '#722ED1',
        dark: '#1D2129',
        light: '#F2F3F5',
        'gray-100': '#F7F8FA',
        'gray-200': '#E5E6EB',
        'gray-300': '#C9CDD4',
        'gray-400': '#86909C',
        'gray-500': '#4E5969',
        'gray-600': '#272E3B',
        'gray-700': '#1D2129'
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'hover': '0 8px 30px rgba(0, 0, 0, 0.12)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  }
};