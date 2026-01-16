from flask import Blueprint, request, jsonify, session, render_template
import hashlib
import re
from common import get_db_connection

# 创建个人信息相关的蓝图
user_profile_bp = Blueprint('user_profile', __name__)

@user_profile_bp.route('/user/profile')
def profile():
    # 检查用户是否已登录
    if not session.get('logged_in') or 'user_account' not in session:
        return render_template('v2/login.html')
    return render_template('user/profile.html')

@user_profile_bp.route('/user/profile/data')
def get_profile_data():
    """获取当前登录用户的详细信息"""
    try:
        # 检查用户是否已登录
        if not session.get('logged_in') or 'user_account' not in session:
            return jsonify({'success': False, 'message': '请先登录'})
        
        # 从session中获取用户账号
        user_account = session['user_account']
        
        # 连接数据库并查询用户信息
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 查询用户详细信息
                sql = """SELECT 
                            account, nickname, avatar, status, vip, 
                            vip_stoptime, createtime, lastertime, 
                            user_agent, user_ip, note, realname, phone
                        FROM `ai_user` 
                        WHERE `account` = %s"""
                cursor.execute(sql, (user_account,))
                user_data = cursor.fetchone()
                
                if not user_data:
                    return jsonify({'success': False, 'message': '用户不存在'})
                
                # 格式化返回数据
                profile_data = {
                    'success': True,
                    'data': {
                        'account': user_data['account'],
                        'nickname': user_data['nickname'] or '会员' + str(user_data.get('id', '')),
                        'avatar': user_data['avatar'] or 'static/images/avatar.png',
                        'realname': user_data['realname'] or '',
                        'phone': user_data['phone'] or '',
                        'status': user_data['status'],
                        'vip': user_data['vip'],
                        'vip_stoptime': user_data['vip_stoptime'].strftime('%Y-%m-%d %H:%M:%S') if user_data['vip_stoptime'] else None,
                        'createtime': user_data['createtime'].strftime('%Y-%m-%d %H:%M:%S') if user_data['createtime'] else None,
                        'lastertime': user_data['lastertime'].strftime('%Y-%m-%d %H:%M:%S') if user_data['lastertime'] else None,
                        'note': user_data['note'] or '',
                        'user_agent': user_data['user_agent'] or '',
                        'user_ip': user_data['user_ip'] or ''
                    }
                }
                
                return jsonify(profile_data)
                
        finally:
            # 确保数据库连接被关闭
            connection.close()
            
    except Exception as e:
        print(f'获取用户信息失败: {str(e)}')
        return jsonify({'success': False, 'message': '获取用户信息失败，请稍后重试'})

@user_profile_bp.route('/user/profile/update', methods=['POST'])
def update_profile():
    """更新用户个人信息"""
    try:
        # 检查用户是否已登录
        if not session.get('logged_in') or 'user_account' not in session:
            return jsonify({'success': False, 'message': '请先登录'})
        
        # 从session中获取用户账号
        user_account = session['user_account']
        
        # 获取表单数据
        nickname = request.form.get('nickname')
        note = request.form.get('note')
        real_name = request.form.get('realname')  
        phone = request.form.get('phone')
        
        # 验证昵称长度
        if nickname and len(nickname) > 50:
            return jsonify({'success': False, 'message': '昵称长度不能超过50个字符'})
        
        # 验证个人简介长度
        # if note and len(note) > 500:
        #     return jsonify({'success': False, 'message': '个人简介长度不能超过500个字符'})
        # 截取 note 前1000个字符
        if note and len(note) > 1000:
            note = note[:1000]

        # 验证真实姓名长度
        if real_name and len(real_name) > 50:
            return jsonify({'success': False, 'message': '真实姓名长度不能超过50个字符'})

        # 验证手机号码格式
        if phone and not re.match(r'^1[3-9]\d{9}$', phone):
            return jsonify({'success': False, 'message': '请输入正确的手机号码'})
        
        # 连接数据库并更新用户信息
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 更新用户信息
                sql = """UPDATE `ai_user` 
                         SET `nickname` = %s, `note` = %s, `realname` = %s, `phone` = %s
                         WHERE `account` = %s"""
                cursor.execute(sql, (nickname, note, real_name, phone, user_account))
                
                # 提交事务
                connection.commit()
                return jsonify({'success': True, 'message': '个人信息更新成功'})
        except Exception as e:
            return jsonify({'success': False, 'message': f'更新个人信息失败: {str(e)}'})
        finally:
            # 确保数据库连接被关闭
            connection.close()
            
    except Exception as e:
        print(f'更新个人信息失败: {str(e)}')
        return jsonify({'success': False, 'message': '更新个人信息失败，请稍后重试'})

@user_profile_bp.route('/user/profile/avatar', methods=['POST'])
def update_avatar():
    """更新用户头像"""
    try:
        # 检查用户是否已登录
        if not session.get('logged_in') or 'user_account' not in session:
            return jsonify({'success': False, 'message': '请先登录'})
        
        # 从session中获取用户账号
        user_account = session['user_account']
        
        # 获取头像文件
        avatar_file = request.files.get('avatar')
        
        if not avatar_file:
            return jsonify({'success': False, 'message': '请选择头像文件'})
        
        # 验证文件类型
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if '.' not in avatar_file.filename or avatar_file.filename.split('.')[-1].lower() not in allowed_extensions:
            return jsonify({'success': False, 'message': '只支持PNG、JPG、JPEG、GIF格式的图片'})
        
        # 验证文件大小（限制为2MB）
        if len(avatar_file.read()) > 2 * 1024 * 1024:
            return jsonify({'success': False, 'message': '头像文件大小不能超过2MB'})
        avatar_file.seek(0)  # 重置文件指针
        
        # 生成新的文件名
        import os
        import uuid
        
        # 创建头像目录
        avatar_dir = 'static/uploads/avatars'
        if not os.path.exists(avatar_dir):
            os.makedirs(avatar_dir)
        
        # 生成唯一文件名
        file_extension = avatar_file.filename.split('.')[-1].lower()
        new_filename = f"{uuid.uuid4().hex}.{file_extension}"
        avatar_path = os.path.join(avatar_dir, new_filename)
        
        # 保存文件
        avatar_file.save(avatar_path)
        
        # 更新数据库中的头像路径
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                sql = "UPDATE `ai_user` SET `avatar` = %s WHERE `account` = %s"
                affected_rows = cursor.execute(sql, (avatar_path, user_account))
                
                # 提交事务
                connection.commit()
                
                if affected_rows > 0:
                    # 更新session中的头像
                    session['avatar'] = avatar_path
                    
                    return jsonify({
                        'success': True, 
                        'message': '头像更新成功',
                        'avatar_url': avatar_path
                    })
                else:
                    # 删除已保存的文件
                    os.remove(avatar_path)
                    return jsonify({'success': False, 'message': '头像更新失败'})
                    
        finally:
            # 确保数据库连接被关闭
            connection.close()
            
    except Exception as e:
        print(f'更新头像失败: {str(e)}')
        return jsonify({'success': False, 'message': '更新头像失败，请稍后重试'})