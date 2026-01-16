from flask import Flask, render_template, request, session
from flask_cors import CORS 
from booklist import booklist_bp
from common import get_db_connection
from imageslist import imageslist_bp
from videolist import videolist_bp
from txt2voice import txt2voice_bp
from videomerge import videomerge_bp
from autovideo import autovideo_bp
from register import register_bp
from login import login_bp
from forgetpwd import forgetpwd_bp
from square import square_bp
from videoview import videoview_bp
from user_changepwd import user_changepwd_bp
from user_profile import user_profile_bp
from user_myvideo import user_myvideo_bp
from user_dashboard import user_dashboard_bp
from user_service import user_service_bp
from article import user_article_bp
from help import help_bp
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_urlsafe(32)  # 设置安全的密钥用于session管理
app.permanent_session_lifetime = 7 * 24 * 60 * 60  # 设置持久化session的生命周期为7天


# 精确配置CORS
CORS(app, resources={
    r"/*": {
        "origins": "*",  # 接受所有跨域可访问源地址
        "methods": ["POST", "OPTIONS", "GET", "PUT"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# 请求钩子：在每个请求处理前执行
@app.before_request
def before_request():
    # 排除静态资源类文件请求
    static_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.css', '.js', '.mp4', '.mp3', '.wav', '.ico')
    if request.path.endswith(static_extensions):
        return
    print(f"请求路径: {request.path}")
    # 从请求的cookie中获取user_account值
    user_account = request.cookies.get('user_account')
    if user_account:
        user_account = user_account.replace('%40', '@')
        print(f"从cookie中获取到user_account: {user_account}")

        if 'user_account' in session:
            return
        else:
            conn = None
            try:
                # 获取数据库连接
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    # 执行SQL查询获取用户信息
                    sql = "SELECT * FROM ai_user WHERE account = %s"
                    cursor.execute(sql, (user_account,))
                    user = cursor.fetchone()
                    
                    if user:
                        # 如果用户存在，设置完整的session信息
                        session['user_account'] = user['account']
                        session['user_id'] = user['id']
                        session['nickname'] = user['nickname']
                        session['avatar'] = user['avatar']
                        session['status'] = user['status']
                        session['vip'] = user['vip']
                        session['logged_in'] = True
                    else:
                        # 如果用户不存在，设置为未登录状态
                        session['logged_in'] = False
                        session['vip'] = 0

            except Exception as e:
                print(f"查询用户信息出错: {e}")
            finally:
                conn.close()

# 注册蓝图
app.register_blueprint(booklist_bp)
app.register_blueprint(imageslist_bp)
app.register_blueprint(videolist_bp)
app.register_blueprint(txt2voice_bp)
app.register_blueprint(videomerge_bp)
app.register_blueprint(autovideo_bp)
app.register_blueprint(register_bp)
app.register_blueprint(login_bp)
app.register_blueprint(forgetpwd_bp)
app.register_blueprint(square_bp)
app.register_blueprint(videoview_bp)
app.register_blueprint(user_changepwd_bp)
app.register_blueprint(user_profile_bp)
app.register_blueprint(user_myvideo_bp)
app.register_blueprint(user_dashboard_bp)
app.register_blueprint(user_service_bp)
app.register_blueprint(user_article_bp)
app.register_blueprint(help_bp)

@app.route('/')
def index():
    return render_template('v2/index.html')

@app.route('/createvideo')
def createvideo():
    return render_template('v2/createvideo.html')

@app.route('/support')
def support():
    return render_template('v2/support.html')

@app.route('/download')
def download():
    return render_template('v2/download.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5800, debug=True)
