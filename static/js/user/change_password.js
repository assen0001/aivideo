$(document).ready(function() {
    // 密码可见性切换
    $('.fa-eye').on('click', function() {
        const input = $(this).closest('div').find('input[type="password"]');
        const type = input.attr('type') === 'password' ? 'text' : 'password';
        input.attr('type', type);
        $(this).toggleClass('fa-eye fa-eye-slash');
    });

    // 表单提交处理
    $('form').on('submit', function(event) {
        event.preventDefault(); // 阻止表单默认提交
        
        // 获取输入值
        const newPassword = $('input[name="new_password"]').val();
        const confirmPassword = $('input[name="confirm_password"]').val();
        
        // 前端验证
        if (!validateForm(newPassword, confirmPassword)) {
            return;
        }
        
        // 显示加载状态
        const submitBtn = $(this).find('button[type="submit"]');
        const originalText = submitBtn.text();
        submitBtn.prop('disabled', true).text('修改中...');
        
        // 发送AJAX请求
        $.ajax({
            url: '/user/change_password',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                new_password: newPassword,
                confirm_password: confirmPassword
            }),
            success: function(response) {
                if (response.success) {
                    // 显示成功消息
                    alert(response.message);
                    // 可以选择跳转页面或重置表单
                    // window.location.href = '/user/dashboard';
                } else {
                    // 显示错误消息
                    alert(response.message);
                }
            },
            error: function() {
                alert('网络错误，请稍后重试');
            },
            complete: function() {
                // 恢复按钮状态
                submitBtn.prop('disabled', false).text(originalText);
            }
        });
    });
    
    // 表单验证函数
    function validateForm(newPassword, confirmPassword) {
        // 检查是否为空
        if (!newPassword || !confirmPassword) {
            alert('新密码和确认新密码不能为空');
            return false;
        }
        
        // 检查两次输入是否相同
        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致');
            return false;
        }
        
        // 检查密码长度
        if (newPassword.length < 6) {
            alert('密码长度至少为6个字符');
            return false;
        }
        
        // 检查是否包含字母和数字
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        
        if (!hasLetter || !hasNumber) {
            alert('密码必须包含字母和数字');
            return false;
        }
        
        return true;
    }
    
    // 取消按钮事件
    $('.bg-gray-100').on('click', function() {
        // 可以选择返回上一页或重置表单
        // window.history.back();
        $('form')[0].reset();
    });
});