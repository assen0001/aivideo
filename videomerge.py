from flask import Blueprint, request, jsonify, render_template, session
from common import get_db_connection, db_config
from videoprocess import process_videos
import os

videomerge_bp = Blueprint('videomerge', __name__)

@videomerge_bp.route('/videomerge')
def videomerge():
    return render_template('videomerge.html')

# 获取视频合并列表
@videomerge_bp.route('/get_video_list', methods=['GET'])
def get_video_list():
    book_id = request.args.get('book_id')
    if not book_id:
        return jsonify({'error': 'book_id参数缺失'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT a.id, a.videomerge_url, a.bilibili_url, a.create_time, b.video_aspect
            FROM ai_videomerge a LEFT JOIN ai_booklist b on a.book_id = b.id
            WHERE a.book_id = %s
            ORDER BY a.id DESC
        """, (book_id,))
        results = cursor.fetchall()
        return jsonify([dict(row) for row in results])
    except Exception as e:
        print(f"Error fetching video list: {str(e)}")
        return jsonify({'error': f"数据库查询失败: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

# 删除视频合并记录
@videomerge_bp.route('/delete_videomerge', methods=['POST'])
def delete_videomerge():
    data = request.get_json()
    if not data or 'video_id' not in data:
        return jsonify({'status': 'error', 'message': 'video_id参数缺失'}), 400

    # 判断是否VIP用户
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '请升级VIP会员，才能进行此操作！'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 先查询视频文件和封面文件的保存路径
        cursor.execute("""SELECT videomerge_url, videocover_url FROM ai_videomerge WHERE id = %s""", (data['video_id'],))
        result = cursor.fetchone()
        
        if result:
            video_path = result.get('videomerge_url')
            cover_path = result.get('videocover_url')
            
            # 物理删除视频文件
            if video_path and os.path.exists(video_path):
                try:
                    os.remove(video_path)
                    print(f"成功删除视频文件: {video_path}")
                except Exception as e:
                    print(f"删除视频文件失败: {str(e)}")
            
            # 物理删除封面图片文件
            if cover_path and os.path.exists(cover_path):
                try:
                    os.remove(cover_path)
                    print(f"成功删除封面文件: {cover_path}")
                except Exception as e:
                    print(f"删除封面文件失败: {str(e)}")
        
        # 最后删除数据库记录
        cursor.execute("""DELETE FROM ai_videomerge WHERE id = %s""", (data['video_id'],))
        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        print(f"Error deleting video: {str(e)}")
        return jsonify({'error': f"删除失败: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

# 合成视频
@videomerge_bp.route('/create_video', methods=['POST'])
def create_video():
    data = request.get_json()
    if not data or 'book_id' not in data:
        print(f"no book_id: {data.get('book_id')}")      
        return jsonify({'error': 'book_id参数缺失'}), 400
    else:
       print(f"create_video book_id: {data['book_id']}")

    # 判断是否VIP用户
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '请升级VIP会员，才能进行此操作！'}), 403
    
    # 视频处理逻辑移到数据库操作之前，避免长时间占用连接
    try:
        # 先进行所有需要数据库的查询操作
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 查询分镜视频
        cursor.execute("""
            SELECT video_url FROM ai_videolist WHERE book_id = %s and video_status = 1
        """, (data['book_id'],))
        video_rows = cursor.fetchall()
        video_urls = []
        for row in video_rows:
            if row and len(row) > 0:
                if 'x-gpu.com' in request.base_url:
                    video_urls.append(f"http://127.0.0.1:8188/view?filename={row['video_url']}")
                else:
                    video_urls.append(f"{db_config['COMFYUI_URL_WAN']}/view?filename={row['video_url']}")
        print(f"查询分镜视频共：{len(video_urls)}")

        # 查询字幕
        cursor.execute("""
            SELECT paragraph_initial FROM ai_imageslist WHERE book_id = %s
        """, (data['book_id'],))
        texts = []
        for row in cursor._rows:
            if row and len(row) > 0:
                texts.append(row['paragraph_initial'])
        print(f"查询字幕共：{len(texts)}")
        
        # 查询字幕语音元数据
        cursor.execute("""
            SELECT start_time, duration FROM ai_voicelist WHERE book_id = %s
        """, (data['book_id'],))
        time_data = []
        for row in cursor._rows:
            if row and len(row) > 1:
                time_data.append({"start_time": row['start_time'], "duration": row['duration']})
        print(f"查询字幕元数据共：{len(time_data)}")
        
        # 查询语音（合成）文件
        cursor.execute("""
            SELECT a.book_name, a.book_author, a.video_aspect, a.user_id, b.voice_url FROM ai_booklist a 
            LEFT JOIN (SELECT voice_url, book_id from ai_voicemerge WHERE voice_status = 1 ORDER BY id DESC) b 
            on a.id = b.book_id WHERE a.id = %s 
        """, (data['book_id'],))
        voice_row = cursor._rows
        audio_url = f"/{voice_row[0]['voice_url']}" if voice_row[0]['voice_url'] else None
        title_txt = voice_row[0]['book_name']
        author_txt = voice_row[0]['book_author']
        video_aspect = voice_row[0]['video_aspect']
        user_id = voice_row[0]['user_id']
        print(f"查询语音文件：{audio_url}")
        
        # 先关闭连接，避免长时间占用
        cursor.close()
        conn.close()
        
        # 调用视频合成函数（耗时操作）
        print(f"开始合成视频...")
        video_filename, cover_filename, audio_duration = process_videos(
            video_urls=video_urls, 
            title_txt=title_txt,
            author_txt=author_txt, 
            video_aspect=video_aspect,
            texts=texts,
            time_data=time_data,
            book_id=data['book_id'],
            audio_url=audio_url,
            vip_code=db_config['VIP_REGISTER_CODE']
        )
        print(f"合成视频完成：{video_filename}")
        
        # 完成视频处理后，重新建立连接进行数据库更新
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 保存结果到数据库
        cursor.execute("""
            INSERT INTO ai_videomerge (book_id, videomerge_url, videocover_url, play_time, user_id)
            VALUES (%s, %s, %s, %s, %s)
        """, (data['book_id'], video_filename, cover_filename, audio_duration, user_id))

        # 更新书单状态为已合并
        cursor.execute("""
            UPDATE ai_booklist SET book_status = 6 WHERE id = %s
        """, (data['book_id'],))
        conn.commit()
        print(f"保存视频记录并更新书单状态")
        
        return jsonify({'success': True})
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        
        # 如果cursor不存在，则重新连接数据库
        if 'cursor' not in locals():
            conn = get_db_connection()
            cursor = conn.cursor()

        # 更新在线任务状态为已失败-4
        cursor.execute("""
            UPDATE ai_jobonline SET job_status='4', stop_time=NOW() WHERE job_type = 0
        """)
        conn.commit()

        print(f"Error creating video: {str(e)}")
        return jsonify({'error': f"视频合成失败: {str(e)}"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
