"""
我的视频页面后台业务代码
负责处理用户视频列表的查询、搜索、分页和操作功能
"""

from flask import Blueprint, request, jsonify, session, render_template
from common import get_db_connection
import math
import os
import glob

# 创建我的视频相关的蓝图
user_myvideo_bp = Blueprint('user_myvideo', __name__)

@user_myvideo_bp.route('/user/my-videos')
def user_my_videos():
    # 检查用户是否已登录
    if not session.get('logged_in') or 'user_id' not in session:
        return render_template('v2/login.html')
    return render_template('user/my_videos.html')

# 获取用户视频列表数据API
@user_myvideo_bp.route('/api/user/my-videos')
def get_my_videos():
    """
    获取用户视频列表数据API
    支持分页、搜索和状态筛选
    """
    try:
        # 检查用户是否已登录
        if not session.get('user_id'):
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 获取请求参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        search_keyword = request.args.get('search', '').strip()
        status_filter = request.args.get('status', '').strip()
        user_id = session['user_id']
        
        # 计算分页偏移量
        offset = (page - 1) * page_size
        
        # 构建SQL查询
        base_sql = """
            SELECT a.id as book_id, a.book_name, a.book_status, a.video_type, a.createtime, 
                   b.id as video_id, b.videomerge_url, b.play_time, b.create_time, b.views, b.video_status 
            FROM ai_booklist a 
            LEFT JOIN ai_videomerge b ON a.id = b.book_id 
            WHERE a.user_id = %s
        """
        
        # 构建查询参数
        params = [user_id]
        
        # 添加搜索条件
        if search_keyword:
            base_sql += " AND (a.book_name LIKE %s OR a.video_type LIKE %s)"
            params.extend([f'%{search_keyword}%', f'%{search_keyword}%'])
        
        # 添加状态筛选条件
        if status_filter:
            if status_filter == '6':
                base_sql += " AND a.book_status = 6"
            elif status_filter == '1,2,3,4,5':
                base_sql += " AND a.book_status IN (1,2,3,4,5)"
            elif status_filter == '0':
                base_sql += " AND a.book_status = 0"
        
        # 获取总数
        count_sql = "SELECT COUNT(*) as total_count FROM (" + base_sql + ") as subquery"
        
        # 添加排序和分页
        base_sql += " ORDER BY a.id DESC LIMIT %s OFFSET %s"
        params.extend([page_size, offset])
        
        # 执行查询
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 获取总数
                cursor.execute(count_sql, params[:-2])  # 去掉LIMIT和OFFSET参数
                total_result = cursor.fetchone()
                total_count = total_result['total_count'] if total_result else 0
                
                # 获取数据
                cursor.execute(base_sql, params)
                videos = cursor.fetchall()
                
                # 处理视频数据
                processed_videos = []
                for video in videos:
                    # 处理视频类型显示
                    video_type_mapping = {
                        'theme-creative': '主题创意',
                        'subtitle-video': '字幕配音', 
                        'ai-reading': 'AI读书',
                        'poetry-analysis': '古诗词解析',
                        'children-book': '儿童绘本'
                    }
                    video_type_display = video_type_mapping.get(video['video_type'], video['video_type'])
                    
                    # 处理状态显示
                    status_mapping = {
                        0: {'text': '未处理', 'class': 'pending'},
                        1: {'text': '处理中', 'class': 'processing'},
                        2: {'text': '处理中', 'class': 'processing'},
                        3: {'text': '处理中', 'class': 'processing'},
                        4: {'text': '处理中', 'class': 'processing'},
                        5: {'text': '处理中', 'class': 'processing'},
                        6: {'text': '已完成', 'class': 'completed'}
                    }
                    status_info = status_mapping.get(video['book_status'], {'text': '未知', 'class': 'pending'})
                    
                    # 处理播放时长
                    play_time_display = '-'
                    if video['play_time']:
                        minutes = video['play_time'] // 60
                        seconds = video['play_time'] % 60
                        play_time_display = f"{minutes}分{seconds}秒"
                    
                    # 处理封面图片
                    cover_url = None
                    if video['videomerge_url']:
                        # 假设封面图片与视频文件同名但扩展名为.jpg
                        cover_url = video['videomerge_url'].replace('.mp4', '.jpg')
                    
                    processed_videos.append({
                        'id': video['video_id'],
                        'book_id': video['book_id'],
                        'book_name': video['book_name'],
                        'video_type': video_type_display,
                        'create_time': video['createtime'].strftime('%Y-%m-%d %H:%M') if video['createtime'] else '-',
                        'status': status_info['text'],
                        'status_class': status_info['class'],
                        'play_time': play_time_display,
                        'views': video['views'] or 0,
                        'cover_url': cover_url,
                        'video_url': video['videomerge_url'],
                        'can_play_download': video['book_status'] == 6,  # 只有已完成状态才能播放和下载
                        'video_status': video['video_status'],
                    })
                
                # 计算分页信息
                total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
                
                return jsonify({
                    'success': True,
                    'data': {
                        'videos': processed_videos,
                        'pagination': {
                            'current_page': page,
                            'page_size': page_size,
                            'total_count': total_count,
                            'total_pages': total_pages
                        }
                    }
                })
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f'获取视频列表失败: {str(e)}')
        return jsonify({'success': False, 'message': '获取视频列表失败，请稍后重试'}), 500

