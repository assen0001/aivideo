from flask import Blueprint, render_template, request, jsonify
from common import get_db_connection

autovideo_list_bp = Blueprint('autovideo_list', __name__)

@autovideo_list_bp.route('/autovideo_list')
def autovideo_list():
    """渲染已生成视频列表页面"""
    return render_template('autovideo_list.html')

@autovideo_list_bp.route('/autovideo_list/data')
def get_autovideo_list_data():
    """获取已生成视频列表数据"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # 状态映射字典
    status_map = {
        0: "待生成文案",
        1: "已生成文案", 
        2: "已生成字幕",
        3: "已生成语音",
        4: "已生成图片",
        5: "已图生视频",
        6: "已完成"
    }
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 获取总数
        count_sql = """
            SELECT COUNT(*) as total
            FROM ai_booklist a 
            LEFT JOIN ai_videomerge b ON a.id = b.book_id
        """
        cursor.execute(count_sql)
        total = cursor.fetchone()['total']
        
        # 获取分页数据
        sql = """
            SELECT a.id, a.book_name, a.book_status, a.createtime, b.videomerge_url 
            FROM ai_booklist a 
            LEFT JOIN ai_videomerge b ON a.id = b.book_id 
            ORDER BY a.id DESC 
            LIMIT %s OFFSET %s
        """
        offset = (page - 1) * per_page
        cursor.execute(sql, (per_page, offset))
        results = cursor.fetchall()
        
        # 处理数据
        data = []
        for row in results:
            item = dict(row)
            # 转换状态为文字
            item['status_text'] = status_map.get(item['book_status'], '未知状态')
            # 确保时间格式化为字符串
            if item['createtime']:
                item['createtime'] = item['createtime'].strftime('%Y-%m-%d %H:%M:%S')
            else:
                item['createtime'] = ''
            data.append(item)
        
        return jsonify({
            'data': data,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        })
    except Exception as e:
        print(f"Error fetching autovideo list: {str(e)}")
        return jsonify({'error': f"数据库查询失败: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()