/**
 * 下载页面JavaScript功能
 * 处理下载按钮点击事件和用户交互
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 获取下载按钮
    const localDownloadBtn = document.getElementById('localDownload');
    const githubLink = document.querySelector('a[href="https://github.com/assen0001/aivideo"]');
    
    // 本地下载按钮点击事件
    if (localDownloadBtn) {
        localDownloadBtn.addEventListener('click', function(e) {
            // 记录下载行为（如果需要）
            console.log('用户点击了本地下载按钮');
            
            // 可以在这里添加下载统计或其他功能
            // 比如发送下载事件到分析系统
            
            // 显示下载提示
            showDownloadNotification();
        });
    }
    
    // GitHub链接点击事件
    if (githubLink) {
        githubLink.addEventListener('click', function(e) {
            // 记录GitHub访问行为
            console.log('用户点击了GitHub链接');
        });
    }
    
    /**
     * 显示下载通知
     */
    function showDownloadNotification() {
        // 检查是否已经有通知元素
        let notification = document.getElementById('downloadNotification');
        
        // 如果没有，创建新的通知元素
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'downloadNotification';
            notification.className = 'fixed bottom-6 right-6 bg-green-600 text-white py-3 px-5 rounded-lg shadow-lg transform transition-all duration-300 scale-0 opacity-0 z-50';
            notification.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-check-circle mr-2"></i>
                    <span>下载已开始，请耐心等待...</span>
                </div>
            `;
            document.body.appendChild(notification);
        }
        
        // 显示通知
        setTimeout(() => {
            notification.classList.remove('scale-0', 'opacity-0');
            notification.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        // 5秒后隐藏通知
        setTimeout(() => {
            notification.classList.remove('scale-100', 'opacity-100');
            notification.classList.add('scale-0', 'opacity-0');
            
            // 完全隐藏后移除元素
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
    
    /**
     * 添加平滑滚动效果
     */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});