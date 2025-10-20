import pymysql
import os
from flask import jsonify
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 从环境变量获取数据库配置
db_config = {
    'ZC_MYSQL_SERVER': os.getenv('ZC_MYSQL_SERVER'),
    'ZC_MYSQL_USERNAME': os.getenv('ZC_MYSQL_USERNAME'),
    'ZC_MYSQL_PASSWORD': os.getenv('ZC_MYSQL_PASSWORD'),
    'ZC_MYSQL_NAME': os.getenv('ZC_MYSQL_NAME'),
    'ZC_MYSQL_PORT': os.getenv('ZC_MYSQL_PORT'),
    'N8N_URL': os.getenv('N8N_URL').rstrip('/') if os.getenv('N8N_URL') else None,
    'COMFYUI_URL': os.getenv('COMFYUI_URL').rstrip('/') if os.getenv('COMFYUI_URL') else None,
    'INDEXTTS_URL': os.getenv('INDEXTTS_URL').rstrip('/') if os.getenv('INDEXTTS_URL') else None,
    'AIBOOKVIDEO_URL': os.getenv('AIBOOKVIDEO_URL').rstrip('/') if os.getenv('AIBOOKVIDEO_URL') else None,
    'COMFYUI_URL_WAN': os.getenv('COMFYUI_URL_WAN').rstrip('/') if os.getenv('COMFYUI_URL_WAN') else None,
    'COMFYUI_URL_PATH': os.getenv('COMFYUI_URL_PATH').rstrip('/') if os.getenv('COMFYUI_URL_PATH') else None
}

# 修改 get_db_connection 函数，添加超时设置和连接池参数
def get_db_connection():
    return pymysql.connect(
        host=db_config['ZC_MYSQL_SERVER'],
        user=db_config['ZC_MYSQL_USERNAME'],
        password=db_config['ZC_MYSQL_PASSWORD'],
        database=db_config['ZC_MYSQL_NAME'],
        port=int(db_config['ZC_MYSQL_PORT']),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        # 添加以下参数
        connect_timeout=30,       # 连接超时时间
        read_timeout=60,          # 读取超时时间
        write_timeout=60,         # 写入超时时间
        autocommit=False,         # 保持事务控制
        client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS  # 允许多条语句
    )

def get_config():
    return jsonify({
        'N8N_URL': db_config.get('N8N_URL'),
        'COMFYUI_URL': db_config.get('COMFYUI_URL'),
        'INDEXTTS_URL': db_config.get('INDEXTTS_URL'),
        'AIBOOKVIDEO_URL': db_config.get('AIBOOKVIDEO_URL'),
        'COMFYUI_URL_WAN': db_config.get('COMFYUI_URL_WAN'),
        'COMFYUI_URL_PATH': db_config.get('COMFYUI_URL_PATH')
    })
