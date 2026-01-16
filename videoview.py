from flask import Blueprint, render_template, request, jsonify
from common import get_db_connection, db_config
import time
from datetime import datetime, timedelta

videoview_bp = Blueprint('videoview', __name__)

@videoview_bp.route('/videoview')
def videoview():
    # 获取视频ID参数
    video_id = request.args.get('id')
    if not video_id or not video_id.isdigit():
        return render_template('v2/error.html', message='无效的视频ID'), 400
    
    # 查询视频详情数据
    video_data = get_video_detail(video_id)
    if not video_data:
        return render_template('v2/error.html', message='视频不存在或已被删除'), 404
    
    # 查询同类型视频推荐
    recommended_videos = get_recommended_videos(video_data['video_type_value'], video_id)
    
    return render_template('v2/videoview.html', video=video_data, recommended_videos=recommended_videos)

def get_video_detail(video_id):
    conn = None
    try:
        # 获取数据库连接
        conn = get_db_connection()
        cursor = conn.cursor()
          
        # 更新播放次数
        update_views(video_id, conn, cursor)
              
        # 执行查询
        sql = '''
        SELECT a.id, a.videomerge_url, a.videocover_url, a.bilibili_url, a.create_time, 
               a.user_id, a.views, a.play_time, b.nickname, b.avatar, 
               c.book_content, c.video_type, c.video_aspect, c.video_voice, 
               c.video_music, c.sdxl_prompt_styler, c.book_note
        FROM ai_videomerge a 
        LEFT JOIN ai_user b ON a.user_id = b.id 
        LEFT JOIN ai_booklist c ON a.book_id = c.id
        WHERE a.id = %s
        '''
        cursor.execute(sql, (video_id,))
        video = cursor.fetchone()
        
        if not video:
            return None
        
        # 格式化数据
        formatted_video = {
            'id': video['id'],
            'videomerge_url': video['videomerge_url'],
            'videocover_url': video['videocover_url'] or 'static/images/videocover.jpg',
            'bilibili_url': video['bilibili_url'] or '',
            'create_time': format_time_difference(video['create_time']),
            'views': video['views'] or 0,
            'play_time': format_play_time(video['play_time'] or 0),
            'nickname': video['nickname'] or '未知用户',
            'avatar': video['avatar'] or 'static/images/avatar.png',
            'book_content': truncate_content((video['book_content'] or '').replace('\n', '<br>'), 1000),
            'book_note': truncate_content(video['book_note'] or '', 200),
            'video_type': get_video_type_display(video['video_type']),
            'video_type_value': video['video_type'],
            'video_aspect': video['video_aspect'] or '16:9',
            'video_voice': get_video_voice_display(video['video_voice']),
            'video_voice_value': video['video_voice'],
            'video_music': get_video_music_display(video['video_music']),
            'video_music_value': video['video_music'],
            'video_style': get_video_style_display(video['sdxl_prompt_styler']),
            'video_style_value': video['sdxl_prompt_styler']
        }
        
        return formatted_video
        
    except Exception as e:
        print(f"查询视频详情失败: {e}")
        return None
    finally:
        if conn:
            conn.close()

def update_views(video_id, conn, cursor):
    try:
        update_sql = "UPDATE ai_videomerge SET views = views + 1 WHERE id = %s"
        cursor.execute(update_sql, (video_id,))
        conn.commit()
    except Exception as e:
        print(f"更新播放次数失败: {e}")
        conn.rollback()

def format_time_difference(create_time):
    """格式化时间差显示"""
    if isinstance(create_time, str):
        create_time = datetime.strptime(create_time, '%Y-%m-%d %H:%M:%S')
    
    now = datetime.now()
    diff = now - create_time
    
    # 小于1天
    if diff < timedelta(days=1):
        return '今天'
    # 小于2天
    elif diff < timedelta(days=2):
        return '1天前'
    # 小于7天
    elif diff < timedelta(days=7):
        return f'{diff.days}天前'
    # 小于30天
    elif diff < timedelta(days=30):
        weeks = diff.days // 7
        return f'{weeks}周前'
    # 小于365天
    elif diff < timedelta(days=365):
        months = diff.days // 30
        return f'{months}月前'
    # 大于1年显示实际日期
    else:
        return create_time.strftime('%Y-%m-%d')

