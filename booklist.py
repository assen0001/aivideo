from flask import Blueprint, request, jsonify, render_template, session
from common import get_db_connection, get_config, db_config
import requests
import os
import glob

booklist_bp = Blueprint('booklist', __name__)

@booklist_bp.route('/booklist')
def booklist_page():
    return render_template('booklist.html')

@booklist_bp.route('/get_config')
def config():
    return get_config()

# 获取书单数据(列表、详情)
@booklist_bp.route('/booklist/data')
def booklist_data():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    book_name = request.args.get('book_name', '')
    book_author = request.args.get('book_author', '')
    book_status = request.args.get('book_status', '')
    book_id = request.args.get('id', '')

    connection = get_db_connection()    
    try:
        with connection.cursor() as cursor:
            # 基础查询 - 根据是否按ID查询决定是否截取内容
            if book_id:
                sql = "SELECT id, book_name, book_author, " \
                      "book_note, book_content, " \
                      "book_supplement_prompt, book_status, sdxl_prompt_styler, " \
                      "video_type, video_aspect, video_voice, video_music " \
                      "FROM ai_booklist WHERE 1=1"
            else:
                sql = "SELECT id, book_name, book_author, " \
                      "SUBSTRING(book_note, 1, 100) as book_note, " \
                      "SUBSTRING(book_content, 1, 100) as book_content, " \
                      "book_supplement_prompt, book_status, sdxl_prompt_styler, " \
                      "video_type, video_aspect, video_voice, video_music " \
                      "FROM ai_booklist WHERE 1=1"
            params = []
            
            # 添加查询条件
            if book_id:
                sql += " AND id = %s"
                params.append(book_id)
            # if book_name:
            #     sql += " AND book_name LIKE %s"
            #     params.append(f"%{book_name}%")
            # if book_author:
            #     sql += " AND book_author LIKE %s"
            #     params.append(f"%{book_author}%")
            # 修改为搜索 主题文本
            if book_name:
                sql += " AND book_note LIKE %s"
                params.append(f"%{book_name}%")
            if book_status:
                sql += " AND book_status = %s"
                params.append(book_status)

            # 按用户ID筛选
            user_id = session.get('user_id', None)
            if user_id:
                sql += " AND user_id = %s"
                params.append(user_id)
                
            # 获取总数
            count_sql = f"SELECT COUNT(*) as total FROM ({sql}) as t"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']
            
            # 添加排序和分页
            sql += " ORDER BY id DESC LIMIT %s OFFSET %s"
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

