from flask import Blueprint, request, jsonify, render_template, session
import random
import time
import hashlib
import requests
import string
from sendmail import send_verification_code, send_default_password_email
from common import get_db_connection
import os

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
        email = request.json.get('email') if request.is_json else request.form.get('email')
        if not email:
            return jsonify({'success': False, 'message': '邮箱地址不能为空'})
        
        # 生成6位随机验证码
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        # 存储验证码（实际生产环境应使用Redis等，并设置过期时间）
        verification_codes[email] = {'code': code, 'timestamp': time.time()}
        print(f'发送验证码到 {email}: {code}')
        
        # 发送验证码邮件
        try:       
            # 这里添加判断SMTP配置是否为空
            if not os.getenv('SMTP_SENDER') or not os.getenv('SMTP_PASSWORD'):
                print(f'SMTP_SENDER 或 SMTP_PASSWORD 为空，使用公共接口发送邮件')
                response = requests.post('https://aivideo.site/send_email_public', json={                    
                    'type': 'verification_code',
                    'email': email,
                    'pwdorcode': code
                })
                if response.status_code != 200:
                    return jsonify({'success': False, 'message': '发送验证码失败，请稍后重试'})
                else:
                    return jsonify({'success': True, 'message': '验证码已发送'})
            else:
                print(f'使用 SMTP 发送验证码到 {email}: {code}')
                send_verification_code(email, code)                
                return jsonify({'success': True, 'message': '验证码已发送'})
        except Exception as e:
            print(f'发送验证码邮件异常: {str(e)}')
            return jsonify({'success': False, 'message': '发送验证码失败，请稍后重试'})
    except Exception as e:
        print(f'发送验证码失败: {str(e)}')
        return jsonify({'success': False, 'message': '发送验证码失败，请稍后重试'})


@register_bp.route('/register', methods=['POST'])
def process_register():
    """处理注册表单提交"""
    try:
        email = request.json.get('email') if request.is_json else request.form.get('email')
        verification_code = request.json.get('verificationCode') if request.is_json else request.form.get('verificationCode')
        agree_terms = request.json.get('agreeTerms') if request.is_json else request.form.get('agreeTerms')
        
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
        if time.time() - code_info['timestamp'] > 3000:
            del verification_codes[email]
            return jsonify({'success': False, 'message': '验证码已过期，请重新获取'})
        
        if code_info['code'] != verification_code:
            return jsonify({'success': False, 'message': '验证码错误'})
        
        # 判断数据库是否已存在该邮箱用户
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = "SELECT id FROM ai_user WHERE account = %s"
            cursor.execute(sql, (email,))
            if cursor.fetchone():
                return jsonify({'success': False, 'message': '该邮箱已被注册，请登录'})

        # 生成随机密码（10位数字+小写字母）
        def generate_random_password(length=10):
            """生成指定长度的随机密码，包含数字和小写字母"""
            characters = string.ascii_lowercase + string.digits
            return ''.join(random.choice(characters) for _ in range(length))
        
        # 生成随机密码
        plain_password = generate_random_password()

        # 生成呢称（用户名）
        nickname = "会员" + email.split('@')[0]
        
        # 使用MD5加密密码
        md5_hash = hashlib.md5()
        md5_hash.update(plain_password.encode('utf-8'))
        hashed_password = md5_hash.hexdigest()
        
        # 获取用户浏览器的user-agent
        user_agent = request.headers.get('User-Agent', '')
        # 获取用户IP地址
        user_ip = request.remote_addr
        
        # 保存用户信息到数据库
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                sql = """INSERT INTO ai_user 
                        (account, password, nickname, user_agent, user_ip) 
                        VALUES (%s, %s, %s, %s, %s)"""
                cursor.execute(sql, (email, hashed_password, nickname, user_agent, user_ip))
                connection.commit()

                # 设置session用户信息
                session['user_account'] = email
                session['user_id'] = cursor.lastrowid
                session['nickname'] = nickname
                session['avatar'] = "static/images/avatar.png"
                session['status'] = 0
                session['vip'] = 0
                session['logged_in'] = True

                # 如果选择了记住密码，可以设置session的过期时间
                if request.json.get('rememberMe') if request.is_json else request.form.get('rememberMe'):
                    session.permanent = True
                
                # 打印用户ID（调试用）
                # print(f"用户 {email} 注册成功，用户ID: {cursor.lastrowid}")

                # 模板：注册后发送默认密码到客户邮箱
                # send_default_password_email(email, plain_password)
                # 发送默认密码到客户邮箱
                try:       
                    # 这里添加判断SMTP配置是否为空
                    if not os.getenv('SMTP_SENDER') or not os.getenv('SMTP_PASSWORD'):
                        print(f'SMTP_SENDER 或 SMTP_PASSWORD 为空，使用公共接口发送邮件')
                        response = requests.post('https://aivideo.site/send_email_public', json={                    
                            'type': 'default_pwd',
                            'email': email,
                            'pwdorcode': plain_password
                        })
                        if response.status_code != 200:
                            return jsonify({'success': False, 'message': '发送默认密码失败，请稍后重试'})
                        else:
                            return jsonify({'success': True, 'message': '默认密码已发送'})
                    else:
                        print(f'使用 SMTP 发送默认密码到 {email}: {plain_password}')
                        send_default_password_email(email, plain_password)                
                        return jsonify({'success': True, 'message': '默认密码已发送'})
                except Exception as e:
                    print(f'发送默认密码邮件异常: {str(e)}')


                # 注册成功后删除验证码
                del verification_codes[email]

                # 返回注册成功信息
                return jsonify({'success': True, 'message': '注册成功！默认密码已发送到您的邮箱。'})
        except Exception as e:
            connection.rollback()
            print(f"保存用户信息到数据库失败: {str(e)}")
            return jsonify({'success': False, 'message': '注册失败，请稍后重试'})
        finally:
            connection.close()

    except Exception as e:
        print(f'注册失败: {str(e)}')
        return jsonify({'success': False, 'message': '注册失败，请稍后重试'})
