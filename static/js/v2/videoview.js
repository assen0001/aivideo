/**
 * 视频详情页面JavaScript功能模块
 * 处理视频播放控制
 */

/**
 * 页面加载完成后初始化视频播放功能
 */
document.addEventListener('DOMContentLoaded', function() {
    // 获取元素
    const videoCover = document.getElementById('videoCover');
    const videoPlayer = document.getElementById('videoPlayer');
    const playButton = document.getElementById('playButton');
    
    // 确保所有必要的元素都存在
    if (videoCover && videoPlayer && playButton) {
        // 播放按钮点击事件
        playButton.addEventListener('click', function() {
            // 隐藏封面和播放按钮
            videoCover.style.display = 'none';
            playButton.style.display = 'none';
            // 显示并播放视频
            videoPlayer.style.display = 'block';
            videoPlayer.play().catch(error => {
                console.error('视频播放失败:', error);
                // 如果自动播放失败，显示错误信息
                alert('视频播放失败，请检查网络连接后重试');
                // 恢复封面和播放按钮
                videoCover.style.display = 'block';
                playButton.style.display = 'flex';
                videoPlayer.style.display = 'none';
            });
        });
        
        // 视频播放结束事件
        videoPlayer.addEventListener('ended', function() {
            // 恢复封面和播放按钮，准备重新播放
            videoCover.style.display = 'block';
            playButton.style.display = 'flex';
            videoPlayer.style.display = 'none';
            // 重置视频到开始位置
            videoPlayer.currentTime = 0;
        });
        
        // 视频加载错误处理
        videoPlayer.addEventListener('error', function() {
            console.error('视频加载错误');
            alert('视频加载失败，请稍后重试');
        });
    }
    
    // 留言系统功能（保持原样）
    const commentInput = document.getElementById('commentInput');
    const sendComment = document.getElementById('sendComment');
    
    if (commentInput && sendComment) {
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
});