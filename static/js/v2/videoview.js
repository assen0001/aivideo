/**
 * 视频详情页面JavaScript功能模块
 * 处理视频播放控制和留言系统功能
 */

/**
 * 初始化视频播放器
 * 设置播放按钮点击事件和视频加载事件
 */
function initVideoPlayer() {
    const videoCover = document.getElementById('videoCover');
    const videoPlayer = document.getElementById('videoPlayer');
    const playButton = document.getElementById('playButton');
    const videoDuration = document.getElementById('videoDuration');

    // 播放按钮点击事件
    playButton.addEventListener('click', function() {
        videoCover.style.display = 'none';
        playButton.style.display = 'none';
        videoPlayer.style.display = 'block';
        videoPlayer.play();
    });

    // 视频加载完成事件
    videoPlayer.addEventListener('loadedmetadata', function() {
        const duration = videoPlayer.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        videoDuration.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    });

    // 视频播放结束事件
    videoPlayer.addEventListener('ended', function() {
        videoCover.style.display = 'block';
        playButton.style.display = 'flex';
        videoPlayer.style.display = 'none';
    });
}

/**
 * 初始化留言功能
 * 处理留言输入验证和发送功能
 */
function initCommentSystem() {
    const commentInput = document.getElementById('commentInput');
    const sendComment = document.getElementById('sendComment');

    // 留言输入框变化事件
    commentInput.addEventListener('input', function() {
        const text = commentInput.value.trim();
        sendComment.disabled = text.length === 0 || text.length > 500;
        
        // 字数限制
        if (text.length > 500) {
            commentInput.value = text.substring(0, 500);
        }
    });

    // 发送留言事件
    sendComment.addEventListener('click', function() {
        const text = commentInput.value.trim();
        if (text.length === 0 || text.length > 500) return;

        // 模拟发送留言（实际项目中需要调用API）
        alert('留言发送成功！');
        commentInput.value = '';
        sendComment.disabled = true;
    });

    // 回车发送留言
    commentInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendComment.click();
        }
    });
}

/**
 * 页面加载完成后初始化所有功能
 */
document.addEventListener('DOMContentLoaded', function() {
    // 初始化视频播放器
    initVideoPlayer();
    
    // 初始化留言系统
    initCommentSystem();
});