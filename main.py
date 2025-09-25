from flask import Flask, render_template
from flask_cors import CORS 

app = Flask(__name__)

# 精确配置CORS
CORS(app, resources={
    r"/*": {
        "origins": "*",  # 接受所有跨域可访问源地址
        "methods": ["POST", "OPTIONS", "GET"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5800, debug=True)
