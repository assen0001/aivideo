#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
忘记密码模块
用于处理用户忘记密码的功能，包括验证邮箱、生成新密码、更新数据库和发送邮件
"""

import random
import string
import hashlib
from flask import Blueprint, request, jsonify, render_template
from sendmail import send_reset_password_email
from common import get_db_connection
import requests
import os

# 创建蓝图
forgetpwd_bp = Blueprint('forgetpwd', __name__)

def generate_random_password(length=10):
    """生成指定长度的随机密码，包含数字和小写字母"""
    characters = string.ascii_lowercase + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

def check_user_exists(email):
    """检查用户是否存在"""
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        query = "SELECT * FROM `ai_user` WHERE `account` = %s"
        cursor.execute(query, (email,))
        result = cursor.fetchone()
        return result is not None
    except Exception as e:
        print(f"查询用户时出错: {str(e)}")
        return False
    finally:
        if connection:
            connection.close()

def update_user_password(email, hashed_password):
    """更新用户密码"""
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        query = "UPDATE `ai_user` SET `password` = %s WHERE `account` = %s"
        cursor.execute(query, (hashed_password, email))
        connection.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"更新密码时出错: {str(e)}")
        if connection:
            connection.rollback()
        return False
    finally:
        if connection:
            connection.close()

def forget_password_handler():
    """处理忘记密码请求"""
    if request.method == 'GET':
        # 显示忘记密码页面
        return render_template('v2/forgetpwd.html')
    elif request.method == 'POST':
        try:
            # 获取请求数据
            data = request.get_json()
            email = data.get('email')
            
            if not email:
                return jsonify({"success": False, "message": "请输入邮箱地址"})
            
            # 检查用户是否存在
            if not check_user_exists(email):
                return jsonify({"success": False, "message": "不存在当前邮箱帐号"})
            
            # 生成随机密码
            plain_password = generate_random_password()
            
            # 使用MD5加密密码
            md5_hash = hashlib.md5()
            md5_hash.update(plain_password.encode('utf-8'))
            hashed_password = md5_hash.hexdigest()
            

            # 发送重置密码到邮件
            # if not send_reset_password_email(email, plain_password):
                # 密码已更新，但邮件发送失败
                # return jsonify({"success": False, "message": "密码已重置，但邮件发送失败，请联系客服"})

            # 发送重置密码到邮件
            try:       
                # 这里添加判断SMTP配置是否为空
                if not os.getenv('SMTP_SENDER') or not os.getenv('SMTP_PASSWORD'):
                    print(f'SMTP_SENDER 或 SMTP_PASSWORD 为空，使用公共接口发送邮件')
                    response = requests.post('https://aivideo.site/send_email_public', json={                    
                        'type': 'reset_pwd',
                        'email': email,
                        'pwdorcode': plain_password
                    })
                    if response.status_code != 200:
                        return jsonify({'success': False, 'message': '发送重置密码失败，请稍后重试'})
                    else:
                        if not update_user_password(email, hashed_password):
                            print(f'更新数据库中的密码失败')
                            return jsonify({'success': False, 'message': '更新数据库密码失败，请稍后重试'})
                        print(f'数据库更新成功')
                        return jsonify({'success': True, 'message': '重置密码已发送'})
                else:
                    print(f'使用 SMTP 发送重置密码到 {email}: {plain_password}')
                    if not send_reset_password_email(email, plain_password):
                        print(f'发送重置密码邮件失败')
                        return jsonify({'success': False, 'message': '发送重置密码失败，请稍后重试'})
                    print(f'发送重置密码邮件成功')
                    if not update_user_password(email, hashed_password):
                        print(f'更新数据库中的密码失败')
                        return jsonify({'success': False, 'message': '更新数据库密码失败，请稍后重试'})
                    print(f'数据库更新成功')
                    return jsonify({'success': True, 'message': '重置密码已发送'})
            except Exception as e:
                print(f'发送重置密码邮件异常: {str(e)}')
                return jsonify({'success': False, 'message': '发送重置密码失败，请稍后重试'})
            

            # return jsonify({"success": True, "message": "重置密码已发送到您的邮箱，请查收"})
        except Exception as e:
            print(f"处理忘记密码请求时出错: {str(e)}")
            return jsonify({"success": False, "message": "系统错误，请稍后重试"})

# 注册路由
@forgetpwd_bp.route('/forgetpwd', methods=['GET', 'POST'])
def forgetpwd():
    return forget_password_handler()