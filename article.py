"""
文章管理后台业务代码
负责处理文章列表、分类查询、搜索等功能的API接口
"""

from flask import Blueprint, request, jsonify, session, render_template
from common import get_db_connection

# 创建文章管理相关的蓝图
user_article_bp = Blueprint('user_article', __name__)

@user_article_bp.route('/user/articles')
def user_articles():
    # 检查用户是否已登录
    if not session.get('logged_in') or 'user_id' not in session:
        return render_template('v2/login.html')    
    return render_template('user/article_list.html')

@user_article_bp.route('/api/user/articles/list')
def get_article_list():
    """
    获取文章列表API
    支持分页、分类查询、关键字搜索功能
    """
    try:
        # 检查用户是否已登录
        if not session.get('logged_in') or 'user_id' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 获取查询参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        cate_id = request.args.get('cate_id', '')
        keyword = request.args.get('keyword', '')
        
        # 计算分页偏移量
        offset = (page - 1) * page_size
        
        # 连接数据库
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 构建查询条件
                where_conditions = []
                params = []
                
                # 添加分类查询条件
                if cate_id and cate_id != '':
                    where_conditions.append("a.cate_id = %s")
                    params.append(cate_id)
                
                # 添加关键字搜索条件
                if keyword and keyword != '':
                    where_conditions.append("a.title LIKE %s")
                    params.append(f"%{keyword}%")
                
                # 构建完整的WHERE子句
                where_clause = ""
                if where_conditions:
                    where_clause = "WHERE " + " AND ".join(where_conditions)
                
                # 查询文章列表数据
                article_list_sql = f"""
                    SELECT a.id, a.title, a.create_time, a.views, a.cate_id, 
                           b.cat_name, c.nickname, a.order_id
                    FROM ai_article a 
                    LEFT JOIN ai_category b ON a.cate_id = b.id 
                    LEFT JOIN ai_user c ON a.user_id = c.id 
                    {where_clause}
                    ORDER BY a.order_id DESC, a.create_time DESC 
                    LIMIT %s OFFSET %s
                """
                
                # 添加分页参数
                params.extend([page_size, offset])
                cursor.execute(article_list_sql, params)
                articles = cursor.fetchall()
                
                # 查询总记录数
                count_sql = f"""
                    SELECT COUNT(*) as total
                    FROM ai_article a 
                    LEFT JOIN ai_category b ON a.cate_id = b.id 
                    LEFT JOIN ai_user c ON a.user_id = c.id 
                    {where_clause}
                """
                cursor.execute(count_sql, params[:-2])  # 去掉分页参数
                total_result = cursor.fetchone()
                total_count = total_result['total'] if total_result else 0
                total_pages = (total_count + page_size - 1) // page_size
                print(f"total_count: {total_count}, page_size: {page_size}, offset: {offset}, total_pages: {total_pages}")
                
                # 格式化返回数据
                article_list = []
                for article in articles:
                    article_list.append({
                        'id': article['id'],
                        'title': article['title'],
                        'create_time': article['create_time'].strftime('%Y-%m-%d %H:%M:%S') if article['create_time'] else '',
                        'views': article['views'],
                        'cate_id': article['cate_id'],
                        'cat_name': article['cat_name'] or '未分类',
                        'nickname': article['nickname'] or '未知作者',
                        'order_id': article['order_id']
                    })
                
                # 返回分页数据
                return jsonify({
                    'success': True,
                    'data': {
                        'list': article_list,
                        'pagination': {
                            'page': page,
                            'page_size': page_size,
                            'total_count': total_count,
                            'total_pages': total_pages
                        }
                    }
                })
                
        finally:
            # 确保数据库连接被关闭
            connection.close()
            
    except Exception as e:
        print(f'获取文章列表失败: {str(e)}')
        return jsonify({'success': False, 'message': '获取文章列表失败，请稍后重试'})

@user_article_bp.route('/api/user/articles/categories')
def get_article_categories():
    """
    获取文章分类列表API
    用于分类下拉框数据
    """
    try:       
        # 连接数据库
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 查询分类列表
                category_sql = """
                    SELECT id, cat_name 
                    FROM ai_category 
                    ORDER BY order_id DESC
                """
                cursor.execute(category_sql)
                categories = cursor.fetchall()
                
                # 格式化分类数据
                category_list = []
                for category in categories:
                    category_list.append({
                        'id': category['id'],
                        'cat_name': category['cat_name']
                    })
                
                return jsonify({
                    'success': True,
                    'data': category_list
                })
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f'获取文章分类失败: {str(e)}')
        return jsonify({'success': False, 'message': '获取分类列表失败，请稍后重试'})

