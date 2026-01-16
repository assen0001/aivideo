/**
 * 我的视频页面JavaScript功能
 * 负责页面初始化、数据加载、搜索筛选、分页和操作功能
 */

$(document).ready(function() {
    // 页面初始化
    initMyVideosPage();
    
    // 绑定事件监听器
    bindEventListeners();
});

/**
 * 初始化我的视频页面
 */
function initMyVideosPage() {
    console.log('初始化我的视频页面...');
    
    // 显示加载状态
    showLoadingState();
    
    // 加载视频列表数据
    loadVideos();
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 搜索按钮点击事件
    $('#search-btn').on('click', function() {
        performSearch();
    });
    
    // 搜索输入框回车事件
    $('#search-input').on('keypress', function(e) {
        if (e.which === 13) {
            performSearch();
        }
    });
    
    // 状态筛选变更事件
    $('#status-filter').on('change', function() {
        loadVideos();
    });
    
    // 分页按钮点击事件
    $(document).on('click', '.pagination-btn', function() {
        const page = $(this).data('page');
        if (page) {
            loadVideos(page);
        }
    });
    
    // 播放按钮点击事件
    $(document).on('click', '.play-btn', function() {
        const videoId = $(this).data('id');
        playVideo(videoId);
    });
    
    // 下载按钮点击事件
    $(document).on('click', '.download-btn', function() {
        const videoId = $(this).data('id');
        downloadVideo(videoId);
    });
    
    // 删除按钮点击事件
    $(document).on('click', '.delete-btn', function() {
        const videoId = $(this).data('id');
        const videoName = $(this).data('name');
        deleteVideo(videoId, videoName);
    });
    
    // 公开状态开关点击事件
    $(document).on('change', '.public-toggle', function() {
        const videoId = $(this).data('id');
        const newStatus = this.checked ? 1 : 0;
        updateVideoStatus(videoId, newStatus);
    });
}

/**
 * 显示加载状态
 */
function showLoadingState() {
    $('#videos-table tbody').html(`
        <tr>
            <td colspan="5" class="text-center py-8">
                <div class="flex justify-center items-center">
                    <i class="fas fa-spinner fa-spin text-blue-600 text-2xl mr-3"></i>
                    <span class="text-gray-600">加载中...</span>
                </div>
            </td>
        </tr>
    `);
}

/**
 * 加载视频列表数据
 * @param {number} page - 页码
 */
function loadVideos(page = 1) {
    const searchKeyword = $('#search-input').val().trim();
    const statusFilter = $('#status-filter').val();
    
    // 显示加载状态
    showLoadingState();
    
    // 构建请求参数
    const params = {
        page: page,
        page_size: 10,
        search: searchKeyword
    };
    
    if (statusFilter) {
        params.status = statusFilter;
    }
    
    // 发送AJAX请求
    $.ajax({
        url: '/api/user/my-videos',
        type: 'GET',
        data: params,
        success: function(response) {
            if (response.success) {
                renderVideos(response.data.videos);
                renderPagination(response.data.pagination);
                updateResultCount(response.data.pagination);
            } else {
                showError('加载视频列表失败：' + response.message);
            }
        },
        error: function(xhr, status, error) {
            showError('网络错误，请稍后重试');
            console.error('加载视频列表失败:', error);
        }
    });
}

/**
 * 渲染视频列表
 * @param {Array} videos - 视频数据数组
 */
