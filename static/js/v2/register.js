// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 发送验证码按钮点击事件
    document.getElementById('sendCodeBtn').addEventListener('click', function() {
        var email = document.getElementById('email').value;
        if (!email) {
            alert('请输入邮箱地址');
            return;
        }
        
        // 验证邮箱格式
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('请输入有效的邮箱地址');
            return;
        }
        
        // 发送验证码
        fetch('/send_verification_code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('验证码已发送到您的邮箱');
                // 倒计时效果
                var countdown = 60;
                var btn = document.getElementById('sendCodeBtn');
                btn.disabled = true;
                btn.textContent = countdown + '秒后重新发送';
                
                var timer = setInterval(function() {
                    countdown--;
                    btn.textContent = countdown + '秒后重新发送';
                    if (countdown <= 0) {
                        clearInterval(timer);
                        btn.disabled = false;
                        btn.textContent = '发送验证码';
                    }
                }, 1000);
            } else {
                alert('发送失败: ' + data.message);
            }
        })
        .catch(error => {
            alert('发送验证码时出错，请稍后重试');
        });
    });


    // 表单提交事件
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!document.getElementById('agreeTerms').checked) {
            alert('请阅读并同意用户协议');
            return;
        }
        
        // 准备表单数据
        var formData = new FormData(this);
        var data = {};
        formData.forEach((value, key) => data[key] = value);
        
        // 提交表单数据
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 设置cookie，时长为31天
                const date = new Date();
                date.setTime(date.getTime() + (31 * 24 * 60 * 60 * 1000));
                const expires = "expires=" + date.toUTCString();
                // 从表单中获取email值
                const emailInput = document.getElementById('email');
                const email = emailInput ? emailInput.value : '';
                const cookieValue = encodeURIComponent(email);
                document.cookie = `user_account=${cookieValue};${expires};path=/`;
                alert('注册成功！跳转到用户中心。');
                window.location.href = '/user/dashboard';
            } else {
                alert('注册失败: ' + data.message);
            }
        })
        .catch(error => {
            alert('注册时出错，请稍后重试');
        });
    });
    
    // 取消按钮点击事件
    document.getElementById('cancelBtn').addEventListener('click', function() {
        window.location.href = '/';
    });
});