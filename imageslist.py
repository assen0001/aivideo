from flask import Blueprint, request, jsonify, render_template, session
from common import get_db_connection, db_config
import requests

imageslist_bp = Blueprint('imageslist', __name__)

@imageslist_bp.route('/imageslist')
def images_page():
    return render_template('imageslist.html')

# 获取图片列表
@imageslist_bp.route('/get_images/<int:book_id>')
def get_images(book_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 5, type=int)
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 基础查询
            sql = "SELECT * FROM ai_imageslist WHERE book_id = %s ORDER BY id ASC"
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

# 更新段落提示词
@imageslist_bp.route('/update_paragraph', methods=['POST'])
def update_paragraph():
    data = request.json
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = f"UPDATE ai_imageslist SET {data['field']} = %s WHERE id = %s"
            cursor.execute(sql, (data['value'], data['id']))
            connection.commit()
            return jsonify({'status': 'success'})
    finally:
        connection.close()

@imageslist_bp.route('/delete_image', methods=['POST'])
def delete_image():
    data = request.json
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = f"UPDATE ai_imageslist SET {data['field']} = '' WHERE id = %s"
            cursor.execute(sql, (data['id'],))
            connection.commit()
            return jsonify({'status': 'success'})
    finally:
        connection.close()

@imageslist_bp.route('/get_images_by_id', methods=['POST'])
def get_images_by_id():
    data = request.json
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT * FROM ai_imageslist WHERE id = %s"
            cursor.execute(sql, (data['id'],))
            result = cursor.fetchone()
            if result:
                return jsonify({
                    'status': 'success',
                    'paragraph_prompt_cn': result['paragraph_prompt_cn'],
                    'paragraph_prompt_en': result['paragraph_prompt_en'],
                    'images_url_01': result['images_url_01'],
                    'images_url_02': result['images_url_02'],
                    'images_url_03': result['images_url_03'],
                    'images_url_04': result['images_url_04']
                })
            return jsonify({'status': 'error', 'message': 'Image not found'}), 404
    finally:
        connection.close()

@imageslist_bp.route('/get_video_url', methods=['POST'])
def get_video_url():
    images_url = request.json.get('images_url')
    if not images_url:
        return jsonify({'error': 'images_url parameter is required'}), 400
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT video_url FROM ai_videolist WHERE images_url = %s LIMIT 1"
            cursor.execute(sql, (images_url,))
            result = cursor.fetchone()
            if result:
                return jsonify({'video_url': result['video_url']})
            return jsonify({})
    finally:
        connection.close()

@imageslist_bp.route('/get_booklists')
def get_booklists():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, book_name FROM ai_booklist WHERE user_id = %s order by id desc"
            cursor.execute(sql, (session.get('user_id', None),))
            result = cursor.fetchall()
            return jsonify(result)
    finally:
        connection.close()


# 调用N8N工作流 - 生成提示词 或 中文翻译成英文
@imageslist_bp.route('/call_redo1_prompt', methods=['GET'])
def call_redo1_prompt():
    book_id = request.args.get('id')
    type = request.args.get('type')

    if not book_id:
        return jsonify({'status': 'error', 'message': '缺少bookid参数'}), 400

    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '本演示平台不提供此功能，请独立部署平台才能进行此操作！'}), 403

    # N8N任务URL
    webhook_url = db_config.get('N8N_URL') + "/webhook/" + db_config.get('N8N_WEBHOOK_PATH_JOB_1')
    postdata = {
        "book_id": book_id,
        "type": type,
        # "translate": translate,
        # "aivideo_url": db_config.get('AIVIDEO_URL'),
        # "n8n_url": db_config.get('N8N_URL'),
        # "comfyui_url": db_config.get('COMFYUI_URL'),
        # "comfyui_url_wan": db_config.get('COMFYUI_URL_WAN'),
        # "comfyui_url_path": db_config.get('COMFYUI_URL_PATH'),
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


# 调用N8N工作流 - 重做单个图片
@imageslist_bp.route('/call_redo2_images', methods=['POST'])
def call_redo2_images():
    book_id = request.json.get('id')
    field = request.json.get('field')
    comfyui_url = request.json.get('comfyui_url')

    if not book_id:
        return jsonify({'status': 'error', 'message': '缺少bookid参数'}), 400

    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '本演示平台不提供此功能，请独立部署平台才能进行此操作！'}), 403

    # N8N任务URL
    webhook_url = db_config.get('N8N_URL') + "/webhook/" + db_config.get('N8N_WEBHOOK_PATH_JOB_2')
    postdata = {
        "book_id": book_id,
        "type": "field",
        "field": field,
        # "aivideo_url": db_config.get('AIVIDEO_URL'),
        # "n8n_url": db_config.get('N8N_URL'),
        "comfyui_url": db_config.get('COMFYUI_URL'),
        # "comfyui_url_wan": db_config.get('COMFYUI_URL_WAN'),
        # "comfyui_url_path": db_config.get('COMFYUI_URL_PATH'),
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


# 调用N8N工作流 - 生成图片
@imageslist_bp.route('/call_job2_images', methods=['POST'])
def call_job2_images():
    book_id = request.json.get('book_id')
    
    if not book_id:
        return jsonify({'status': 'error', 'message': '缺少bookid参数'}), 400

    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '本演示平台不提供此功能，请独立部署平台才能进行此操作！'}), 403

    # N8N任务URL
    webhook_url = db_config.get('N8N_URL') + "/webhook/" + db_config.get('N8N_WEBHOOK_PATH_JOB_2')
    postdata = {
        "book_id": book_id,
        "type": "autorun",
        # "aivideo_url": db_config.get('AIVIDEO_URL'),
        # "n8n_url": db_config.get('N8N_URL'),
        "comfyui_url": db_config.get('COMFYUI_URL'),
        # "comfyui_url_wan": db_config.get('COMFYUI_URL_WAN'),
        # "comfyui_url_path": db_config.get('COMFYUI_URL_PATH'),
        # "indextts_url": db_config.get('INDEXTTS_URL'),
        "host": db_config.get('ZC_MYSQL_SERVER_N8N'),
        "port": db_config.get('ZC_MYSQL_PORT'),
        "database": db_config.get('ZC_MYSQL_NAME'),
        "user": db_config.get('ZC_MYSQL_USERNAME'),
        "password": db_config.get('ZC_MYSQL_PASSWORD'),
    }

    try:
        resp = requests.post(webhook_url, json=postdata, timeout=5)
        if resp.status_code == 200:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': f'N8N请求失败，状态码：{resp.status_code}'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'请求N8N异常：{str(e)}'}), 500
