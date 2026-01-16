/**
 * 个人信息页面JavaScript功能
 * 负责页面初始化、数据加载、表单提交和头像上传等功能
 */
$(document).ready(function() {
    // 页面初始化
    initProfilePage();
    
    // 绑定事件监听器
    bindEventListeners();
});

/**
 * 初始化个人信息页面
 */
function initProfilePage() {
    console.log('初始化个人信息页面...');
    
    // 显示加载状态
    showLoadingState();
    
    // 加载用户数据
    loadUserProfile();
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 保存个人信息表单提交
    $('#profile-form').on('submit', function(e) {
        e.preventDefault();
        updateProfile();
    });
    

    
    // 头像上传按钮点击
    $('#avatar-upload-btn').on('click', function() {
        $('#avatar-file').click();
    });
    
    // 头像文件选择变化
    $('#avatar-file').on('change', function(e) {
        if (e.target.files.length > 0) {
            uploadAvatar(e.target.files[0]);
        }
    });
    
    // 升级VIP按钮点击
    $('.upgrade-vip-btn').on('click', function() {
        upgradeVIP();
    });
}

/**
 * 加载用户个人信息
 */
function loadUserProfile() {
    $.ajax({
        url: '/user/profile/data',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                // 绑定数据到页面
                bindProfileData(response.data);
                hideLoadingState();
            } else {
                showError(response.message || '加载个人信息失败');
                hideLoadingState();
            }
        },
        error: function(xhr, status, error) {
            console.error('加载个人信息失败:', error);
            showError('网络错误，请稍后重试');
            hideLoadingState();
        }
    });
}

/**
 * 绑定用户数据到页面表单
 * @param {Object} userData - 用户数据对象
 */
function bindProfileData(userData) {
    console.log('绑定用户数据:', userData);
    
    // 基本信息表单
    $('#account').val(userData.account || '');
    $('#nickname').val(userData.nickname || '');
    $('#note').val(userData.note || '');
    
    // 头像
    if (userData.avatar) {
        $('#avatar-img').attr('src', '/' + userData.avatar);
    }
    
    // 账户信息
    $('#createtime').text(userData.createtime || '未知');
    $('#lastertime').text(userData.lastertime || '未知');
    $('#realname').val(userData.realname || '');
    $('#phone').val(userData.phone || '');
    
    // 账户状态
    const statusText = userData.status === 0 ? '正常' : '停用';
    const statusClass = userData.status === 0 ? 'text-green-600' : 'text-red-600';
    $('#status').text(statusText).removeClass('text-green-600 text-red-600').addClass(statusClass);
    
    // 会员信息
    const vipText = userData.vip === 0 ? '普通会员' : 'VIP会员';
    const vipClass = userData.vip === 0 ? 'text-gray-600' : 'text-yellow-600';
    $('.vip-level').text(vipText).removeClass('text-gray-600 text-yellow-600').addClass(vipClass);
    
    // VIP到期时间
    if (userData.vip_stoptime) {
        // 仅保留日期部分（YYYY-MM-DD）
        const stopDate = userData.vip_stoptime.split(' ')[0];
        $('.vip-expiry').text('到期时间：' + stopDate).show();
    } else {
        $('.vip-expiry').hide();
    }

    // 根据 vip 状态显示/隐藏升级按钮
    if (userData.vip === 0) {
        $('.upgrade-vip-btn').show();
    } else {
        $('.upgrade-vip-btn').hide();
    }
    
    // 用户名显示
    $('.user-name').text(userData.nickname || userData.account);
    
    // 保存原始数据用于重置
    $('#profile-form').data('originalData', userData);
}

/**
 * 更新个人信息
 */
function updateProfile() {
    const formData = new FormData($('#profile-form')[0]);
    
    // 显示加载状态
    $('.save-btn').prop('disabled', true).text('保存中...');
    
    $.ajax({
        url: '/user/profile/update',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            if (response.success) {
                showSuccess(response.message || '个人信息更新成功');
                
                // 重新加载数据以更新显示
                loadUserProfile();
                
                // 更新session中的昵称显示
                const nickname = $('#nickname').val();
                if (nickname) {
                    $('.user-name').text(nickname);
                }
            } else {
                showError(response.message || '更新失败');
            }
        },
        error: function(xhr, status, error) {
            console.error('更新个人信息失败:', error);
            showError('网络错误，请稍后重试');
        },
        complete: function() {
            $('.save-btn').prop('disabled', false).text('保存修改');
        }
    });
}

/**
 * 上传头像
 * @param {File} file - 头像文件
 */
function uploadAvatar(file) {
    if (!file) return;
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showError('只支持JPG、PNG、GIF格式的图片');
        return;
    }
    
    // 验证文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
        showError('头像文件大小不能超过2MB');
        return;
    }
    
    // 显示上传状态
    $('#avatar-upload-btn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> 上传中...');
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    $.ajax({
        url: '/user/profile/avatar',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            if (response.success) {
                showSuccess(response.message || '头像上传成功');
                
                // 更新头像显示
                if (response.avatar_url) {
                    $('#avatar-img').attr('src', '/' + response.avatar_url);
                }
                
                // 清除文件输入
                $('#avatar-file').val('');
            } else {
                showError(response.message || '头像上传失败');
            }
        },
        error: function(xhr, status, error) {
            console.error('头像上传失败:', error);
            showError('网络错误，请稍后重试');
        },
        complete: function() {
            $('#avatar-upload-btn').prop('disabled', false).html('<i class="fas fa-camera"></i>');
        }
    });
}



/**
 * 升级VIP
 */
function upgradeVIP() {
    // TODO: 实现VIP升级功能
    // window.location.href = '/support';    
    if (confirm('即将跳转到AIVideo官网，采购软件注册码并配置到系统中!')) {
        window.location.href = 'https://aivideo.site/support';
    }
}

/**
 * 显示加载状态
 */
function showLoadingState() {
    $('.content-area').addClass('opacity-50');
    $('.loading-overlay').show();
}

/**
 * 隐藏加载状态
 */
function hideLoadingState() {
    $('.content-area').removeClass('opacity-50');
    $('.loading-overlay').hide();
}

/**
 * 显示成功消息
 * @param {string} message - 成功消息
 */
function showSuccess(message) {
    showMessage(message, 'success');
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
function showError(message) {
    showMessage(message, 'error');
}

/**
 * 显示信息消息
 * @param {string} message - 信息消息
 */
function showInfo(message) {
    showMessage(message, 'info');
}

/**
 * 显示消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型（success/error/info）
 */
function showMessage(message, type) {
    // 使用简单的浏览器弹窗显示消息
    alert(message);
}

/**
 * 格式化日期时间
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDateTime(dateString) {
    if (!dateString) return '未知';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN');
    } catch (error) {
        return dateString;
    }
}