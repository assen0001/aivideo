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

function setActiveNav(element) {
  // 移除所有导航项的active样式
  document.querySelectorAll('nav a').forEach(item => {
    item.classList.remove('text-indigo-700', 'bg-indigo-50', 'border-b-2', 'border-indigo-500');
    item.classList.add('text-gray-700', 'hover:bg-gray-100');
  });
  
  // 为当前点击的导航项添加active样式
  element.classList.add('text-indigo-700', 'bg-indigo-50', 'border-b-2', 'border-indigo-500');
  element.classList.remove('text-gray-700', 'hover:bg-gray-100');
}

// 页面加载时根据当前路径设置活动菜单项
document.addEventListener('DOMContentLoaded', function() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('nav a');
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath || 
        (currentPath === '/' && link.getAttribute('href') === '/') || 
        (currentPath.startsWith('/v2') && link.getAttribute('href') === '/v2') || 
        (currentPath.startsWith('/createvideo') && link.getAttribute('href') === '/createvideo') ||
        (currentPath.startsWith('/square') && link.getAttribute('href') === '/square') ||
        (currentPath.startsWith('/vip') && link.getAttribute('href') === '/vip') ||
        (currentPath.startsWith('/download') && link.getAttribute('href') === '/download') ||
        (currentPath.startsWith('/support') && link.getAttribute('href') === '/support') ||
        (currentPath.startsWith('/help') && link.getAttribute('href') === '/help')) {
      link.classList.add('text-indigo-700', 'bg-indigo-50', 'border-b-2', 'border-indigo-500');
      link.classList.remove('text-gray-700', 'hover:bg-gray-100');
    }
  });
});