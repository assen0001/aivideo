from flask import Blueprint, request, jsonify, render_template
from common import get_db_connection

# 创建帮助中心相关的蓝图
help_bp = Blueprint('help', __name__)

@help_bp.route('/help')
def help_page():
    """显示帮助中心页面"""
    return render_template('v2/help.html')

@help_bp.route('/help/categories')
def get_categories():
    """获取文章分类列表"""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 查询文章分类，按order_id降序排列
            sql = """
                SELECT id, cat_name 
                FROM ai_category 
                ORDER BY order_id DESC
            """
            cursor.execute(sql)
            categories = cursor.fetchall()
            return jsonify({'success': True, 'data': categories})
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取分类失败: {str(e)}'})
    finally:
        connection.close()

@help_bp.route('/help/articles')
def get_articles():
    """获取所有文章列表，按分类分组"""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 查询所有文章，按分类分组
            sql = """
                SELECT 
                    c.id as category_id,
                    c.cat_name,
                    c.order_id,
                    a.id as article_id,
                    a.title,
                    a.order_id
                FROM ai_category c
                LEFT JOIN ai_article a ON c.id = a.cate_id
                ORDER BY c.order_id DESC, a.order_id DESC, a.id
            """
            cursor.execute(sql)
            articles = cursor.fetchall()
            
            # 按分类分组文章
            categories_data = {}
            for article in articles:
                category_id = article['category_id']
                if category_id not in categories_data:
                    categories_data[category_id] = {
                        'id': category_id,
                        'cat_name': article['cat_name'],
                        'articles': []
                    }
                
                if article['article_id']:  # 确保文章存在
                    categories_data[category_id]['articles'].append({
                        'id': article['article_id'],
                        'title': article['title'],
                        'order_id': article['order_id']
                    })
            
            # 转换为列表格式
            result = list(categories_data.values())
            return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取文章列表失败: {str(e)}'})
    finally:
        connection.close()

@help_bp.route('/help/article/<int:article_id>')
def get_article_detail(article_id):
    """获取文章详情"""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 查询文章详情
            sql = """
                SELECT 
                    a.id,
                    a.title,
                    a.content,
                    a.create_time,
                    a.views,
                    c.cat_name
                FROM ai_article a
                LEFT JOIN ai_category c ON a.cate_id = c.id
                WHERE a.id = %s
            """
            cursor.execute(sql, (article_id,))
            article = cursor.fetchone()
            
            if article:
                # 更新阅读数
                update_sql = "UPDATE ai_article SET views = views + 1 WHERE id = %s"
                cursor.execute(update_sql, (article_id,))
                connection.commit()
                
                return jsonify({'success': True, 'data': article})
            else:
                return jsonify({'success': False, 'message': '文章不存在'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取文章详情失败: {str(e)}'})
    finally:
        connection.close()