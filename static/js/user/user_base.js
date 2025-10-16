// 用户后台基础JavaScript功能

/**
 * 用户后台初始化函数
 */
function initUserDashboard() {
    // 初始化侧边栏交互
    initSidebar();
    
    // 初始化表单验证
    initFormValidation();
    
    // 初始化通知系统
    initNotifications();
    
    // 初始化响应式布局
    initResponsiveLayout();
    
    console.log('用户后台初始化完成');
}

/**
 * 侧边栏交互功能
 */
function initSidebar() {
    // 移动端菜单切换
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.user-sidebar');
    
    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // 当前页面高亮
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.user-sidebar a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

/**
 * 表单验证功能
 */
function initFormValidation() {
    const forms = document.querySelectorAll('.user-form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
                showNotification('请检查表单填写是否正确', 'error');
            }
        });
    });
    
    // 实时验证
    const inputs = document.querySelectorAll('.user-form input, .user-form select, .user-form textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

/**
 * 验证单个表单字段
 */
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.getAttribute('name') || field.getAttribute('id');
    
    // 必填字段验证
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, `${getFieldLabel(field)}不能为空`);
        return false;
    }
    
    // 邮箱验证
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(field, '请输入有效的邮箱地址');
            return false;
        }
    }
    
    // 手机号验证
    if (field.type === 'tel' && value) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(value)) {
            showFieldError(field, '请输入有效的手机号码');
            return false;
        }
    }
    
    // 密码强度验证
    if (field.type === 'password' && value) {
        const strength = checkPasswordStrength(value);
        updatePasswordStrengthIndicator(strength);
    }
    
    clearFieldError(field);
    return true;
}

/**
 * 检查密码强度
 */
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
}

/**
 * 更新密码强度指示器
 */
function updatePasswordStrengthIndicator(strength) {
    const indicator = document.querySelector('.password-strength');
    const text = document.querySelector('.password-strength-text');
    
    if (indicator && text) {
        indicator.className = 'password-strength ' + strength;
        
        const strengthTexts = {
            'weak': '弱',
            'medium': '中等',
            'strong': '强'
        };
        
        text.textContent = strengthTexts[strength] || '';
    }
}

/**
 * 显示字段错误信息
 */
function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('border-red-500');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-500 text-sm mt-1';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

/**
 * 清除字段错误信息
 */
function clearFieldError(field) {
    field.classList.remove('border-red-500');
    
    const errorDiv = field.parentNode.querySelector('.text-red-500');
    if (errorDiv) {
        errorDiv.remove();
    }
}

/**
 * 获取字段标签
 */
function getFieldLabel(field) {
    const label = field.previousElementSibling;
    if (label && label.tagName === 'LABEL') {
        return label.textContent.replace(':', '').trim();
    }
    return '该字段';
}

/**
 * 验证整个表单
 */
function validateForm(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    return isValid;
}

/**
 * 通知系统
 */
function initNotifications() {
    // 创建通知容器
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
}

/**
 * 显示通知
 */
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `user-notification ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${icon} mr-3"></i>
            <span>${message}</span>
            <button class="ml-4 text-lg" onclick="this.parentNode.parentNode.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    const container = document.getElementById('notification-container');
    container.appendChild(notification);
    
    // 自动移除通知
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

/**
 * 响应式布局处理
 */
function initResponsiveLayout() {
    // 窗口大小变化时调整布局
    window.addEventListener('resize', function() {
        const sidebar = document.querySelector('.user-sidebar');
        if (window.innerWidth > 768 && sidebar) {
            sidebar.classList.remove('active');
        }
    });
}

/**
 * 文件上传处理
 */
function handleFileUpload(input, callback) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        // 检查文件大小
        if (file.size > maxSize) {
            showNotification('文件大小不能超过10MB', 'error');
            return;
        }
        
        // 检查文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            showNotification('不支持的文件类型', 'error');
            return;
        }
        
        if (callback) {
            callback(file);
        }
    }
}

/**
 * 显示加载状态
 */
function showLoading(button) {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `
        <div class="loading-spinner inline-block mr-2"></div>
        处理中...
    `;
    
    return function() {
        button.disabled = false;
        button.innerHTML = originalText;
    };
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * 格式化金额
 */
function formatCurrency(amount) {
    return '¥ ' + parseFloat(amount).toFixed(2);
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initUserDashboard();
});

// 导出函数供其他模块使用
window.UserDashboard = {
    initUserDashboard,
    showNotification,
    handleFileUpload,
    showLoading,
    formatDate,
    formatCurrency,
    debounce,
    throttle
};