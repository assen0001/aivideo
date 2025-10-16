from flask import Blueprint, request, jsonify, render_template
from common import get_db_connection

imageslist_bp = Blueprint('imageslist', __name__)

@imageslist_bp.route('/imageslist')
def images_page():
    return render_template('imageslist.html')

@imageslist_bp.route('/get_images/<int:book_id>')
def get_images(book_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 3, type=int)
    
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

@imageslist_bp.route('/update_image_status', methods=['POST'])
def update_image_status():
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
            sql = "SELECT id, book_name FROM ai_booklist order by id desc"
            cursor.execute(sql)
            result = cursor.fetchall()
            return jsonify(result)
    finally:
        connection.close()