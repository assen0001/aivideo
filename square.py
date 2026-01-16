from flask import Blueprint, jsonify, request, render_template, session
from datetime import datetime, timedelta
from common import get_db_connection, db_config
import os

# 创建蓝图
square_bp = Blueprint('square', __name__)

# 从common.py导入数据库连接函数

# 格式化时间显示
def format_time_diff(create_time):
    """
    根据创建时间计算与当前时间的差距，返回友好的时间格式
    """
    try:
        # 假设create_time是YYYY-MM-DD HH:MM:SS格式的字符串
        if isinstance(create_time, str):
            create_dt = datetime.strptime(create_time, '%Y-%m-%d %H:%M:%S')
        else:
            create_dt = create_time
            
        now = datetime.now()
        diff = now - create_dt
        
        # 计算天数差异
        days_diff = diff.days
        
        if days_diff == 0:
            return "今天"
        elif days_diff == 1:
            return "1天前"
        elif days_diff < 7:
            return f"{days_diff}天前"
        elif days_diff < 30:
            weeks = days_diff // 7
            return f"{weeks}周前"
        elif days_diff < 365:
            months = days_diff // 30
            return f"{months}个月前"
        else:
            # 超过1年显示具体日期
            return create_dt.strftime('%Y-%m-%d')
    except Exception as e:
        # 时间格式错误时返回原字符串
        return str(create_time)

# 格式化播放次数显示
def format_views(views):
    """
    格式化播放次数显示
    """
    try:
        views = int(views)
        if views >= 10000:
            return f"{views/10000:.1f}万次播放"
        else:
            return f"{views}次播放"
    except:
        return "0次播放"

# 视频广场页面
@square_bp.route('/square')
def square():
    """
    视频广场页面路由
    """
    return render_template('v2/square.html')

# 获取视频列表API
@square_bp.route('/api/square/videos', methods=['GET'])
def get_videos():
    """
    获取视频列表API
    支持分页、视频类型筛选和关键字搜索
    """
    try:
        # 获取请求参数
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 10, type=int)
        video_type = request.args.get('video_type', '')
        keyword = request.args.get('keyword', '')
        
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 构建SQL查询
        base_sql = """
        SELECT a.id, a.videomerge_url, a.videocover_url, a.create_time, a.play_time, a.views, 
               b.nickname, b.avatar, c.book_name, c.video_type, c.video_aspect, c.user_id
        FROM ai_videomerge a 
        LEFT JOIN ai_user b ON a.user_id = b.id 
        LEFT JOIN ai_booklist c ON a.book_id = c.id
        """
        
        conditions = []
        params = []
        conditions.append("WHERE a.video_status = 1 ")
        
        # 添加视频类型筛选条件
        if video_type:
            conditions.append("c.video_type = %s")
            params.append(video_type)
        
        # 添加关键字搜索条件
        if keyword:
            conditions.append("c.book_name LIKE %s")
            params.append(f"%{keyword}%")

        # 添加用户ID筛选条件
        user_id = session.get('user_id', "9999")
        if user_id:
            conditions.append("c.user_id = %s")
            params.append(user_id)
        
        # 组合SQL语句
        if conditions:
            where_clause = " AND ".join(conditions)
        
        # 完整的查询SQL
        query_sql = f"{base_sql} {where_clause} ORDER BY a.id DESC LIMIT %s OFFSET %s"
        # print(query_sql)
        params.extend([page_size, offset])
        
        # 获取总数的SQL
        count_sql = f"SELECT COUNT(*) as total_count FROM ai_videomerge a LEFT JOIN ai_booklist c ON a.book_id = c.id {where_clause}"
        
        # 执行查询
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                # 获取总数
                cursor.execute(count_sql, params[:-2])  # 移除LIMIT和OFFSET参数
                total_row = cursor.fetchone()
                # 尝试通过别名获取总数，如果失败则通过索引获取
                try:
                    total = total_row['total_count'] if total_row else 0
                except (KeyError, IndexError):
                    total = total_row[0] if total_row else 0
                
                # 获取数据
                cursor.execute(query_sql, params)
                videos = cursor.fetchall()
        finally:
            conn.close()
        
        # 处理结果数据
        video_list = []
        for video in videos:
            # 处理封面图路径，如果为空则使用默认图片
            cover_url = video['videocover_url'] if video['videocover_url'] else 'static/images/videocover.jpg'
            
            video_list.append({
                'id': video['id'],
                'videomerge_url': video['videomerge_url'],
                'videocover_url': cover_url,
                'play_time': format_play_time(video['play_time'] or 0),
                'time_display': format_time_diff(video['create_time']),
                'views': format_views(video['views']),
                'nickname': video['nickname'] or '未注册用户',
                'avatar': video['avatar'] or 'static/images/avatar.png',
                'book_name': video['book_name'] or '未命名视频',
                'video_type': video['video_type'] or '',
                'video_aspect': video['video_aspect'] or ''
            })
        
        # 计算总页数
        total_pages = (total + page_size - 1) // page_size
        
        # 返回JSON结果
        return jsonify({
            'code': 0,
            'message': 'success',
            'data': {
                'videos': video_list,
                'pagination': {
                    'current_page': page,
                    'page_size': page_size,
                    'total': total,
                    'total_pages': total_pages
                }
            }
        })
        
    except Exception as e:
        # 错误处理
        return jsonify({
            'code': 500,
            'message': f'查询失败: {str(e)}'
        })

def format_play_time(seconds):
    """将秒转换为分秒格式"""
    minutes = seconds // 60
    remaining_seconds = seconds % 60
    return f'{minutes:02d}:{remaining_seconds:02d}'