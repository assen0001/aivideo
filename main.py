from flask import Flask, render_template, request, jsonify, flash, redirect, url_for, session
from flask_cors import CORS 
from booklist import booklist_bp
from common import get_db_connection
from imageslist import imageslist_bp
from videolist import videolist_bp
from txt2voice import txt2voice_bp
from videomerge import videomerge_bp
from autovideo import autovideo_bp
from autovideo_list import autovideo_list_bp
from register import register_bp
from login import login_bp
from square import square_bp
from videoview import videoview_bp
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_urlsafe(32)  # 设置安全的密钥用于session管理
app.permanent_session_lifetime = 7 * 24 * 60 * 60  # 设置持久化session的生命周期为7天

# 请求钩子：在每个请求处理前执行
@app.before_request
def before_request():
    # 排除静态资源类文件请求
    static_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.css', '.js', '.mp4', '.mp3', '.wav', '.ico')
    if request.path.endswith(static_extensions):
        return
    """
    读取客户端cookie中是否有名为user_account的值
    如果有则从数据库查询用户详细信息并设置完整的session信息
    如果没有则设置为未登录状态
    """
    print(f"请求路径: {request.path}")
    # 检查session中是否已存在user_account
    if 'user_account' in session:
        return

    # 从请求的cookie中获取user_account值
    user_account = request.cookies.get('user_account')
    if user_account:
        print(f"从cookie中获取到user_account: {user_account}")
        # 如果cookie中存在user_account，则从数据库查询用户详细信息
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
        except Exception as e:
            # 发生错误时，设置为未登录状态
            print(f"查询用户信息出错: {e}")
            session['logged_in'] = False
        finally:
            # 确保数据库连接被关闭
            if conn:
                conn.close()
    else:
        # 如果cookie中不存在user_account，则设置为未登录状态
        session['logged_in'] = False

# 精确配置CORS
CORS(app, resources={
    r"/*": {
        "origins": "*",  # 接受所有跨域可访问源地址
        "methods": ["POST", "OPTIONS", "GET"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# 注册蓝图
app.register_blueprint(booklist_bp)
app.register_blueprint(imageslist_bp)
app.register_blueprint(videolist_bp)
app.register_blueprint(txt2voice_bp)
app.register_blueprint(videomerge_bp)
app.register_blueprint(autovideo_bp)
app.register_blueprint(autovideo_list_bp)
app.register_blueprint(register_bp)
app.register_blueprint(login_bp)
app.register_blueprint(square_bp)
app.register_blueprint(videoview_bp)

@app.route('/')
def index():
    return render_template('v2/index.html')

@app.route('/v1')
def v1():
    return render_template('autovideo.html')

# ======== V2版本 API路由 =======
@app.route('/v2')
def v2():
    return render_template('v2/index.html')

@app.route('/createvideo')
def createvideo():
    return render_template('v2/createvideo.html')

@app.route('/vip')
def vip():
    return render_template('v2/vip.html')

@app.route('/help')
def help():
    return render_template('v2/help.html')

@app.route('/videoview')
def videoview():
    return render_template('v2/videoview.html')

@app.route('/download')
def download():
    return render_template('v2/download.html')

# ==================== 用户后台页面路由 ====================
@app.route('/user/dashboard')
def user_dashboard():
    """用户后台总览页面"""
    return render_template('user/dashboard.html')

@app.route('/user/my-videos')
def user_my_videos():
    """用户我的视频页面"""
    return render_template('user/my_videos.html')

@app.route('/user/recharge')
def user_recharge():
    """用户帐号充值页面"""
    return render_template('user/recharge.html')

@app.route('/user/orders')
def user_orders():
    """用户订单明细页面"""
    return render_template('user/orders.html')

@app.route('/user/profile')
def user_profile():
    """用户个人信息页面"""
    return render_template('user/profile.html')

@app.route('/user/change-password')
def user_change_password():
    """用户修改密码页面"""
    return render_template('user/change_password.html')

@app.route('/user/customer-service')
def user_customer_service():
    """用户联系客服页面"""
    return render_template('user/customer_service.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5008, debug=True)
