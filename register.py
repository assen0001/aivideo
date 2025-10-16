from flask import Blueprint, request, jsonify, render_template
import random
import time
from sendmail import send_verification_code

# 创建注册相关的蓝图
register_bp = Blueprint('register', __name__)

# 简单的验证码存储（实际生产环境应使用Redis等更安全的方式）
verification_codes = {}

@register_bp.route('/register', methods=['GET'])
def register():
    """显示注册页面"""
    return render_template('v2/register.html')

@register_bp.route('/send_verification_code', methods=['POST'])
def handle_send_verification_code():
    """处理发送验证码到用户邮箱的请求"""
    try:
        email = request.form.get('email')
        if not email:
            return jsonify({'success': False, 'message': '邮箱地址不能为空'})
        
        # 生成6位随机验证码
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        # 存储验证码（实际生产环境应使用Redis等，并设置过期时间）
        verification_codes[email] = {'code': code, 'timestamp': time.time()}
        
        # 发送验证码邮件
        try:
            send_verification_code(email, code)
        except Exception as e:
            print(f'发送验证码邮件异常: {str(e)}')
        
        # 为了演示，打印验证码到控制台
        print(f'发送验证码到 {email}: {code}')
        
        return jsonify({'success': True, 'message': '验证码已发送'})
    except Exception as e:
        print(f'发送验证码失败: {str(e)}')
        return jsonify({'success': False, 'message': '发送验证码失败，请稍后重试'})

@register_bp.route('/register', methods=['POST'])
def process_register():
    """处理注册表单提交"""
    try:
        email = request.form.get('email')
        verification_code = request.form.get('verificationCode')
        agree_terms = request.form.get('agreeTerms')
        
        # 验证输入
        if not email or not verification_code:
            return jsonify({'success': False, 'message': '请填写所有必填字段'})
        
        if not agree_terms:
            return jsonify({'success': False, 'message': '请阅读并同意用户协议'})
        
        # 验证验证码
        if email not in verification_codes:
            return jsonify({'success': False, 'message': '验证码不存在或已过期'})
        
        code_info = verification_codes[email]
        # 检查验证码是否过期（5分钟）
        if time.time() - code_info['timestamp'] > 300:
            del verification_codes[email]
            return jsonify({'success': False, 'message': '验证码已过期，请重新获取'})
        
        if code_info['code'] != verification_code:
            return jsonify({'success': False, 'message': '验证码错误'})
        
        # TODO: 实际项目中，这里应该实现用户信息的保存逻辑
        # 例如：创建用户记录到数据库
        
        # 注册成功后删除验证码
        del verification_codes[email]
        
        return jsonify({'success': True, 'message': '注册成功'})
    except Exception as e:
        print(f'注册失败: {str(e)}')
        return jsonify({'success': False, 'message': '注册失败，请稍后重试'})