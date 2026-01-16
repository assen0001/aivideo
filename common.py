import pymysql
import os
from flask import jsonify
from dotenv import load_dotenv
import random
import string

# 加载环境变量
load_dotenv()

# 从环境变量获取数据库配置
db_config = {
    'ZC_MYSQL_SERVER': os.getenv('ZC_MYSQL_SERVER') or '',
    'ZC_MYSQL_SERVER_N8N': os.getenv('ZC_MYSQL_SERVER') or '',
    'ZC_MYSQL_USERNAME': os.getenv('ZC_MYSQL_USERNAME') or '',
    'ZC_MYSQL_PASSWORD': os.getenv('ZC_MYSQL_PASSWORD') or '',
    'ZC_MYSQL_NAME': os.getenv('ZC_MYSQL_NAME') or '',
    'ZC_MYSQL_PORT': os.getenv('ZC_MYSQL_PORT') or '',

    'N8N_WEBHOOK_PATH_AUTO': os.getenv('N8N_WEBHOOK_PATH_AUTO') or '9cbad627-54eb-4d5e-be26-a11b53ff8de4',
    'N8N_WEBHOOK_PATH_JOB_1': os.getenv('N8N_WEBHOOK_PATH_JOB_1') or 'c523e50a-ed78-4672-8781-e4e091cbcb09',
    'N8N_WEBHOOK_PATH_JOB_2': os.getenv('N8N_WEBHOOK_PATH_JOB_2') or '2bc5e890-ffe2-4523-b4ce-4c2b1a088bc7',
    'N8N_WEBHOOK_PATH_JOB_3': os.getenv('N8N_WEBHOOK_PATH_JOB_3') or 'ea662f32-ca25-430a-8ebc-c0cef09ec91f',

    'AIVIDEO_URL': (au := os.getenv('AIVIDEO_URL')) and au.rstrip('/') or None,
    'INDEXTTS_URL': (iu := os.getenv('INDEXTTS_URL')) and iu.rstrip('/') or None,
    'COMFYUI_URL': (cu := os.getenv('COMFYUI_URL')) and cu.rstrip('/') or None,
    'COMFYUI_URL_WAN': (cwan := os.getenv('COMFYUI_URL_WAN') or cu).rstrip('/') if (os.getenv('COMFYUI_URL_WAN') or cu) else None,
    'COMFYUI_URL_PATH': (cp := os.getenv('COMFYUI_URL_PATH')) and cp.rstrip('/') or '../output',
    'COMFYUI_URL_PROXY': (os.getenv('COMFYUI_URL_PROXY') or cu).rstrip('/') if (os.getenv('COMFYUI_URL_PROXY') or cu) else None,
    'COMFYUI_URL_WAN_PROXY': (os.getenv('COMFYUI_URL_WAN_PROXY') or cwan).rstrip('/') if (os.getenv('COMFYUI_URL_WAN_PROXY') or cwan) else None,
    'VIP_REGISTER_CODE': os.getenv('VIP_REGISTER_CODE') if os.getenv('VIP_REGISTER_CODE') else None,
    'N8N_URL': os.getenv('N8N_URL').rstrip('/') if os.getenv('N8N_URL') else 'https://n8n.aivideo.site',
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
        'COMFYUI_URL_PROXY': db_config.get('COMFYUI_URL_PROXY'),
        'COMFYUI_URL_WAN_PROXY': db_config.get('COMFYUI_URL_WAN_PROXY'),
    })

