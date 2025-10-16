import requests
import tempfile
import os
import requests
import cv2
from moviepy import VideoFileClip, concatenate_videoclips, TextClip, CompositeVideoClip, AudioFileClip, vfx
from datetime import datetime


def download_file(url, file_type="video"):
    """
    下载文件到临时目录
    
    参数:
    url: 文件URL地址
    file_type: 文件类型（video/audio），用于日志显示
    
    返回:
    local_path: 下载到本地的临时文件路径
    """
    try:
        # 创建临时文件
        temp_dir = tempfile.gettempdir()
        
        # 从URL中提取文件名
        if 'filename=' in url:
            filename = os.path.basename(url.split('filename=')[-1])
        else:
            # 对于音频文件，从路径中提取文件名
            filename = os.path.basename(url)
            if '?' in filename:
                filename = filename.split('?')[0]
        
        local_path = os.path.join(temp_dir, filename)
        
        # 下载文件
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"{file_type}文件下载完成: {url} -> {local_path}")
        return local_path
        
    except Exception as e:
        print(f"{file_type}文件下载失败 {url}: {str(e)}")
        raise


def process_videos(video_urls, title_txt, author_txt, texts, video_aspect, time_data, book_id, audio_url):
    """
    视频合成函数
    
    参数:
    video_urls: 视频文件URL数组
    title_txt: 标题    
    author_txt: 作者
    texts: 字幕文本数组
    video_aspect: 视频宽高比（16:9/9:16/4:3/3:4）
    time_data: 字幕时间数据数组，包含start_time和duration
    book_id: 书单ID
    audio_url: 音频文件URL 
    
    返回:
    tuple: (video_filename, cover_filename) - 生成后的视频路径+文件名和封面图片路径+文件名
    """
    
    # 加载所有视频片段
    print("加载视频片段...")
    clips = []
    local_paths = []  # 保存本地文件路径用于后续清理
    
    for vf in video_urls:
        try:
            # 先下载视频到本地
            local_path = download_file(vf, "视频")
            local_paths.append(local_path)
            
            # 加载本地视频文件
            clips.append(VideoFileClip(local_path))
            print(f"已加载视频片段: {local_path}")
            
        except Exception as e:
            print(f"加载视频失败 {vf}: {str(e)}")
            raise
    
    print(f"已加载视频片段：{len(clips)}")
    
    # 合并视频
    final_clip = concatenate_videoclips(clips)

    # 创建标题文本片段（带滑入动画）
    title_clip = TextClip(
        text=title_txt,
        font="static/font/Alibaba-PuHuiTi-Bold.ttf",
        font_size=42, 
        size=(480,300),
        color='#FFB600',
        # bg_color='red',
        stroke_color='#000000',
        stroke_width=2,
        text_align='center',
        method='caption'
    )
    
    # 定义标题滑入动画函数
    def title_position(t):
        # 动画持续时间（秒）
        anim_duration = 0.3
        
        if t < anim_duration:
            # 从底部开始向上滑动
            start_y = 50  # 初始位置（方框底部）
            end_y = 0      # 结束位置（方框顶部）
            progress = t / anim_duration  # 动画进度（0到1）
            current_y = start_y - (start_y - end_y) * progress
            return ('center', current_y)
        else:
            # 动画结束后保持在顶部位置
            return ('center', 0)
    
    title_clip = (title_clip
                  .with_position(title_position)  # 应用动画函数
                  .with_start(0.6)  # 开始时间600ms
                  .with_duration(2.2))  # 显示时长2.2秒

    # 创建作者文本片段
    author_clip = TextClip(
        text=author_txt,
        font="static/font/Alibaba-PuHuiTi-Bold.ttf",
        font_size=30, 
        size=(300,450),  
        color='#FFB600',
        # bg_color='#eeeeee',
        stroke_color='#000000',
        stroke_width=2,
        text_align='center',
        method='caption'
    )
    author_clip = (author_clip
                   .with_position(title_position)  # 应用动画函数
                   .with_start(0.8)  # 开始时间800ms
                   .with_duration(2.0))  # 显示时长2.0秒

    # 添加字幕
    subtitle_clips = []
    for i, (text, time_info) in enumerate(zip(texts, time_data)):
        # 将毫秒转换为秒
        start_time_sec = time_info["start_time"] / 1000.0
        duration_sec = time_info["duration"] / 1000.0
        
        txt_clip = TextClip(
            text=text,
            font="static/font/Alibaba-PuHuiTi-Medium.ttf",
            font_size=21, 
            size=(420,160),
            color='#FFB600',
            stroke_color='#000000',
            stroke_width=2,
            text_align='center',
            method='caption'
        )
        
        # 设置字幕位置和时间
        txt_clip = (txt_clip
                   .with_position(('center', 'bottom'))
                   .with_start(start_time_sec)
                   .with_duration(duration_sec))
        
        subtitle_clips.append(txt_clip)
    
    # 组合视频和所有文本元素
    video_with_text = CompositeVideoClip([final_clip, title_clip, author_clip] + subtitle_clips)
    
    # 添加音频
    try:
        # 加载本地音频文件， audio_url = /static/uploads/voicemerge/merged_109_190152.wav
        audio_local_path = os.path.join(os.getcwd(), audio_url.lstrip('/'))
        audio_clip = AudioFileClip(audio_local_path)
        final_video = video_with_text.with_audio(audio_clip)
        print(f"已加载音频文件: {audio_local_path}")        
    except Exception as e:
        print(f"加载音频失败 {audio_local_path}: {str(e)}")
        raise
    
    # 获取音频时长并限制视频长度
    audio_duration = audio_clip.duration  # 获取音频时长（秒）
    final_video = final_video.with_duration(audio_duration)
    
    # 输出处理后的视频
    now = datetime.now()
    num = now.strftime("%H%M%S")
    output_dir = "static/uploads/videomerge"
    video_filename = f"{output_dir}/video_{book_id}_{num}.mp4"
    output_filename = os.path.join(os.getcwd(), video_filename)

    # 处理分辨率 video_aspect
    if video_aspect == '16:9':
        final_video = final_video.with_effects([vfx.Resize((1920, 1080))]) 
    elif video_aspect == '9:16':
        final_video = final_video.with_effects([vfx.Resize((1080, 1920))]) 
    elif video_aspect == '4:3':
        final_video = final_video.with_effects([vfx.Resize((1920, 1440))]) 
    elif video_aspect == '3:4':
        final_video = final_video.with_effects([vfx.Resize((1440, 1920))]) 
    
    # 写入视频文件
    final_video.write_videofile(output_filename, codec='libx264', audio_codec='aac') 

    # 在函数最后添加清理代码
    try:
        # 删除临时下载的文件
        for local_path in local_paths:
            if os.path.exists(local_path):
                os.remove(local_path)
                print(f"已清理临时文件: {local_path}")
    except Exception as e:
        print(f"清理临时文件时出错: {str(e)}")
    
    # 提取视频第一帧作为封面图片
    cover_filename = video_filename.rsplit('.', 1)[0] + '.jpg'
    # 使用正确的输出目录路径
    cover_output_dir = os.path.join(os.getcwd(), 'static', 'uploads', 'videomerge')
    if not os.path.exists(cover_output_dir):
        os.makedirs(cover_output_dir)
    cover_output_filename = os.path.join(cover_output_dir, os.path.basename(cover_filename))
    
    # 保存第一帧为图片
    try:
        # 从视频的第0秒提取一帧
        # 使用opencv来确保正确处理图像格式（避免RGBA转JPEG错误）
        
        # 获取视频帧数据
        temp_frame = final_video.get_frame(0)
        # 检查是否有alpha通道（RGBA）
        if temp_frame.shape[-1] == 4:
            # 转换为RGB模式
            temp_frame = cv2.cvtColor(temp_frame, cv2.COLOR_RGBA2RGB)
        # 保存为JPEG格式
        # 确保路径存在
        if not os.path.exists(os.path.dirname(cover_output_filename)):
            os.makedirs(os.path.dirname(cover_output_filename))
        # 使用cv2.IMWRITE_JPEG_QUALITY参数确保保存质量
        success = cv2.imwrite(cover_output_filename, cv2.cvtColor(temp_frame, cv2.COLOR_RGB2BGR), 
                            [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if success:
            print(f"封面图片保存完成: {cover_output_filename}")
        else:
            print(f"cv2.imwrite返回失败，无法保存封面图片到: {cover_output_filename}")
            cover_filename = None
    except Exception as e:
        print(f"保存封面图片失败: {str(e)}")
        # 如果保存封面失败，使用None表示
        cover_filename = None
    
    print(f"视频合成完成，保存路径: {output_filename}")
    # 返回视频文件名和封面图片文件名
    return video_filename, cover_filename
