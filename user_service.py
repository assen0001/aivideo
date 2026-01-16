from flask import Blueprint, request, jsonify, session, render_template

# 创建联系客服相关的蓝图
user_service_bp = Blueprint('user_service', __name__)

@user_service_bp.route('/user/customer-service')
def user_customer_service():
    # 检查用户是否已登录
    if not session.get('logged_in') or 'user_id' not in session:
        return render_template('v2/login.html')  
    return render_template('user/customer_service.html')