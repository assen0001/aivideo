"""
用户仪表盘后台业务代码
负责处理用户仪表盘的数据统计和展示功能
"""

from flask import Blueprint, request, jsonify, session, render_template
from common import get_db_connection

# 创建用户仪表盘相关的蓝图
user_dashboard_bp = Blueprint('user_dashboard', __name__)

@user_dashboard_bp.route('/user/dashboard')
def user_dashboard():
    # 检查用户是否已登录
    if not session.get('logged_in') or 'user_id' not in session:
        return render_template('v2/login.html')    
    return render_template('user/dashboard.html')

@user_dashboard_bp.route('/api/user/dashboard/stats')
def get_dashboard_stats():
    """
    获取用户仪表盘统计数据API
    返回我的视频数量、账户余额、待处理订单等统计信息
    """
    try:
        # 检查用户是否已登录
        if not session.get('logged_in') or 'user_id' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        user_id = session['user_id']
        
        # 连接数据库
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 查询我的视频数量
                video_count_sql = """
                    SELECT COUNT(b.id) as num 
                    FROM ai_booklist a 
                    LEFT JOIN ai_videomerge b ON a.id = b.book_id 
                    WHERE a.user_id = %s
                """
                cursor.execute(video_count_sql, (user_id,))
                video_count_result = cursor.fetchone()
                video_count = video_count_result['num'] if video_count_result else 0
                
                
                
                # 返回统计数据
                stats_data = {
                    'success': True,
                    'data': {
                        'video_count': video_count,
                    }
                }
                
                return jsonify(stats_data)
                
        finally:
            # 确保数据库连接被关闭
            connection.close()
            
    except Exception as e:
        print(f'获取仪表盘统计数据失败: {str(e)}')
        return jsonify({'success': False, 'message': '获取统计数据失败，请稍后重试'})