from flask import Blueprint, request, jsonify, render_template
from common import get_db_connection, get_config

booklist_bp = Blueprint('booklist', __name__)

@booklist_bp.route('/booklist')
def booklist_page():
    return render_template('booklist.html')

@booklist_bp.route('/get_config')
def config():
    return get_config()

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
                      "book_supplement_prompt, book_status, sdxl_prompt_styler " \
                      "FROM ai_booklist WHERE 1=1"
            else:
                sql = "SELECT id, book_name, book_author, " \
                      "SUBSTRING(book_note, 1, 100) as book_note, " \
                      "SUBSTRING(book_content, 1, 100) as book_content, " \
                      "book_supplement_prompt, book_status, sdxl_prompt_styler " \
                      "FROM ai_booklist WHERE 1=1"
            params = []
            
            # 添加查询条件
            if book_id:
                sql += " AND id = %s"
                params.append(book_id)
            if book_name:
                sql += " AND book_name LIKE %s"
                params.append(f"%{book_name}%")
            if book_author:
                sql += " AND book_author LIKE %s"
                params.append(f"%{book_author}%")
            if book_status:
                sql += " AND book_status = %s"
                params.append(book_status)
                
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

@booklist_bp.route('/booklist/create', methods=['POST'])
def create_book():
    data = request.json
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """INSERT INTO ai_booklist 
                    (book_name, book_author, book_note, book_content, 
                     book_supplement_prompt, book_status, sdxl_prompt_styler)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data['book_name'],
                data['book_author'],
                data['book_note'],
                data['book_content'],
                data['book_supplement_prompt'],
                data['book_status'],
                data.get('sdxl_prompt_styler', '')
            ))
            connection.commit()
            return jsonify({'status': 'success', 'id': cursor.lastrowid})
    finally:
        connection.close()

@booklist_bp.route('/booklist/update', methods=['POST'])
def update_book():
    data = request.json
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """UPDATE ai_booklist SET 
                    book_name = %s,
                    book_author = %s,
                    book_note = %s,
                    book_content = %s,
                    book_supplement_prompt = %s,
                    book_status = %s,
                    sdxl_prompt_styler = %s
                    WHERE id = %s"""
            cursor.execute(sql, (
                data['book_name'],
                data['book_author'],
                data['book_note'],
                data['book_content'],
                data['book_supplement_prompt'],
                data['book_status'],
                data.get('sdxl_prompt_styler', ''),
                data['id']
            ))
            connection.commit()
            return jsonify({'status': 'success'})
    finally:
        connection.close()

@booklist_bp.route('/booklist/delete', methods=['POST'])
def delete_book():
    data = request.json
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 删除ai_booklist表中的记录
            sql = "DELETE FROM ai_booklist WHERE id = %s"
            cursor.execute(sql, (data['id'],))
            
            # 删除ai_jobonline表中相关的记录
            sql2 = "DELETE FROM ai_jobonline WHERE book_id = %s"
            cursor.execute(sql2, (data['id'],))
            
            connection.commit()
            return jsonify({'status': 'success'})
    finally:
        connection.close()

