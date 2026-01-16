from flask import Blueprint, request, jsonify, session, render_template
import hashlib
import re
from common import get_db_connection

# 创建修改密码相关的蓝图
user_changepwd_bp = Blueprint('user_changepwd', __name__)

@user_changepwd_bp.route('/user/change-password')
def user_change_password():
    # 检查用户是否已登录
    if not session.get('logged_in') or 'user_id' not in session:
        return render_template('v2/login.html')  
    return render_template('user/change_password.html')

@user_changepwd_bp.route('/user/change_password', methods=['POST'])
def change_password():
    """处理修改密码请求"""
    try:
        # 检查用户是否已登录
        if not session.get('logged_in') or 'user_account' not in session:
            return jsonify({'success': False, 'message': '请先登录'})
        
        # 获取用户输入的新密码和确认新密码
        new_password = request.form.get('new_password') or request.json.get('new_password')
        confirm_password = request.form.get('confirm_password') or request.json.get('confirm_password')
        
        # 验证输入不为空
        if not new_password or not confirm_password:
            return jsonify({'success': False, 'message': '新密码和确认新密码不能为空'})
        
        # 验证两次输入的密码是否相同
        if new_password != confirm_password:
            return jsonify({'success': False, 'message': '两次输入的密码不一致'})
        
        # 验证密码规则：至少6个字符，包含字母和数字
        if len(new_password) < 6:
            return jsonify({'success': False, 'message': '密码长度至少为6个字符'})
        
        if not re.search(r'[a-zA-Z]', new_password) or not re.search(r'[0-9]', new_password):
            return jsonify({'success': False, 'message': '密码必须包含字母和数字'})
        
        # 使用MD5加密密码
        encrypted_password = hashlib.md5(new_password.encode('utf-8')).hexdigest()
        
        # 从session中获取用户账号
        user_account = session['user_account']
        
        # 连接数据库并更新密码
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 更新用户密码
                sql = "UPDATE `ai_user` SET `password`=%s WHERE `account`=%s"
                affected_rows = cursor.execute(sql, (encrypted_password, user_account))
                
                # 提交事务
                connection.commit()
                
                if affected_rows > 0:
                    return jsonify({'success': True, 'message': '密码修改成功'})
                else:
                    return jsonify({'success': False, 'message': '密码修改失败，用户不存在'})
        finally:
            # 确保数据库连接被关闭
            connection.close()
            
    except Exception as e:
        print(f'修改密码失败: {str(e)}')
        return jsonify({'success': False, 'message': '修改密码失败，请稍后重试'})