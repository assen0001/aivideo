import requests
import tempfile
import os
import cv2
from moviepy import VideoFileClip, concatenate_videoclips, TextClip, CompositeVideoClip, AudioFileClip, vfx
from datetime import datetime
import re

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

# 视频合成函数
def process_videos(video_urls, title_txt, author_txt, texts, video_aspect, time_data, book_id, audio_url, vip_code):
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
            print(f"开始下载视频: {vf}")
            local_path = download_file(vf, "视频")
            print(f"视频下载完成: {local_path}")
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
    guid_pattern = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
    watermark_clip = TextClip(
        text="aivideo.site",
        font="static/font/Alibaba-PuHuiTi-Medium.ttf",
        font_size=18, 
        size=(150,60),  
        color='white',
        transparent=True,
        # bg_color='#eeeeee',
        # stroke_color='#000000',
        # stroke_width=2,
        text_align='left',
        method='caption'
    )
    watermark_clip = watermark_clip.with_position(('right', 'top')).with_start(0)

    subtitle_clips = []
    for i, (text, time_info) in enumerate(zip(texts, time_data)):
        start_time_sec = time_info["start_time"] / 1000.0
        duration_sec = time_info["duration"] / 1000.0
        
        txt_clip = TextClip(
            text=text,
            font="static/font/Alibaba-PuHuiTi-Medium.ttf",
            font_size=21, 
            size=(320, 160) if video_aspect == '9:16' else (420, 160),
            color='#FFB600',
            stroke_color='#000000',
            stroke_width=2,
            text_align='center',
            method='caption'
        )
        
        txt_clip = (txt_clip
                   .with_position(('center', 'bottom'))
                   .with_start(start_time_sec)
                   .with_duration(duration_sec))
        subtitle_clips.append(txt_clip)
        
    if not vip_code or not guid_pattern.match(vip_code):
        video_with_text = CompositeVideoClip([final_clip, watermark_clip] + subtitle_clips)
    else:
        video_with_text = CompositeVideoClip([final_clip] + subtitle_clips)
    
    if audio_url:
        try:
            audio_local_path = os.path.join(os.getcwd(), audio_url.lstrip('/'))
            audio_clip = AudioFileClip(audio_local_path)
            final_video = video_with_text.with_audio(audio_clip)
            audio_duration = audio_clip.duration
            final_video = final_video.with_duration(audio_duration)
            print(f"已加载音频文件: {audio_local_path}")        
        except Exception as e:
            print(f"加载音频失败 {audio_local_path}: {str(e)}")
            raise
    else:
        final_video = video_with_text.with_duration(final_clip.duration)


    now = datetime.now()
    num = now.strftime("%H%M%S")
    output_dir = "static/uploads/videomerge"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
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

    # 提取视频第一帧作为封面图片
    cover_filename = video_filename.rsplit('.', 1)[0] + '.jpg'
    # 使用正确的输出目录路径
    cover_output_dir = os.path.join(os.getcwd(), 'static', 'uploads', 'videomerge')
    if not os.path.exists(cover_output_dir):
        os.makedirs(cover_output_dir)
    cover_output_filename = os.path.join(cover_output_dir, os.path.basename(cover_filename))
    
    # 保存第一帧为封面图片
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

    # 定义资源释放函数，确保所有资源都能被正确释放
    def release_resources():
        # 确保final_video对象被正确关闭以释放资源
        if 'final_video' in locals():
            try:
                final_video.close()
                print("已关闭final_video对象，释放资源")
            except Exception as close_error:
                print(f"关闭final_video对象时出错: {str(close_error)}")
        # 确保audio_clip对象被正确关闭
        if 'audio_clip' in locals():
            try:
                audio_clip.close()
                print("已关闭audio_clip对象，释放资源")
            except Exception as close_error:
                print(f"关闭audio_clip对象时出错: {str(close_error)}")
        # 关闭所有加载的视频片段
        for clip in clips:
            try:
                clip.close()
            except Exception as close_error:
                print(f"关闭视频片段时出错: {str(close_error)}")
        # 清理临时文件
        try:
            if os.path.exists('temp_audio.m4a'):
                os.remove('temp_audio.m4a')
                print("已清理临时音频文件")
        except Exception as e:
            print(f"清理临时音频文件时出错: {str(e)}")

    # 写入视频文件，添加更多优化参数和错误处理
    retry_count = 0
    max_retries = 2  # 最多重试2次
    success = False
    
    while retry_count <= max_retries and not success:
        try:
            # 确保输出目录存在并检查权限
            output_dir = os.path.dirname(output_filename)
            if not os.path.exists(output_dir):
                os.makedirs(output_dir, exist_ok=True)
                print(f"已创建输出目录: {output_dir}")
            
            # 检查磁盘空间是否足够（简单检查）
            free_space = os.statvfs(output_dir).f_bavail * os.statvfs(output_dir).f_frsize if hasattr(os, 'statvfs') else 0
            if free_space > 0 and free_space < 100 * 1024 * 1024:  # 检查是否有至少100MB空闲空间
                print(f"警告: 磁盘空间不足，仅剩余{free_space/1024/1024:.2f}MB")
            
            # 优化视频写入参数，提高稳定性和减少资源消耗
            final_video.write_videofile(
                output_filename, 
                codec='libx264', 
                audio_codec='aac',
                threads=2,              # 减少线程数以避免资源竞争
                preset='medium',        # 使用更稳定的预设
                ffmpeg_params=[
                    '-crf', '24',       # 稍高的质量因子，降低编码压力
                    '-g', '25',         # 更合理的GOP大小
                    '-sc_threshold', '0', # 场景切换阈值
                    '-max_muxing_queue_size', '1024', # 增加队列大小避免缓冲问题
                    '-bufsize', '2M',    # 设置缓冲区大小
                    '-fflags', '+nobuffer', # 减少缓冲区使用
                    '-probesize', '32',  # 减少初始探测大小
                    '-analyzeduration', '0' # 减少分析时间
                ],
                logger='bar',           # 使用进度条显示
                temp_audiofile='temp_audio.m4a', # 使用临时音频文件减轻内存压力
                remove_temp=True,       # 移除临时文件
                write_logfile=False     # 不写入日志文件
            )
            print(f"视频文件写入成功: {output_filename}")
            success = True
            
        except BrokenPipeError as e:
            retry_count += 1
            print(f"视频写入过程中出现Broken pipe错误 (重试 {retry_count}/{max_retries}): {str(e)}")
            print("这可能是由于FFmpeg进程崩溃或资源不足导致")
            # 释放资源后重试
            release_resources()
            if retry_count > max_retries:
                print("已达到最大重试次数，视频写入失败")
                raise
            else:
                print(f"{5*retry_count}秒后重试...")
                import time
                time.sleep(5 * retry_count)  # 指数退避策略
        
        except MemoryError as e:
            print(f"内存不足错误: {str(e)}")
            print("尝试释放内存并退出")
            release_resources()
            raise
            
        except Exception as e:
            print(f"视频写入失败: {str(e)}")
            # 详细记录错误类型
            print(f"错误类型: {type(e).__name__}")
            # 尝试释放资源
            release_resources()
            raise
    
    # 最终确保所有资源被释放
    release_resources()

    # 在函数最后添加清理代码
    try:
        # 删除临时下载的文件
        for local_path in local_paths:
            if os.path.exists(local_path):
                os.remove(local_path)
                print(f"已清理临时文件: {local_path}")
    except Exception as e:
        print(f"清理临时文件时出错: {str(e)}")

    
    print(f"视频合成完成，保存路径: {output_filename}")
    # 返回视频文件名和封面图片文件名
    return video_filename, cover_filename, final_video.duration