def format_play_time(seconds):
    """将秒转换为分秒格式"""
    minutes = seconds // 60
    remaining_seconds = seconds % 60
    return f'{minutes:02d}分{remaining_seconds:02d}秒'

def truncate_content(content, max_length):
    """截取内容到指定长度"""
    if len(content) <= max_length:
        return content
    return content[:max_length] + '...'

def get_video_type_display(video_type):
    """获取视频类型的显示名称"""
    type_map = {
        'theme-creative': '主题创意',
        'subtitle-video': '字幕配音',
        'ai-reading': 'AI读书',
        'poetry-analysis': '古诗词解析',
        'children-book': '儿童绘本'
    }
    return type_map.get(video_type, '未知类型')

def get_video_voice_display(video_voice):
    """获取字幕配音的显示名称"""
    voice_map = {
        'none': '无配音',
        'afei.mp3': '阿飞',
        'awei.mp3': '阿伟',
        'aze.mp3': '阿哲',
        'nana.mp3': '娜娜',
        'lili.mp3': '莉莉',
        'wenjun.mp3': '文君',
        'JackMa_mayun.mp3': 'JackMa'
    }
    return voice_map.get(video_voice, '未知配音')

def get_video_music_display(video_music):
    """获取背景音乐的显示名称"""
    music_map = {
        'none': '无背景音乐',
        '1-relaxing.mp3': '轻松愉悦',
        '2-inspiring.mp3': '励志激昂',
        '3-emotional.mp3': '情感深沉',
        '4-upbeat.mp3': '欢快活泼',
        '5-cinematic.mp3': '电影感',
        '6-electronic.mp3': '电子音乐'
    }
    return music_map.get(video_music, '未知音乐')

def get_video_style_display(style):
    """获取视频风格的显示名称"""
    style_map = {
        'sai-动漫风格': '卡通风格',
        'sai-胶片摄影': '写实风格',
        'misc-极简主义': '极简风格',
        'artstyle-迷幻艺术': '奇幻风格',
        'sai-电影感': '电影风格',
        'futuristic-科幻': '科幻风格',
        'artstyle-水彩画': '水彩风格',
        'sai-3D模型': '3D风格'
    }
    return style_map.get(style, '未知风格')

def get_recommended_videos(video_type, current_video_id):
    """
    获取同类型视频推荐
    
    Args:
        video_type: 视频类型
        current_video_id: 当前视频ID，用于排除当前视频
    
    Returns:
        list: 推荐视频列表
    """
    conn = None
    try:
        # 获取数据库连接
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 执行查询，获取同类型播放数最多的10条记录
        sql = '''
        SELECT a.id, a.videocover_url, a.views, b.book_name, b.sdxl_prompt_styler 
        FROM ai_videomerge a 
        LEFT JOIN ai_booklist b ON a.book_id = b.id 
        WHERE b.video_type = %s 
          AND a.id != %s 
          AND b.book_name IS NOT NULL 
          AND b.book_name <> '' 
          and a.video_status = 1
        ORDER BY a.views DESC 
        LIMIT 10
        '''
        cursor.execute(sql, (video_type, current_video_id))
        videos = cursor.fetchall()
        
        # 格式化数据
        formatted_videos = []
        for video in videos:
            formatted_video = {
                'id': video['id'],
                'videocover_url': video['videocover_url'] or 'static/images/videocover.jpg',
                'views': video['views'] or 0,
                'video_style': get_video_style_display(video['sdxl_prompt_styler']),
                'book_name': video['book_name'] or '未知视频'
            }
            formatted_videos.append(formatted_video)
        
        return formatted_videos
        
    except Exception as e:
        print(f"查询推荐视频失败: {e}")
        return []
    finally:
        if conn:
            conn.close()