# 创建书单
@booklist_bp.route('/booklist/create', methods=['POST'])
def create_book():
    data = request.json
    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '请升级VIP会员，才能进行此操作！'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """INSERT INTO ai_booklist 
                    (book_name, book_note, book_content, sdxl_prompt_styler, 
                    video_type, video_aspect, video_voice, video_music, vip, user_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (                
                data['book_note'][:25],
                data['book_note'],
                data['book_content'],
                data.get('sdxl_prompt_styler', ''),
                data['book_type'],
                data['book_ratio'],
                data['book_voice'],
                data['book_music'],
                session.get('vip', 0),
                session.get('user_id', None)
            ))
            connection.commit()
            return jsonify({'status': 'success', 'id': cursor.lastrowid})
    finally:
        connection.close()

# 更新书单
@booklist_bp.route('/booklist/update', methods=['POST'])
def update_book():
    data = request.json
    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '请升级VIP会员，才能进行此操作！'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """UPDATE ai_booklist SET 
                    book_name = %s,
                    book_note = %s,
                    book_content = %s,
                    book_status = %s,
                    sdxl_prompt_styler = %s,
                    video_type = %s,
                    video_aspect = %s,
                    video_voice = %s,
                    video_music = %s
                    WHERE id = %s"""
            cursor.execute(sql, (
                data['book_note'][:50],
                data['book_note'],
                data['book_content'],
                data['book_status'],
                data.get('sdxl_prompt_styler', ''),
                data['book_type'],
                data['book_ratio'],
                data['book_voice'],
                data['book_music'],
                data['id']
            ))
            connection.commit()
            return jsonify({'status': 'success'})
    finally:
        connection.close()

# 删除书单
@booklist_bp.route('/booklist/delete', methods=['POST'])
def delete_book():
    data = request.json
    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '请升级VIP会员，才能进行此操作！'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 删除ai_booklist表中的记录
            sql = "DELETE FROM ai_booklist WHERE id = %s"
            cursor.execute(sql, (data['id'],))
            
            # 删除ai_jobonline表中相关的记录
            sql2 = "DELETE FROM ai_jobonline WHERE book_id = %s"
            cursor.execute(sql2, (data['id'],))
            
            # 删除ai_imageslist表中的记录
            sql3 = "DELETE FROM `ai_imageslist` WHERE book_id = %s"
            cursor.execute(sql3, (data['id'],))
            
            # 删除ai_videolist表中的记录
            sql4 = "DELETE FROM `ai_videolist` WHERE book_id = %s"
            cursor.execute(sql4, (data['id'],))
            
            # 删除ai_videomerge表中的记录
            sql5 = "DELETE FROM `ai_videomerge` WHERE book_id = %s"
            cursor.execute(sql5, (data['id'],))
            
            # 删除ai_voicelist表中的记录
            sql6 = "DELETE FROM `ai_voicelist` WHERE book_id = %s"
            cursor.execute(sql6, (data['id'],))
            
            # 删除ai_voicemerge表中的记录
            sql7 = "DELETE FROM `ai_voicemerge` WHERE book_id = %s"
            cursor.execute(sql7, (data['id'],))

            connection.commit()

            # 添加物理删除文件代码
            book_id = data['id']            
            # 确保book_id是字符串类型
            book_id_str = str(book_id)            
            # 获取应用根目录，确保路径的绝对引用
            app_root = os.path.dirname(os.path.abspath(__file__))
            
            # 物理删除视频文件 - 在static/uploads/videomerge目录下，删除以video_{book_id}开头的所有文件
            video_dir = os.path.join(app_root, 'static', 'uploads', 'videomerge')
            if os.path.exists(video_dir) and os.path.isdir(video_dir):
                try:
                    video_pattern = os.path.join(video_dir, f'video_{book_id_str}_*')
                    video_files = glob.glob(video_pattern)
                    for video_file in video_files:
                        try:
                            if os.path.isfile(video_file):
                                os.remove(video_file)
                                print(f"成功删除视频文件: {video_file}")
                        except Exception as e:
                            print(f"删除视频文件失败: {video_file}, 错误: {str(e)}")
                except Exception as e:
                    print(f"处理视频文件目录时出错: {str(e)}")
            
            # 物理删除语音文件 - 在static/uploads/voicemerge目录下，删除以merged_{book_id}开头的所有文件
            voice_dir = os.path.join(app_root, 'static', 'uploads', 'voicemerge')
            if os.path.exists(voice_dir) and os.path.isdir(voice_dir):
                try:
                    voice_pattern = os.path.join(voice_dir, f'merged_{book_id_str}_*')
                    voice_files = glob.glob(voice_pattern)
                    for voice_file in voice_files:
                        try:
                            if os.path.isfile(voice_file):
                                os.remove(voice_file)
                                print(f"成功删除语音文件: {voice_file}")
                        except Exception as e:
                            print(f"删除语音文件失败: {voice_file}, 错误: {str(e)}")
                except Exception as e:
                    print(f"处理语音文件目录时出错: {str(e)}")
            
            return jsonify({'status': 'success'})
            
    finally:
        connection.close()

# 调用N8N工作流1- 生成文案
@booklist_bp.route('/call_job1_wenan', methods=['GET'])
def call_job1_wenan():
    book_id = request.args.get('bookid')
    if not book_id:
        return jsonify({'status': 'error', 'message': '缺少bookid参数'}), 400

    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '请升级VIP会员，才能进行此操作！'}), 403

    # N8N任务URL
    webhook_url = db_config.get('N8N_URL') + "/webhook/" + db_config.get('N8N_WEBHOOK_PATH_JOB_1')
    postdata = {
        "book_id": book_id,
        "type": "wenan",
        "aivideo_url": db_config.get('AIVIDEO_URL'),
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

    # 如果是仙宫云部署时，检查aivideo_url是否包含容器实例ID
    if 'x-gpu.com' in request.base_url:
        if "实例" in postdata.get("aivideo_url"):
            return jsonify({'status': 'error', 'message': '首次部署后需要复制容器实例ID到.env文件中！'}), 400

    try:
        resp = requests.post(webhook_url, json=postdata, timeout=5)
        if resp.status_code == 200:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': f'N8N请求失败，状态码：{resp.status_code}'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'请求N8N异常：{str(e)}'}), 500



# 调用N8N工作流1- 生成段落(字幕)
@booklist_bp.route('/call_job1_duanluo', methods=['GET'])
def call_job1_duanluo():
    book_id = request.args.get('bookid')
    if not book_id:
        return jsonify({'status': 'error', 'message': '缺少bookid参数'}), 400

    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '请升级VIP会员，才能进行此操作！'}), 403

    # N8N任务URL
    webhook_url = db_config.get('N8N_URL') + "/webhook/" + db_config.get('N8N_WEBHOOK_PATH_JOB_1')
    postdata = {
        "book_id": book_id,
        "type": "duanluo",
        "aivideo_url": db_config.get('AIVIDEO_URL'),
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