@user_article_bp.route('/api/user/articles/delete/<int:article_id>', methods=['DELETE'])
def delete_article(article_id):
    """
    删除文章API
    暂时不实现具体删除逻辑，返回成功状态
    """
    try:
        # 检查用户是否已登录
        if not session.get('logged_in') or 'user_id' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 这里可以添加删除逻辑，暂时返回成功
        return jsonify({
            'success': True,
            'message': '删除功能暂未实现'
        })
        
    except Exception as e:
        print(f'删除文章失败: {str(e)}')
        return jsonify({'success': False, 'message': '删除文章失败，请稍后重试'})

@user_article_bp.route('/user/article_edit')
def user_article_edit():
    """
    文章编辑页面路由
    支持新建和编辑两种模式
    """
    # 检查用户是否已登录
    if not session.get('logged_in') or 'user_id' not in session:
        return render_template('v2/login.html')
    
    # 获取文章ID参数
    article_id = request.args.get('id', '')
    
    return render_template('user/article_edit.html', article_id=article_id)

@user_article_bp.route('/api/user/articles/detail/<int:article_id>')
def get_article_detail(article_id):
    """
    获取单篇文章详情API
    用于文章编辑页面数据填充
    """
    try:
        # 检查用户是否已登录
        if not session.get('logged_in') or 'user_id' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 连接数据库
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 查询文章详情
                article_sql = """
                    SELECT a.id, a.title, a.content, a.cate_id, a.order_id, 
                           b.cat_name, a.user_id
                    FROM ai_article a 
                    LEFT JOIN ai_category b ON a.cate_id = b.id 
                    WHERE a.id = %s
                """
                cursor.execute(article_sql, (article_id,))
                article = cursor.fetchone()
                
                if not article:
                    return jsonify({'success': False, 'message': '文章不存在'}), 404
                
                # 格式化返回数据
                article_data = {
                    'id': article['id'],
                    'title': article['title'],
                    'content': article['content'],
                    'cate_id': article['cate_id'],
                    'order_id': article['order_id'],
                    'cat_name': article['cat_name'] or '未分类'
                }
                
                return jsonify({
                    'success': True,
                    'data': article_data
                })
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f'获取文章详情失败: {str(e)}')
        return jsonify({'success': False, 'message': '获取文章详情失败，请稍后重试'})

@user_article_bp.route('/api/user/articles/create', methods=['POST'])
def create_article():
    """
    创建新文章API
    根据用户提交的表单数据创建新文章
    """
    try:
        # 检查用户是否已登录
        if not session.get('logged_in') or 'user_id' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 获取请求数据
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': '请求数据不能为空'}), 400
        
        # 验证必填字段
        required_fields = ['title', 'cate_id', 'content']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'message': f'{field}字段不能为空'}), 400
        
        # 获取用户ID
        user_id = session['user_id']
        
        # 处理数据
        title = data['title'].strip()[:100]  # 截取前100个字符
        cate_id = data['cate_id']
        content = data['content']
        order_id = data.get('order_id', 100)
        
        # 连接数据库
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 插入新文章
                insert_sql = """
                    INSERT INTO ai_article (cate_id, user_id, title, content, order_id, create_time)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                """
                cursor.execute(insert_sql, (cate_id, user_id, title, content, order_id))
                connection.commit()
                
                return jsonify({
                    'success': True,
                    'message': '文章创建成功',
                    'data': {
                        'id': cursor.lastrowid
                    }
                })
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f'创建文章失败: {str(e)}')
        return jsonify({'success': False, 'message': '创建文章失败，请稍后重试'})

@user_article_bp.route('/api/user/articles/update/<int:article_id>', methods=['PUT'])
def update_article(article_id):
    """
    更新文章API
    根据文章ID更新文章内容
    """
    try:
        # 检查用户是否已登录
        if not session.get('logged_in') or 'user_id' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 获取请求数据
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': '请求数据不能为空'}), 400
        
        # 验证必填字段
        required_fields = ['title', 'cate_id', 'content']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'message': f'{field}字段不能为空'}), 400
        
        # 处理数据
        title = data['title'].strip()[:100]  # 截取前100个字符
        cate_id = data['cate_id']
        content = data['content']
        order_id = data.get('order_id', 100)
        
        # 连接数据库
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 检查文章是否存在
                # check_sql = "SELECT id FROM ai_article WHERE id = %s"
                # cursor.execute(check_sql, (article_id,))
                # article = cursor.fetchone()
                
                # if not article:
                #     return jsonify({'success': False, 'message': '文章不存在'}), 404
                
                # 更新文章
                update_sql = """
                    UPDATE ai_article 
                    SET cate_id = %s, title = %s, content = %s, order_id = %s, update_time = NOW()
                    WHERE id = %s
                """
                cursor.execute(update_sql, (cate_id, title, content, order_id, article_id))
                connection.commit()
                
                return jsonify({
                    'success': True,
                    'message': '文章更新成功'
                })
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f'更新文章失败: {str(e)}')
        return jsonify({'success': False, 'message': '更新文章失败，请稍后重试'})