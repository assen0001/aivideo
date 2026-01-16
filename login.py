from flask import Blueprint, request, jsonify, render_template, session, redirect, url_for, flash
import time
import hashlib
from common import get_db_connection

# 创建登录相关的蓝图
login_bp = Blueprint('login', __name__)

@login_bp.route('/login', methods=['GET'])
def login():
    """显示登录页面"""
    return render_template('v2/login.html')

@login_bp.route('/login', methods=['POST'])
def process_login():
    """处理登录表单提交"""
    try:
        email = request.form.get('email') or request.json.get('email')
        password = request.form.get('password') or request.json.get('password')
        remember = request.form.get('remember') or request.json.get('remember')

        print(f'登录请求: email={email}, remember={remember}')
        
        # 验证输入
        if not email or not password:
            return render_template('v2/login.html', error='请填写所有必填字段')
        
        # 密码用md5加密
        password = hashlib.md5(password.encode('utf-8')).hexdigest()

        # 查询数据库
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                sql = """SELECT id, account, nickname, avatar, status, vip 
                     FROM ai_user WHERE account = %s AND password = %s"""
                cursor.execute(sql, (email, password))
                user = cursor.fetchone()
                
                # 如果查询到用户，说明登录成功
                if user:
                    # 登录成功后，将用户ID存储在session中
                    session['user_account'] = user['account']
                    session['user_id'] = user['id']
                    session['nickname'] = user['nickname']
                    session['avatar'] = user['avatar']
                    session['status'] = user['status']
                    session['vip'] = user['vip']
                    session['logged_in'] = True

                    # 如果选择了记住密码，可以设置session的过期时间
                    if remember:
                        session.permanent = True  # 这会使session在31天后过期，需要在Flask应用中设置app.permanent_session_lifetime

                    # 执行SQL更新用户登录时间
                    sql_update = "UPDATE ai_user SET lastertime = NOW(), login_num = login_num + 1 WHERE id = %s"
                    cursor.execute(sql_update, (user['id'],))
                    connection.commit()

                    return jsonify({'success': True, 'message': '登录成功！'})
                else:
                    return jsonify({'success': False, 'message': '邮箱或密码错误'})
        finally:
            connection.close()
            
    except Exception as e:
        print(f'登录失败: {str(e)}')
        return jsonify({'success': False, 'message': '登录失败，请稍后重试'})

@login_bp.route('/logout')
def logout():
    """处理用户登出"""
    # 清除session中的用户信息
    session.pop('user_account', None)
    session.pop('user_id', None)
    session.pop('nickname', None)
    session.pop('avatar', None)
    session.pop('status', None)
    session.pop('vip', None)
    session.pop('logged_in', None)
    session.clear()
    print('用户已登出')
    # 重定向到首页
    return redirect('/')

@login_bp.route('/forgot_password')
def forgot_password():
    """显示忘记密码页面"""
    # TODO: 实现忘记密码页面和功能
    # 这里暂时返回一个简单的响应
    return "忘记密码功能正在开发中"