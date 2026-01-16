from flask import Blueprint, request, jsonify, render_template, session
from common import get_db_connection, db_config
import requests

videolist_bp = Blueprint('videolist', __name__)

@videolist_bp.route('/videolist')
def videolist_page():
    return render_template('videolist.html')

@videolist_bp.route('/get_videos/<int:book_id>')
def get_videos(book_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 3, type=int)
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 基础查询
            sql = """
                SELECT
                    i.id AS image_id,
                    v.id as video_id,
                    i.paragraph_initial,
                    GROUP_CONCAT(v.video_url ORDER BY v.id SEPARATOR ',') AS video_urls,
                    GROUP_CONCAT(v.video_status ORDER BY v.id SEPARATOR ',') AS video_statuses
                FROM ai_imageslist i
                LEFT JOIN ai_videolist v ON i.id = v.images_id
                WHERE i.book_id = %s
                GROUP BY i.id, i.paragraph_initial
            """
            params = [book_id]
            
            # 获取总数
            count_sql = f"SELECT COUNT(*) as total FROM ({sql}) as t"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']
            
            # 添加分页
            sql += " LIMIT %s OFFSET %s"
            params.extend([per_page, (page - 1) * per_page])
            
            cursor.execute(sql, params)
            result = cursor.fetchall()
            
            return jsonify({
                'data': result,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            })
    finally:
        connection.close()


# 调用N8N工作流 - 重做单个视频
@videolist_bp.route('/call_redo3_video', methods=['POST'])
def call_redo3_video():
    video_url = request.json.get('video_url')

    if not video_url:
        return jsonify({'status': 'error', 'message': '缺少video_url参数'}), 400

    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '本演示平台不提供此功能，请独立部署平台才能进行此操作！'}), 403

    # N8N任务URL
    webhook_url = db_config.get('N8N_URL') + "/webhook/" + db_config.get('N8N_WEBHOOK_PATH_JOB_3')
    postdata = {
        "type": "fenjing",
        "video_url": video_url,
        # "aivideo_url": db_config.get('AIVIDEO_URL'),
        # "n8n_url": db_config.get('N8N_URL'),
        # "comfyui_url": db_config.get('COMFYUI_URL'),
        "comfyui_url_wan": db_config.get('COMFYUI_URL_WAN'),
        "comfyui_url_path": db_config.get('COMFYUI_URL_PATH'),
        # "indextts_url": db_config.get('INDEXTTS_URL'),
        "host": db_config.get('ZC_MYSQL_SERVER_N8N'),
        "port": db_config.get('ZC_MYSQL_PORT'),
        "database": db_config.get('ZC_MYSQL_NAME'),
        "user": db_config.get('ZC_MYSQL_USERNAME'),
        "password": db_config.get('ZC_MYSQL_PASSWORD'),
        "vip_code": db_config.get('VIP_REGISTER_CODE'),
    }

    try:
        resp = requests.post(webhook_url, json=postdata, timeout=5)
        if resp.status_code == 200:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': f'N8N请求失败，状态码：{resp.status_code}'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'请求N8N异常：{str(e)}'}), 500


# 调用N8N工作流 - # 生成视频按钮
@videolist_bp.route('/call_job3_video', methods=['POST'])
def call_job3_video():
    book_id = request.json.get('book_id')
    if not book_id:
        return jsonify({'status': 'error', 'message': '缺少bookid参数'}), 400

    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '本演示平台不提供此功能，请独立部署平台才能进行此操作！'}), 403

    # N8N任务URL
    webhook_url = db_config.get('N8N_URL') + "/webhook/" + db_config.get('N8N_WEBHOOK_PATH_JOB_3')
    postdata = {
        "book_id": book_id,
        "type": "autorun",
        # "aivideo_url": db_config.get('AIVIDEO_URL'),
        # "n8n_url": db_config.get('N8N_URL'),
        # "comfyui_url": db_config.get('COMFYUI_URL'),
        "comfyui_url_wan": db_config.get('COMFYUI_URL_WAN'),
        "comfyui_url_path": db_config.get('COMFYUI_URL_PATH'),
        # "indextts_url": db_config.get('INDEXTTS_URL'),
        "host": db_config.get('ZC_MYSQL_SERVER_N8N'),
        "port": db_config.get('ZC_MYSQL_PORT'),
        "database": db_config.get('ZC_MYSQL_NAME'),
        "user": db_config.get('ZC_MYSQL_USERNAME'),
        "password": db_config.get('ZC_MYSQL_PASSWORD'),
        "vip_code": db_config.get('VIP_REGISTER_CODE'),
    }

    try:
        resp = requests.post(webhook_url, json=postdata, timeout=5)
        if resp.status_code == 200:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': f'N8N请求失败，状态码：{resp.status_code}'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'请求N8N异常：{str(e)}'}), 500



