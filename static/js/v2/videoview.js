/**
 * 视频详情页面JavaScript功能模块
 * 处理视频播放控制、点赞动画效果和分享功能
 */

/**
 * 页面加载完成后初始化功能
 */
document.addEventListener('DOMContentLoaded', function() {
    // 初始化视频播放功能
    initVideoPlayer();
    // 初始化点赞动画功能
    initLikeButtonAnimation();
    // 初始化分享功能
    initShareFunctionality();
});

/**
 * 初始化视频播放功能
 */
function initVideoPlayer() {
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
}

/**
 * 初始化点赞按钮动画效果
 */
function initLikeButtonAnimation() {
    // 获取点赞按钮元素
    const likeButton = document.querySelector('button:has(.fa-heart)');
    
    if (likeButton) {
        // 添加点击事件监听器
        likeButton.addEventListener('click', function(e) {
            // 创建点赞动画元素
            createLikeAnimation(e.clientX, e.clientY);
        });
    }
}

/**
 * 创建点赞动画效果
 * @param {number} x - 点击位置的X坐标
 * @param {number} y - 点击位置的Y坐标
 */
function createLikeAnimation(x, y) {
    // 创建动画容器
    const animationContainer = document.createElement('div');
    animationContainer.style.position = 'fixed';
    animationContainer.style.left = `${x}px`;
    animationContainer.style.top = `${y}px`;
    animationContainer.style.transform = 'translate(-50%, -50%)';
    animationContainer.style.pointerEvents = 'none';
    animationContainer.style.zIndex = '9999';
    
    // 创建大拇指图标
    const thumbIcon = document.createElement('i');
    thumbIcon.className = 'fas fa-thumbs-up';
    thumbIcon.style.fontSize = '24px';
    thumbIcon.style.color = '#e53e3e'; // 红色
    thumbIcon.style.opacity = '0';
    thumbIcon.style.transform = 'scale(0.5)';
    
    // 添加到容器
    animationContainer.appendChild(thumbIcon);
    document.body.appendChild(animationContainer);
    
    // 触发动画
    setTimeout(() => {
        // 动画第一阶段：放大并显示
        thumbIcon.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        thumbIcon.style.opacity = '1';
        thumbIcon.style.transform = 'scale(1.2)';
        
        // 动画第二阶段：上升并消失
        setTimeout(() => {
            thumbIcon.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            thumbIcon.style.opacity = '0';
            thumbIcon.style.transform = 'translateY(-60px) scale(0.8)';
            
            // 动画结束后移除元素
            setTimeout(() => {
                document.body.removeChild(animationContainer);
            }, 500);
        }, 200);
    }, 10);
}

/**
 * 初始化分享功能
 */
function initShareFunctionality() {
    // 获取分享按钮元素
    const shareButton = document.querySelector('button:has(.fa-share)');
    
    if (shareButton) {
        // 添加点击事件监听器
        shareButton.addEventListener('click', function() {
            // 显示分享弹窗
            showShareModal();
        });
    }
}

/**
 * 显示分享弹窗
 */
function showShareModal() {
    // 获取页面标题和URL
    const pageTitle = document.title || '视频详情';
    const pageUrl = window.location.href;
    
    // 检查是否已存在分享弹窗，如果存在则移除
    const existingModal = document.getElementById('shareModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 创建模态框容器
    const modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '10000';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    
    // 创建模态框内容
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.borderRadius = '8px';
    modalContent.style.padding = '24px';
    modalContent.style.width = '90%';
    modalContent.style.maxWidth = '400px';
    modalContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    modalContent.style.transform = 'scale(0.9)';
    modalContent.style.transition = 'transform 0.3s ease';
    
    // 创建标题
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = '分享视频';
    modalTitle.style.marginTop = '0';
    modalTitle.style.marginBottom = '16px';
    modalTitle.style.fontSize = '18px';
    modalTitle.style.fontWeight = '600';
    
    // 创建标题输入区域
    const titleContainer = document.createElement('div');
    titleContainer.style.marginBottom = '16px';
    
    const titleLabel = document.createElement('label');
    titleLabel.textContent = '视频标题:';
    titleLabel.style.display = 'block';
    titleLabel.style.marginBottom = '8px';
    titleLabel.style.fontWeight = '500';
    
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = pageTitle;
    titleInput.style.width = '100%';
    titleInput.style.padding = '8px 12px';
    titleInput.style.border = '1px solid #ddd';
    titleInput.style.borderRadius = '4px';
    titleInput.style.fontSize = '14px';
    
    titleContainer.appendChild(titleLabel);
    titleContainer.appendChild(titleInput);
    
    // 创建链接输入区域
    const urlContainer = document.createElement('div');
    urlContainer.style.marginBottom = '20px';
    
    const urlLabel = document.createElement('label');
    urlLabel.textContent = '视频链接:';
    urlLabel.style.display = 'block';
    urlLabel.style.marginBottom = '8px';
    urlLabel.style.fontWeight = '500';
    
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = pageUrl;
    urlInput.style.width = '100%';
    urlInput.style.padding = '8px 12px';
    urlInput.style.border = '1px solid #ddd';
    urlInput.style.borderRadius = '4px';
    urlInput.style.fontSize = '14px';
    urlInput.style.marginBottom = '8px';
    
    const copyUrlButton = document.createElement('button');
    copyUrlButton.textContent = '复制链接';
    copyUrlButton.style.padding = '6px 12px';
    copyUrlButton.style.backgroundColor = '#1677ff';
    copyUrlButton.style.color = 'white';
    copyUrlButton.style.border = 'none';
    copyUrlButton.style.borderRadius = '4px';
    copyUrlButton.style.cursor = 'pointer';
    copyUrlButton.style.fontSize = '14px';
    
    // 复制链接按钮点击事件
    copyUrlButton.addEventListener('click', function() {
        urlInput.select();
        urlInput.setSelectionRange(0, 99999);
        document.execCommand('copy');
        
        // 提示复制成功
        const originalText = copyUrlButton.textContent;
        copyUrlButton.textContent = '已复制！';
        copyUrlButton.style.backgroundColor = '#52c41a';
        
        setTimeout(() => {
            copyUrlButton.textContent = originalText;
            copyUrlButton.style.backgroundColor = '#1677ff';
        }, 2000);
    });
    
    urlContainer.appendChild(urlLabel);
    urlContainer.appendChild(urlInput);
    urlContainer.appendChild(copyUrlButton);
    
    // 创建关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.width = '100%';
    closeButton.style.padding = '10px';
    closeButton.style.backgroundColor = '#f5f5f5';
    closeButton.style.color = '#333';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    
    // 关闭按钮点击事件
    closeButton.addEventListener('click', function() {
        closeShareModal();
    });
    
    // 点击模态框外部关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeShareModal();
        }
    });
    
    // 添加所有元素到模态框
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(titleContainer);
    modalContent.appendChild(urlContainer);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    
    // 添加到文档
    document.body.appendChild(modal);
    
    // 触发动画
    setTimeout(() => {
        modal.style.opacity = '1';
        modalContent.style.transform = 'scale(1)';
    }, 10);
    
    /**
     * 关闭分享弹窗
     */
    function closeShareModal() {
        modal.style.opacity = '0';
        modalContent.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}