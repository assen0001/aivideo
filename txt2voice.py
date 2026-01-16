from flask import Blueprint, request, jsonify, render_template, session
from common import get_db_connection, db_config
from datetime import datetime
from gradio_client import Client, handle_file
import os
import shutil
from pydub import AudioSegment

txt2voice_bp = Blueprint('txt2voice', __name__)

@txt2voice_bp.route('/txt2voice')
def txt2voice():
    return render_template('txt2voice.html')

# 获取字幕内容
@txt2voice_bp.route('/get_subtitle_content', methods=['GET'])
def get_subtitle_content():
    book_id = request.args.get('book_id')
    if not book_id:
        return jsonify({'error': 'book_id参数缺失'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT paragraph_initial
            FROM ai_imageslist
            WHERE book_id = %s
            ORDER BY id
        """, (book_id,))
        results = cursor.fetchall()
        if not results:
            return jsonify({'error': f'找不到book_id={book_id}的内容'}), 404

        paragraphs = [row['paragraph_initial'] for row in results]
        return jsonify({'paragraph_initial': '\\n'.join(paragraphs)})
    except Exception as e:
        print(f"Error fetching subtitle content: {str(e)}")
        print(f"Query parameters: book_id={book_id}")
        return jsonify({
            'error': f"数据库查询失败: {str(e)}",
            'details': f"查询参数: book_id={book_id}"
        }), 500
    finally:
        cursor.close()
        conn.close()

# 更新语音 是否选中状态
@txt2voice_bp.route('/update_voice_status', methods=['POST'])
def update_voice_status():
    data = request.get_json()
    if not data or 'voice_id' not in data or 'status' not in data:
        return jsonify({'error': '参数缺失'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE ai_voicemerge 
            SET voice_status = %s 
            WHERE id = %s
        """, (data['status'], data['voice_id']))
        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        print(f"Error updating voice status: {str(e)}")
        return jsonify({'error': f"更新失败: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

# 获取生成语音列表
@txt2voice_bp.route('/get_voice_list', methods=['GET'])
def get_voice_list():
    book_id = request.args.get('book_id')
    if not book_id:
        return jsonify({'error': 'book_id参数缺失'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, voice_url, create_time, voice_status
            FROM ai_voicemerge
            WHERE book_id = %s
            ORDER BY id DESC
        """, (book_id,))
        results = cursor.fetchall()
        return jsonify([dict(row) for row in results])
    except Exception as e:
        print(f"Error fetching voice list: {str(e)}")
        return jsonify({'error': f"数据库查询失败: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

# 删除生成语音
@txt2voice_bp.route('/delete_voice', methods=['POST'])
def delete_voice():
    data = request.get_json()
    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '请升级VIP会员，才能进行此操作！'}), 403

    if not data or 'voice_id' not in data:
        return jsonify({'error': 'voice_id参数缺失'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 先查询语音文件的保存路径
        cursor.execute("""SELECT voice_url FROM ai_voicemerge WHERE id = %s""", (data['voice_id'],))
        result = cursor.fetchone()
        
        if result:
            voice_path = result.get('voice_url')
            
            # 物理删除语音文件
            if voice_path and os.path.exists(voice_path):
                try:
                    os.remove(voice_path)
                    print(f"成功删除语音文件: {voice_path}")
                except Exception as e:
                    print(f"删除语音文件失败: {str(e)}")

        cursor.execute("""
            DELETE FROM ai_voicemerge WHERE id = %s
        """, (data['voice_id'],))
        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        print(f"Error deleting voice: {str(e)}")
        return jsonify({'error': f"删除失败: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

# index-tts文本生成语音后台功能实现
@txt2voice_bp.route('/txt2voice_create', methods=['POST'])
def create_book_tts():
    print(f"Request received: {request.get_json()}")
    # 判断是否为VIP会员
    # vip = session.get('vip', 0)
    # if vip == 0:
    #     return jsonify({'status': 'error', 'message': '请升级VIP会员，才能进行此操作！'}), 403

    try:
        # 从POST请求体中获取参数
        data = request.get_json()
        book_id = data.get('book_id')   # 书单编号
        speaker_wav = data.get('speaker_wav', "none")  # 配音音色 默认应为none
        # speed = data.get('speed', 1.2)   # 默认语速 1.2
        music_wav = data.get('music_wav', "none")  # 默认背景音乐 none
        
        # 获取数据库连接
        connection = get_db_connection()

        # 没有字幕配音情况，直接更新.book_status为3
        # if speaker_wav == "none":
        #     speaker_wav = "JackMa_mayun.mp3"
        # 执行UPDATE `ai_booklist` SET `book_status`='3' WHERE (`id`='156') 并返回更新结果
        if speaker_wav == "none":
            with connection.cursor() as cursor:
                sql = "UPDATE `ai_booklist` SET `book_status`='3' WHERE (`id`=%s)"
                cursor.execute(sql, (book_id,))
                connection.commit()
                print(f'book_id={book_id} 没有字幕配音，直接更新.book_status为3')
                return jsonify({"message": "success", "book_id": book_id})
        
        # 执行查询字幕文本
        with connection.cursor() as cursor:
            sql = "SELECT id,paragraph_initial from ai_imageslist WHERE book_id = %s"
            cursor.execute(sql, (book_id,))
            results = cursor.fetchall()
        
        # 提取id和paragraph_initial到数组（二维数据）
        paragraph_array = [
            {'id': row['id'], 'paragraph_initial': row['paragraph_initial']} 
            for row in results if row['paragraph_initial']
        ]
        
        if not paragraph_array:
            return jsonify({"error": "未找到书单内容"}), 404
        else:
            print(f'paragraph_array length is: {len(paragraph_array)}')

        print(f'request.base_url is: {request.base_url}')        
        if 'x-gpu.com' in request.base_url:
            speaker_wav = "https://aivideo.site/static/speaker/" + speaker_wav  # 音色文件
        else:
            speaker_wav = db_config['AIVIDEO_URL'] + "/static/speaker/" + speaker_wav  # 音色文件

        # 输出语音文件目录
        wav_dir = "static/uploads/voicemerge"
        if not os.path.exists(wav_dir):
            os.makedirs(wav_dir)
        
        # 调用TTS函数
        print('开始生成单个语音文件...')
        text_to_speech_multiple(
            book_id=book_id,
            texts=paragraph_array,
            speaker_wav=speaker_wav,
            wav_dir=wav_dir,
        )
        
        # 合并所有语音文件
        now = datetime.now()
        num = now.strftime("%H%M%S")
        merged_filename = f"{wav_dir}/merged_{book_id}_{num}.wav"     # 合成的语音文件
        
        # 合并语音文件
        print('开始合并语音文件...')
        merge_wav_with_metadata(
            wav_dir,
            output_file=merged_filename,
            book_id=book_id,
            silence_duration=200    # 段落间隔，注意：须跟N8N中调用comfyui图生视频的时长计算量保持一至
        )
        
        print('index-tts操作完成')
        return jsonify({
            "message": "success",
            "book_id": book_id
        })
        
    except Exception as e:
        # 更新在线任务状态为已失败-4
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE ai_jobonline SET job_status='4', stop_time=NOW() WHERE job_type = 0
            """)
            connection.commit()

        return jsonify({"error": str(e)}), 500
    finally:
        if 'connection' in locals():
            connection.close()


# index-tts -- 单件字幕文本生成语音后台功能实现
def text_to_speech_multiple(book_id, texts, speaker_wav, wav_dir):
    print(f'book_id is: {book_id}')
    # print(f'texts is: {texts}')
    print(f'speaker_wav is: {speaker_wav}')
    print(f'wav_dir is: {wav_dir}')

    # 初始化Client
    if 'x-gpu.com' in request.base_url:
        client = Client("http://127.0.0.1:7860")
    else:
        client = Client(db_config['INDEXTTS_URL'])
    print(f'index-tts 开始处理 {len(texts)} 个段落')
    for i, text_data in enumerate(texts, 1):
        print(f'1. paragraph_initial is: {text_data["paragraph_initial"]}')
        # print(f'i is: {i}')

        if text_data['paragraph_initial'].strip():  # 如果文本不为空 
            # print(f'2. paragraph_initial is: {text_data["paragraph_initial"]}')

            # Run TTS运行
            result = client.predict(
                    emo_control_method="与音色参考音频相同",    # Literal['与音色参考音频相同', '使用情感参考音频', '使用情感向量控制'] Same as the voice reference
                    prompt=handle_file(speaker_wav),        # 音色参考音频
                    text=text_data['paragraph_initial'],    # 文本
                    emo_ref_path=None,  # 上传情感参考音频
                    emo_weight=0.8,     # 情感权重，0-1之间，0为不使用情感控制，1为完全使用情感控制
                    vec1=0,             # 喜
                    vec2=0,             # 怒
                    vec3=0,             # 哀
                    vec4=0,             # 惧
                    vec5=0,             # 厌恶
                    vec6=0,             # 低落
                    vec7=0,             # 惊喜
                    vec8=0,             # 平静
                    emo_text="",        # 情感描述文本
                    emo_random=False,   # 是否随机情感
                    max_text_tokens_per_segment=120,    # 分句最大Token数
                    param_16=True,      # do_sample
                    param_17=0.8,       # top_p
                    param_18=30,        # top_k
                    param_19=0.8,       # temperature
                    param_20=0,         # length_penalty
                    param_21=3,         # num_beams
                    param_22=10,        # repetition_penalty
                    param_23=1500,      # max_mel_tokens
                    api_name="/gen_single"
            )              
            print(result)

            # 保存语音文件
            if result and result['value']:
                # 从result['value']中提取文件名
                voice_path = result['value']
                print(f'voice_path is-1: {voice_path}')

                # 构建目标路径+文件名, 文件名格式：voice_{book_id}_{images_id}.wav
                voice_filename = f"voice_{book_id}_{text_data['id']}.wav"  
                target_path = os.path.join(wav_dir, voice_filename)
                
                try:
                    # 复制文件并保留元数据
                    shutil.copy2(voice_path, target_path)
                except Exception as e:
                    print(f'复制文件 {voice_path} 到 {target_path} 时出错: {e}')
                    continue

    print(f'生成语音文件完成，共生成 {i} 个文件')


# 合并wav文件并生成元数据文件
def merge_wav_with_metadata(wav_dir, output_file,  book_id, silence_duration):
    # 获取所有wav文件，只读取以voice_{book_id}开头的文件
    wav_files = [f for f in os.listdir(wav_dir) if f.lower().endswith('.wav') and f.startswith(f'voice_{book_id}_')]
    wav_files.sort()  # 按文件名排序
    
    if not wav_files:
        print("目录中没有找到wav文件")
        return
    
    print(f"找到 {len(wav_files)} 个wav文件")
    
    # 创建一个空的AudioSegment对象
    combined = AudioSegment.silent(duration=0)
    
    # 记录每个片段的信息
    segments_info = []
    
    # 逐个添加文件
    for i, wav_file in enumerate(wav_files):
        file_path = os.path.join(wav_dir, wav_file)
        print(f"正在处理: {wav_file}")
        
        # 加载音频文件
        audio = AudioSegment.from_wav(file_path)

        # 如果不是最后一个文件，添加静音
        if i < len(wav_files) - 1:
            silence = AudioSegment.silent(duration=silence_duration)
            combined += silence            
        
        # 记录片段信息（从文件名中提取images_id）
        image_id = int(wav_file.split('_')[-1].split('.')[0])

        # 记录片段信息
        segments_info.append({
            'filename': wav_file,
            'image_id': image_id,
            'start_time': len(combined),
            'duration': len(audio),
            'end_time': len(combined) + len(audio)
        })
        
        # 添加到合并后的音频中
        combined += audio
    
    # 导出合并后的文件
    print(f"正在保存合并后的文件: {output_file}")
    combined.export(output_file, format="wav")
    
    # 先判断是否已经存在该书单语音的元数据，如果有就删除它们
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 查询是否存在该book_id的数据
            select_sql = "SELECT id FROM `ai_voicelist` WHERE `book_id` = %s"
            cursor.execute(select_sql, (book_id,))
            result = cursor.fetchone()
            
            # 如果存在数据，则删除
            if result:
                delete_sql = "DELETE FROM `ai_voicelist` WHERE `book_id` = %s"
                cursor.execute(delete_sql, (book_id,))
            
            # 插入到ai_voicelist表
            for info in segments_info:
                sql = "INSERT INTO `ai_voicelist` (`book_id`, `images_id`, `voice_filename`, `start_time`, `duration`, `end_time`) VALUES (%s, %s, %s, %s, %s, %s)"
                cursor.execute(sql, (book_id, info['image_id'], info['filename'], info['start_time'], info['duration'], info['end_time']))
            
            # 插入到ai_voicemerge表
            sql = "INSERT INTO `ai_voicemerge` (`book_id`, `voice_url`) VALUES (%s, %s)"
            cursor.execute(sql, (book_id, output_file))

            # 更新ai_booklist表,更新书单状态为3（已字幕转语音）
            update_sql = "UPDATE `ai_booklist` SET `book_status`='3' WHERE (`id`=%s)"
            cursor.execute(update_sql, (book_id,))
        
            connection.commit()
            connection.close()
            print("数据库记录写入完成!")     

            # 物理删除单个语音文件
            for wav_file in wav_files:
                file_path = os.path.join(wav_dir, wav_file)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        print(f"成功删除单个语音文件: {file_path}")
                    except Exception as e:
                        print(f"删除单个语音文件失败: {str(e)}")
    except Exception as e:
        print(f"数据库写入失败: {str(e)}")
        raise
    
    print("文件合并完成!")