function renderVideos(videos) {
    if (videos.length === 0) {
        $('#videos-table tbody').html(`
            <tr>
                <td colspan="5" class="text-center py-8">
                    <i class="fas fa-video text-gray-400 text-4xl mb-3"></i>
                    <p class="text-gray-500">暂无视频数据</p>
                </td>
            </tr>
        `);
        return;
    }
    
    let html = '';
    videos.forEach(video => {
        // 处理封面图片
        const coverHtml = video.cover_url ? 
            `<img src="/${video.cover_url}" class="w-12 h-12 object-cover rounded">` :
            `<div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                <i class="fas fa-video text-gray-500"></i>
            </div>`;
        
        // 处理操作按钮
        const playBtn = video.can_play_download ? 
            `<button class="play-btn text-blue-600 hover:text-blue-800" data-id="${video.id}" title="播放视频">
                <i class="fas fa-play"></i>
            </button>` :
            `<button class="text-gray-400 cursor-not-allowed" title="视频尚未完成">
                <i class="fas fa-play"></i>
            </button>`;
        
        const downloadBtn = video.can_play_download ? 
            `<button class="download-btn text-gray-600 hover:text-gray-800" data-id="${video.id}" title="下载视频">
                <i class="fas fa-download"></i>
            </button>` :
            `<button class="text-gray-400 cursor-not-allowed" title="视频尚未完成">
                <i class="fas fa-download"></i>
            </button>`;
        
        // 处理是否公开开关
        const toggleClass = video.video_status === 1 ? 'bg-green-600' : 'bg-gray-300';
        const togglePosition = video.video_status === 1 ? 'translate-x-4' : 'translate-x-0';
        const isPublicToggle = `
            <label class="relative inline-block w-10 h-6">
                <input type="checkbox" class="opacity-0 w-0 h-0 public-toggle" 
                       ${video.video_status === 1 ? 'checked' : ''} 
                       data-id="${video.id}">
                <span class="absolute cursor-pointer inset-0 bg-gray-300 rounded-full transition-colors duration-300 ease-in-out ${toggleClass}">
                    <span class="absolute left-1 top-1 bg-white rounded-full w-4 h-4 transition-transform duration-300 ease-in-out ${togglePosition}"></span>
                </span>
            </label>
        `;

        html += `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3 px-4">
                    <div class="flex items-center">
                        ${coverHtml}
                        <div class="ml-3">
                            <p class="font-medium">${escapeHtml(video.book_name)}</p>
                            <p class="text-sm text-gray-500">${escapeHtml(video.video_type)}</p>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-4">${escapeHtml(video.create_time)}</td>
                <td class="py-3 px-4">
                    <span class="status-badge ${video.status_class}">${escapeHtml(video.status)}</span>
                </td>
                <td class="py-3 px-4">${escapeHtml(video.play_time)}</td>
                <td class="py-3 px-4">${video.views}</td>
                <td class="py-3 px-4">${isPublicToggle}</td>
                <td class="py-3 px-4">
                    <div class="flex space-x-2">
                        ${playBtn}
                        ${downloadBtn}
                        <button class="delete-btn text-red-600 hover:text-red-800" 
                                data-id="${video.id}" 
                                data-name="${video.book_id}"
                                title="删除视频">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    $('#videos-table tbody').html(html);
}

/**
 * 渲染分页组件
 * @param {Object} pagination - 分页信息
 */
function renderPagination(pagination) {
    const { current_page, total_pages } = pagination;
    
    if (total_pages <= 1) {
        $('#pagination-container').html('');
        return;
    }
    
    let html = '<div class="flex space-x-2">';
    
    // 上一页按钮
    if (current_page > 1) {
        html += `<button class="pagination-btn px-3 py-1 border rounded" data-page="${current_page - 1}">上一页</button>`;
    }
    
    // 页码按钮
    for (let i = 1; i <= total_pages; i++) {
        if (i === current_page) {
            html += `<button class="px-3 py-1 border rounded bg-blue-600 text-white">${i}</button>`;
        } else {
            html += `<button class="pagination-btn px-3 py-1 border rounded" data-page="${i}">${i}</button>`;
        }
    }
    
    // 下一页按钮
    if (current_page < total_pages) {
        html += `<button class="pagination-btn px-3 py-1 border rounded" data-page="${current_page + 1}">下一页</button>`;
    }
    
    html += '</div>';
    $('#pagination-container').html(html);
}

/**
 * 更新结果计数显示
 * @param {Object} pagination - 分页信息
 */
function updateResultCount(pagination) {
    const { current_page, page_size, total_count } = pagination;
    const start = (current_page - 1) * page_size + 1;
    const end = Math.min(current_page * page_size, total_count);
    
    $('#result-count').text(`显示 ${start}-${end} 条，共 ${total_count} 条`);
}

/**
 * 执行搜索操作
 */
function performSearch() {
    loadVideos(1); // 搜索时重置到第一页
}

/**
 * 播放视频
 * @param {string} videoId - 视频ID
 */
function playVideo(videoId) {
    window.open(`/videoview?id=${videoId}`, '_blank');
}

/**
 * 下载视频
 * @param {string} videoId - 视频ID
 */
function downloadVideo(videoId) {
    // 显示加载状态
    showNotification('正在获取下载链接...', 'info');
    
    $.ajax({
        url: '/api/user/my-videos/download',
        type: 'GET',
        data: { video_id: videoId },
        success: function(response) {
            if (response.success) {
                // 创建下载链接并触发下载
                const downloadUrl = response.data.download_url;                
                const filename = response.data.filename;
                
                const link = document.createElement('a');
                link.href = "/"+downloadUrl;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showNotification('下载开始，请稍候...', 'success');
            } else {
                showNotification('下载失败：' + response.message, 'error');
            }
        },
        error: function(xhr, status, error) {
            showNotification('网络错误，请稍后重试', 'error');
            console.error('下载视频失败:', error);
        }
    });
}

/**
 * 删除视频
 * @param {string} videoId - 视频ID
 * @param {string} videoName - 视频名称--book_id
 */
function deleteVideo(videoId, videoName) {
    // 确认删除对话框
    if (confirm(`确定要删除视频吗？删除后数据将无法恢复！`)) {
        // 显示加载状态
        showNotification('正在删除视频...', 'info');
        
        $.ajax({
            url: '/api/user/my-videos/delete',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ video_id: videoId, book_id: videoName }),
            success: function(response) {
                if (response.success) {
                    showNotification('视频删除成功', 'success');
                    // 重新加载视频列表
                    loadVideos();
                } else {
                    showNotification('删除失败：' + response.message, 'error');
                }
            },
            error: function(xhr, status, error) {
                showNotification('网络错误，请稍后重试', 'error');
                console.error('删除视频失败:', error);
            }
        });
    }
}

/**
 * 显示通知消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型：success, error, info, warning
 */
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = $(`
        <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg max-w-sm notification-${type}">
            <div class="flex items-center">
                <i class="fas ${getNotificationIcon(type)} mr-2"></i>
                <span>${message}</span>
            </div>
        </div>
    `);
    
    // 添加样式
    const styles = {
        'success': 'bg-green-100 text-green-800 border border-green-200',
        'error': 'bg-red-100 text-red-800 border border-red-200',
        'info': 'bg-blue-100 text-blue-800 border border-blue-200',
        'warning': 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    };
    
    notification.addClass(styles[type]);
    
    // 添加到页面并设置自动消失
    $('body').append(notification);
    
    setTimeout(() => {
        notification.fadeOut(300, function() {
            $(this).remove();
        });
    }, 3000);
}

/**
 * 获取通知图标
 * @param {string} type - 消息类型
 * @returns {string} 图标类名
 */
function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'info': 'fa-info-circle',
        'warning': 'fa-exclamation-triangle'
    };
    return icons[type] || 'fa-info-circle';
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
function showError(message) {
    $('#videos-table tbody').html(`
        <tr>
            <td colspan="5" class="text-center py-8">
                <i class="fas fa-exclamation-triangle text-red-500 text-2xl mr-3"></i>
                <span class="text-red-600">${escapeHtml(message)}</span>
                <button class="ml-4 text-blue-600 hover:text-blue-800" onclick="loadVideos()">
                    <i class="fas fa-redo mr-1"></i>重新加载
                </button>
            </td>
        </tr>
    `);
}

/**
 * HTML转义函数
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 更新视频公开状态
 * @param {string} videoId - 视频ID
 * @param {number} newStatus - 新状态(0:否, 1:是)
 */
function updateVideoStatus(videoId, newStatus) {
    // 显示加载状态
    // showNotification(`正在${newStatus === 1 ? '公开' : '取消公开'}视频...`, 'info');
    
    $.ajax({
        url: '/api/user/my-videos/update-status',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ 
            video_id: videoId, 
            video_status: newStatus 
        }),
        success: function(response) {
            if (response.success) {
                showNotification(`视频${newStatus === 1 ? '公开' : '取消公开'}成功`, 'success');
                // 更新UI - 通过切换CSS类来实现开关的视觉变化
                const toggleCheckbox = $(`.public-toggle[data-id="${videoId}"]`);
                const toggleSpan = toggleCheckbox.siblings('span');
                const toggleDot = toggleSpan.find('span');
                
                if (newStatus === 1) {
                    toggleSpan.addClass('bg-green-600').removeClass('bg-gray-300');
                    toggleDot.addClass('translate-x-4').removeClass('translate-x-0');
                } else {
                    toggleSpan.addClass('bg-gray-300').removeClass('bg-green-600');
                    toggleDot.addClass('translate-x-0').removeClass('translate-x-4');
                }
            } else {
                // 如果失败，恢复开关状态
                const toggleCheckbox = $(`.public-toggle[data-id="${videoId}"]`);
                toggleCheckbox.prop('checked', !toggleCheckbox.prop('checked'));
                showNotification(`${newStatus === 1 ? '公开' : '取消公开'}失败：` + response.message, 'error');
            }
        },
        error: function(xhr, status, error) {
            // 如果失败，恢复开关状态
            const toggleCheckbox = $(`.public-toggle[data-id="${videoId}"]`);
            toggleCheckbox.prop('checked', !toggleCheckbox.prop('checked'));
            showNotification('更新视频状态失败', 'error');
            console.error('更新视频状态失败:', error);
        }
    });
}

// 导出函数供其他模块使用
window.MyVideos = {
    initMyVideosPage,
    loadVideos,
    playVideo,
    downloadVideo,
    deleteVideo,
    showNotification,
    updateVideoStatus
};