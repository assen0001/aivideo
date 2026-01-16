from flask import Blueprint, render_template, request, jsonify, session
from common import get_db_connection, db_config
import requests

autovideo_bp = Blueprint('autovideo', __name__)

@autovideo_bp.route('/autovideo')
def autovideo_page():
    return render_template('autovideo.html')

# 一键生成AI视频后台功能
@autovideo_bp.route('/autovideo/create', methods=['POST'])
def create_autovideo():
    data = request.json

    # 检测user_id是否存在
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'status': 'error', 'message': '请先注册会员并登录。'}), 403

    # 检查是否为VIP会员, session['vip'] == 1
    vip = session.get('vip', 0)
    # # if vip == 0:
    # #     return jsonify({'status': 'error', 'message': '请先升级VIP会员才能创建视频'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 插入数据到ai_booklist表 v2版本
            sql = """INSERT INTO ai_booklist 
                    (video_aspect, book_author, book_name, book_note, book_supplement_prompt, 
                        video_music, sdxl_prompt_styler, video_type, video_voice, vip, user_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data['aspect'],
                data['book_author'],
                data['book_name'],
                data['book_note'],
                data['book_supplement_prompt'],
                data['music'],
                data['sdxl_prompt_styler'],
                data['type'],
                data['voice'],
                vip,
                user_id
            ))
            connection.commit()
            
            # 获取自增ID
            book_id = cursor.lastrowid
            print(f"自增ID为: {book_id}")

            # 调用webhook通知生成AI视频任务
            call_webhook(book_id, redo="off")
            
            return jsonify({'status': 'success', 'book_id': book_id})
    except Exception as e:
        connection.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        connection.close()

# 前端调用外部webhook，通知生成AI读书视频任务
@autovideo_bp.route('/autovideo/call_webhook', methods=['POST'])
def call_webhook(book_id=None, redo="off"):
    """
    前端调用外部webhook，通知生成AI视频任务
    支持两种调用方式：
    1. 作为Flask路由函数：从request.json获取book_id
    2. 作为普通函数：直接传入book_id参数
    
    参数:
        book_id: 插入ai_booklist后返回的自增ID（可选，当作为普通函数调用时传入）
    """
    # 如果是作为路由函数被调用，从request.json获取book_id
    is_route_call = book_id is None
    if is_route_call:
        book_id = request.json.get('book_id')
        if not book_id:
            return jsonify({'status': 'error', 'message': '缺少book_id'}), 400

        if(request.json.get('redo')):
            redo = request.json.get('redo')

    # N8N任务URL
    webhook_url = db_config.get('N8N_URL') + "/webhook/" + db_config.get('N8N_WEBHOOK_PATH_AUTO')
    postdata = {
        "book_id": book_id,
        "redo": redo,
        "aivideo_url": db_config.get('AIVIDEO_URL'),
        # "n8n_url": db_config.get('N8N_URL'),
        "comfyui_url": db_config.get('COMFYUI_URL'),
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

    # 如果是仙宫云部署时，检查aivideo_url是否包含容器实例ID
    # if 'x-gpu.com' in request.base_url:
    # 检查关键 URL 中是否仍保留占位符“实例”，防止未替换容器实例 ID
    if any("实例" in (url or "") for url in [postdata.get("aivideo_url"), postdata.get("comfyui_url")]):
        error_msg = '首次部署后需要复制容器实例ID到.env文件中！'
        print(error_msg, postdata.get("aivideo_url"), postdata.get("comfyui_url"))
        if is_route_call:
            return jsonify({'status': 'error', 'message': error_msg}), 400
        else:
            # 作为普通函数调用时，抛出异常
            raise Exception(error_msg)

    try:
        response = requests.post(webhook_url, json=postdata, timeout=5)
        if response.status_code == 200:
            print("webhook 调用成功")
            # 判断是否作为路由函数调用
            if request:
                return jsonify({'status': 'success', 'message': 'webhook 调用成功'})
        else:
            print("webhook 调用失败", response.status_code, response.text)
            # 判断是否作为路由函数调用
            if request:
                return jsonify({'status': 'error', 'message': 'webhook 调用失败'}), 500
    except Exception as e:
        print("webhook 调用异常:", e)
        # 判断是否作为路由函数调用
        if request:
            return jsonify({'status': 'error', 'message': 'webhook 调用异常'}), 500

# 视频任务状态查询接口
@autovideo_bp.route('/autovideo/status', methods=['GET'])
def get_video_status():
    book_id = request.args.get('book_id')
    print("book_id: "+book_id)

    # 获取当前用户ID
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'status': 'error', 'message': '未登录或会话过期'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 动态构建SQL查询语句
            base_sql = """SELECT a.book_id, a.job_name, a.job_type, a.job_status, 
                          a.job_note, a.create_time, a.stop_time, 
                          b.videomerge_url, b.videocover_url, b.id
                       FROM ai_jobonline a
                       LEFT JOIN ai_videomerge b ON a.book_id = b.book_id 
                       WHERE a.job_user = %s
                       """
            
            # 添加WHERE条件判断
            if book_id and int(book_id) != 0:
                sql = base_sql + " and a.book_id = %s "
                cursor.execute(sql, (user_id, book_id))
            else:
                sql = base_sql
                cursor.execute(sql, (user_id,))
            
            results = cursor.fetchall()
            return jsonify({'status': 'success', 'data': results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        connection.close()

# 删除数据库中ai_jobonline表的记录
@autovideo_bp.route('/autovideo/delete_job', methods=['GET'])
def delete_autovideo():
    # book_id = request.args.get('book_id')
    # 获取当前用户ID
    user_id = session.get('user_id')
    # if not user_id:
    #     return jsonify({'status': 'error', 'message': '未登录或会话过期'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "DELETE FROM ai_jobonline WHERE job_user = %s"
            cursor.execute(sql, (user_id,))                
            connection.commit()
            return jsonify({'status': 'success', 'message': '记录删除成功'})
    except Exception as e:
        connection.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        connection.close()

# 第4步，获取数据库中ai_imageslist表的最新记录
@autovideo_bp.route('/get_last_image', methods=['GET'])
def get_last_image():
    book_id = request.args.get('book_id')
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, CONCAT(%s, '/view?filename=', images_url_01) AS images_url FROM ai_imageslist WHERE book_id = %s and images_url_01 is not null ORDER BY id DESC LIMIT 1"
            print(sql)
            cursor.execute(sql, (db_config.get('COMFYUI_URL'), book_id))
            results = cursor.fetchone()
            return jsonify({'status': 'success', 'data': results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        connection.close()

# 第5步，获取数据库中ai_videolist表的最新记录
@autovideo_bp.route('/get_last_video', methods=['GET'])
def get_last_video():
    book_id = request.args.get('book_id')
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, CONCAT(%s, '/view?filename=', images_url) AS images_url, CONCAT(%s, '/view?filename=', video_url) AS video_url FROM ai_videolist WHERE book_id = %s ORDER BY id DESC LIMIT 1"
            cursor.execute(sql, (db_config.get('COMFYUI_URL_WAN'), db_config.get('COMFYUI_URL_WAN'), book_id))
            results = cursor.fetchone()
            return jsonify({'status': 'success', 'data': results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        connection.close()
