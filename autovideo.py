from flask import Blueprint, render_template, request, jsonify, session
from common import get_db_connection

autovideo_bp = Blueprint('autovideo', __name__)

@autovideo_bp.route('/autovideo')
def autovideo_page():
    return render_template('autovideo.html')

# 一键生成AI读书视频后台功能
@autovideo_bp.route('/autovideo/create', methods=['POST'])
def create_autovideo():
    data = request.json
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 插入数据到ai_booklist表
            # 判断是否存在type字段，区分V1和V2版本
            if 'type' not in data:
                # v1版本
                sql = """INSERT INTO ai_booklist 
                        (book_name, book_author, book_note, book_supplement_prompt, sdxl_prompt_styler)
                        VALUES (%s, %s, %s, %s, %s)"""
                cursor.execute(sql, (
                    data['book_name'],
                    data['book_author'],
                    data['book_note'],
                    data['book_supplement_prompt'],
                    data['sdxl_prompt_styler']
                ))
            else:
                # v2版本
                sql = """INSERT INTO ai_booklist 
                        (video_aspect, book_author, book_name, book_note, book_supplement_prompt, 
                         video_music, sdxl_prompt_styler, video_type, video_voice, vip)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
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
                    session.get('vip', 0)
                ))
            connection.commit()
            
            # 获取自增ID
            book_id = cursor.lastrowid
            print(f"自增ID为: {book_id}")
            
            return jsonify({'status': 'success', 'book_id': book_id})
    except Exception as e:
        connection.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        connection.close()


# 新增视频状态查询接口
@autovideo_bp.route('/autovideo/status', methods=['GET'])
def get_video_status():
    book_id = request.args.get('book_id')
    print("book_id: "+book_id)
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 动态构建SQL查询语句
            base_sql = """SELECT a.book_id, a.job_name, a.job_type, a.job_status, 
                          a.job_note, a.create_time, a.stop_time, 
                          b.videomerge_url, b.videocover_url
                       FROM ai_jobonline a
                       LEFT JOIN ai_videomerge b ON a.book_id = b.book_id 
                       """
            
            # 添加WHERE条件判断
            if book_id and int(book_id) != 0:
                sql = base_sql + " WHERE a.book_id = %s "
                cursor.execute(sql, (book_id,))
            else:
                sql = base_sql
                cursor.execute(sql)
            
            results = cursor.fetchall()
            return jsonify({'status': 'success', 'data': results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        connection.close()

# 删除数据库中ai_jobonline表的记录
@autovideo_bp.route('/autovideo/delete_job', methods=['GET'])
def delete_autovideo():
    book_id = request.args.get('book_id')
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 判断 book_id 是否为空
            if book_id is None or book_id == '':
                sql = "DELETE FROM ai_jobonline"
                cursor.execute(sql)
            else:
                sql = "DELETE FROM ai_jobonline WHERE book_id = %s"
                cursor.execute(sql, (book_id,))
                
            connection.commit()
            return jsonify({'status': 'success', 'message': '记录删除成功'})
    except Exception as e:
        connection.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        connection.close()