# 删除视频API
@user_myvideo_bp.route('/api/user/my-videos/delete', methods=['POST'])
def delete_video():
    """
    删除视频API
    """
    try:
        # 检查用户是否已登录
        if not session.get('user_id'):
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 获取视频ID
        video_id = request.json.get('video_id')
        book_id = request.json.get('book_id')

        print(video_id, book_id)
        # if not video_id:
        #     return jsonify({'success': False, 'message': '视频ID不能为空'}), 400
        
        # 验证视频是否属于当前用户
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 检查视频所有权
                # check_sql = """
                #     SELECT a.user_id, a.id as book_id
                #     FROM ai_booklist a 
                #     JOIN ai_videomerge b ON a.id = b.book_id 
                #     WHERE b.id = %s
                # """
                # cursor.execute(check_sql, (video_id,))
                # video_owner = cursor.fetchone()
                
                # if not video_owner or video_owner['user_id'] != session['user_id']:
                #     return jsonify({'success': False, 'message': '无权删除此视频'}), 403
                
                # 执行删除操作：视频表
                delete_sql = "DELETE FROM ai_videomerge WHERE id = %s"
                cursor.execute(delete_sql, (video_id,))
                
                # 删除ai_booklist表中的记录
                delete_sql2 = "DELETE FROM ai_booklist WHERE id = %s"
                cursor.execute(delete_sql2, (book_id,))
                
                # 删除ai_jobonline表中相关的记录
                sql2 = "DELETE FROM ai_jobonline WHERE book_id = %s"
                cursor.execute(sql2, (book_id,))
                
                # 删除ai_imageslist表中的记录
                sql3 = "DELETE FROM `ai_imageslist` WHERE book_id = %s"
                cursor.execute(sql3, (book_id,))
                
                # 删除ai_videolist表中的记录
                sql4 = "DELETE FROM `ai_videolist` WHERE book_id = %s"
                cursor.execute(sql4, (book_id,))
                
                # 删除ai_voicelist表中的记录
                sql6 = "DELETE FROM `ai_voicelist` WHERE book_id = %s"
                cursor.execute(sql6, (book_id,))
                
                # 删除ai_voicemerge表中的记录
                sql7 = "DELETE FROM `ai_voicemerge` WHERE book_id = %s"
                cursor.execute(sql7, (book_id,))
                
                # 提交事务
                connection.commit()      

                # 添加物理删除文件代码 
                # 确保book_id是字符串类型
                book_id_str = str(book_id)            
                # 获取应用根目录，确保路径的绝对引用
                app_root = os.path.dirname(os.path.abspath(__file__))       

                # 物理删除视频文件
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

                # 物理删除语音文件
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

                return jsonify({'success': True, 'message': '视频删除成功'})              
        finally:
            connection.close()
            
    except Exception as e:
        print(f'删除视频失败: {str(e)}')
        return jsonify({'success': False, 'message': '删除视频失败，请稍后重试'}), 500

@user_myvideo_bp.route('/api/user/my-videos/download')
def download_video():
    """
    下载视频API
    """
    try:
        # 检查用户是否已登录
        if not session.get('user_id'):
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 获取视频ID
        video_id = request.args.get('video_id')
        if not video_id:
            return jsonify({'success': False, 'message': '视频ID不能为空'}), 400
        
        # 验证视频是否属于当前用户且已完成
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 检查视频信息和所有权
                check_sql = """
                    SELECT a.user_id, b.videomerge_url, a.book_status, a.book_name
                    FROM ai_booklist a 
                    JOIN ai_videomerge b ON a.id = b.book_id 
                    WHERE b.id = %s
                """
                cursor.execute(check_sql, (video_id,))
                video_info = cursor.fetchone()
                
                if not video_info:
                    return jsonify({'success': False, 'message': '视频不存在'}), 404
                
                if video_info['user_id'] != session['user_id']:
                    return jsonify({'success': False, 'message': '无权下载此视频'}), 403
                
                if video_info['book_status'] != 6:
                    return jsonify({'success': False, 'message': '视频尚未完成，无法下载'}), 400
                
                if not video_info['videomerge_url']:
                    return jsonify({'success': False, 'message': '视频文件不存在'}), 404
                
                # 返回下载链接
                return jsonify({
                    'success': True,
                    'data': {
                        'download_url': video_info['videomerge_url'],
                        'filename': f"{video_info['book_name']}.mp4"
                    }
                })
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f'获取下载链接失败: {str(e)}')
        return jsonify({'success': False, 'message': '获取下载链接失败，请稍后重试'}), 500

@user_myvideo_bp.route('/api/user/my-videos/update-status', methods=['POST'])
def update_video_status():
    """
    更新视频公开状态API
    """
    try:
        # 检查用户是否已登录
        if not session.get('user_id'):
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 获取请求参数
        video_id = request.json.get('video_id')
        video_status = request.json.get('video_status')
        
        if not video_id:
            return jsonify({'success': False, 'message': '视频ID不能为空'}), 400
        
        # 验证video_status参数
        if video_status not in [0, 1]:
            return jsonify({'success': False, 'message': '无效的状态值'}), 400
        
        # 验证视频是否属于当前用户
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 检查视频所有权
                # check_sql = """
                #     SELECT a.user_id 
                #     FROM ai_booklist a 
                #     JOIN ai_videomerge b ON a.id = b.book_id 
                #     WHERE b.id = %s
                # """
                # cursor.execute(check_sql, (video_id,))
                # video_owner = cursor.fetchone()
                
                # if not video_owner:
                #     return jsonify({'success': False, 'message': '视频不存在'}), 404
                
                # if video_owner['user_id'] != session['user_id']:
                #     return jsonify({'success': False, 'message': '无权操作此视频'}), 403
                
                # 更新视频状态
                update_sql = """
                    UPDATE ai_videomerge 
                    SET video_status = %s 
                    WHERE id = %s
                """
                cursor.execute(update_sql, (video_status, video_id))
                connection.commit()
                
                return jsonify({'success': True, 'message': '视频状态更新成功'})
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f'更新视频状态失败: {str(e)}')
        return jsonify({'success': False, 'message': '更新视频状态失败，请稍后重试'}), 500