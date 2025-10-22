# AI视频创作平台
## 平台简介
- 本平台为一站式全流程AI长视频创作平台，输入1个主题 → 输出1部专业级长视频（含分镜/画面/字幕/配音/剪辑）。
- 功能定位：基于开源技术栈的本地化部署AI视频创作平台，实现从主题到视频的全流程自动化生产。
- 核心技术
 1. 自研AI视频创作平台
 2. AI Agent任务调度平台：N8N
 3. 集成大语言模型：Ollama + DeepSeek
 4. 集成生图模型：ComfyUI + Flux
 5. 集成视频模型：通义万相Wan2.1
 6. 集成语音合成模型：Index-TTS(2.0)

## 平台优势
 1. 开源本地化部署
  - 采用开源技术栈 + 本地部署，无需依赖外部服务，数据安全可控
 2. AI智能编剧
  - 可按视频类型定制文案生成模板
 3. 低成本批量创建视频
  - 本地化部署（或算力租赁部署），无额外视频创作成本
 4. 多平台适配
  - 支持抖音、B站、小红书、今日头条等平台

## 作者联系方式：
 - 作者：assen（阿森视界）
 - 官网（演示平台）：https://www.aivideo.site
 - B站演示视频链接：https://space.bilibili.com/1105978078/upload/video
 - Github项目链接：https://github.com/assen0001/aivideo
 - 赞助我们：https://shgis.com/58524.html
 - 联系邮箱：17305566@qq.com
 - 有任何问题欢迎联系我们，提供技术支持。
 - 微信扫码加入交流群 
 <img src="https://aibook.shgis.com/static/images/wx001.jpg" width=100 height=100>

## 安装指南
1. 环境准备
   - Python
   - Git
   - FFmpeg
   - Moviepy
   - MySQL

2. 克隆项目
```bash
git clone https://github.com/assen0001/aivideo.git
cd aivideo
```

3. 安装依赖
```bash
pip install -r requirements.txt
```

5. 配置环境
   - 本地部署N8N智能体流程调度平台，导入并配置工作流文件，并在.env中配置调用API地址
   - 本地部署Ollama + DeepSeek，并在N8N中配置Ollama调用API地址
   - 本地部署ComfyUI + Flux + Wan2.1，并在.env中配置调用API地址
   - 本地部署Index-TTS(2.0)语音合成模型，并在.env中配置调用API地址
   - 用aivideo.sql文件创建数据库，修改.env中数据库配置信息
   - 部署过程中有任何问题可以联系我们提供技术支持和部署服务。
   - 也可以使用部署好的仙宫云镜象，地址为：https://www.xiangongyun.com/image/detail/5bd7a57f-d8a2-42e4-b25f-5399e6903976

## 使用说明
1. 启动服务
```bash
python main.py
```

2. 访问平台
   - 打开浏览器访问 http://localhost:5800

3. 基本流程
   - 输入主题/视频类型/视频风格/配音
   - 生成文案脚本
   - 生成字幕语音
   - 生成分镜画面
   - 合成最终视频
   - 下载或分享视频
   - 可一键生成视频，也可以分步骤生成

4. 高级功能（部分开发中）
   - 批量生成：支持同时处理多个主题
   - 模板定制：可自定义文案生成模板
   - 风格调整：可修改视频风格参数


## 许可协议
- MIT，本项目采用 MIT 许可协议 (LICENSE) 发布。


## 版本更新日志
- 0.2.0 2025.10.22
  - 视频广场、源码下载页面
  - 优化界面和用户体验
  - 修复一些bug

- 0.1.0 2025.10.10
  - 初始化项目环境
  - 原AIbookvideo项目代码迁移
  - V2版本界面和功能
  - 会员后台界面
