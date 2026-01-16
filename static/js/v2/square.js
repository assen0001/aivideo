// 视频广场页面的JavaScript功能实现

// 全局变量
let currentPage = 1;
let currentVideoType = '';
let currentKeyword = '';
const pageSize = 10;

// 页面加载完成后执行
$(document).ready(function() {
    // 初始化页面
    initPage();
    
    // 绑定事件
    bindEvents();
    
    // 加载第一页数据
    loadVideos(1, currentVideoType, currentKeyword);
});

// 初始化页面
function initPage() {
    // 初始化筛选标签的活动状态
    $('.filter-tag').removeClass('active');
    $('.filter-tag[data-type=""]').addClass('active');
}

// 绑定事件
function bindEvents() {
    // 筛选标签点击事件
    $('.filter-tag').on('click', function(e) {
        e.preventDefault();
        
        // 移除所有标签的活动状态
        $('.filter-tag').removeClass('active');
        
        // 添加当前标签的活动状态
        $(this).addClass('active');
        
        // 获取筛选类型
        currentVideoType = $(this).attr('data-type') || '';
        
        // 重置页码并加载数据
        currentPage = 1;
        loadVideos(currentPage, currentVideoType, currentKeyword);
    });
    
    // 搜索按钮点击事件
    $('#search-btn').on('click', function() {
        performSearch();
    });
    
    // 搜索框回车事件
    $('#search-input').on('keypress', function(e) {
        if (e.which === 13) {  // 13是回车键的keyCode
            performSearch();
        }
    });
    
    // 分页按钮点击事件（通过事件委托）
    $(document).on('click', '.pagination a', function(e) {
        e.preventDefault();
        
        let page = $(this).attr('data-page');
        
        if (page === 'prev') {
            if (currentPage > 1) {
                currentPage--;
                loadVideos(currentPage, currentVideoType, currentKeyword);
            }
        } else if (page === 'next') {
            // 下一页会在数据加载后动态更新
            const totalPages = parseInt($('#total-pages').val());
            if (currentPage < totalPages) {
                currentPage++;
                loadVideos(currentPage, currentVideoType, currentKeyword);
            }
        } else {
            // 具体页码
            currentPage = parseInt(page);
            loadVideos(currentPage, currentVideoType, currentKeyword);
        }
    });
}

// 执行搜索
function performSearch() {
    // 获取搜索关键字
    currentKeyword = $.trim($('#search-input').val());
    
    // 重置页码并加载数据
    currentPage = 1;
    loadVideos(currentPage, currentVideoType, currentKeyword);
}

// 加载视频列表
function loadVideos(page, videoType, keyword) {
    // 显示加载动画
    showLoading();
    
    // 构建请求URL
    let url = `/api/square/videos?page=${page}&page_size=${pageSize}`;
    
    if (videoType) {
        url += `&video_type=${encodeURIComponent(videoType)}`;
    }
    
    if (keyword) {
        url += `&keyword=${encodeURIComponent(keyword)}`;
    }
    
    // 发送AJAX请求
    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            // 隐藏加载动画
            hideLoading();
            
            if (response.code === 0) {
                // 渲染视频列表
                renderVideoList(response.data.videos);
                
                // 更新分页
                updatePagination(response.data.pagination);
            } else {
                // 显示错误信息
                showError(response.message || '加载失败');
            }
        },
        error: function(xhr, status, error) {
            // 隐藏加载动画
            hideLoading();
            
            // 显示错误信息
            showError('网络错误，请稍后重试');
            console.error('加载视频列表失败:', error);
        }
    });
}

// 渲染视频列表
function renderVideoList(videos) {
    const videoListContainer = $('#video-list');
    
    // 清空现有内容
    videoListContainer.empty();
    
    if (videos && videos.length > 0) {
        // 遍历视频数据并创建HTML
        videos.forEach(function(video) {
            const videoItem = `
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <!-- 视频封面 -->
                    <a href="/videoview?id=${video.id}" target="_blank" class="relative pt-[75%] bg-gray-200 overflow-hidden block">
                        <img src="/${video.videocover_url}" class="absolute top-0 left-0 w-full h-full object-cover">
                        <div class="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                            <!-- 视频时长 -->
                            ${video.play_time}
                        </div>
                    </a>
                    
                    <div class="p-4">
                        <div class="flex items-center mb-2">
                            <!-- 作者头像 -->
                            <img src="/${video.avatar}" class="w-8 h-8 rounded-full mr-2">
                            <span class="text-sm text-gray-600">${video.nickname}</span>
                        </div>
                        
                        <p class="text-sm text-gray-600 mb-2 truncate">${video.book_name}</p>
                        
                        <div class="flex justify-between text-xs text-gray-500">
                            <span>${video.views}</span>
                            <span>${video.time_display}</span>
                        </div>
                    </div>
                </div>
            `;
            
            videoListContainer.append(videoItem);
        });
    } else {
        // 显示空状态
        videoListContainer.html(`
            <div class="col-span-full py-16 text-center">
                <p class="text-gray-500">暂无符合条件的视频</p>
            </div>
        `);
    }
}

// 更新分页
function updatePagination(pagination) {
    const paginationContainer = $('.pagination');
    
    // 保存总页数
    $('#total-pages').val(pagination.total_pages);
    
    // 清空现有分页
    paginationContainer.empty();
    
    // 创建上一页按钮
    let prevBtnClass = pagination.current_page > 1 ? '' : 'opacity-50 cursor-not-allowed';
    const prevBtn = `<a href="#" class="px-3 py-1 border rounded-md ${prevBtnClass}" data-page="prev">上一页</a>`;
    
    // 创建页码按钮
    let pageButtons = '';
    const maxVisiblePages = 5; // 最多显示5个页码
    let startPage = Math.max(1, pagination.current_page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.total_pages, startPage + maxVisiblePages - 1);
    
    // 调整起始页码，确保显示足够的页码
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 添加第一页
    if (startPage > 1) {
        pageButtons += `<a href="#" class="px-3 py-1 border rounded-md" data-page="1">1</a>`;
        if (startPage > 2) {
            pageButtons += `<span class="px-3 py-1">...</span>`;
        }
    }
    
    // 添加中间页码
    for (let i = startPage; i <= endPage; i++) {
        let activeClass = i === pagination.current_page ? 'bg-blue-500 text-white' : '';
        pageButtons += `<a href="#" class="px-3 py-1 border rounded-md ${activeClass}" data-page="${i}">${i}</a>`;
    }
    
    // 添加最后一页
    if (endPage < pagination.total_pages) {
        if (endPage < pagination.total_pages - 1) {
            pageButtons += `<span class="px-3 py-1">...</span>`;
        }
        pageButtons += `<a href="#" class="px-3 py-1 border rounded-md" data-page="${pagination.total_pages}">${pagination.total_pages}</a>`;
    }
    
    // 创建下一页按钮
    let nextBtnClass = pagination.current_page < pagination.total_pages ? '' : 'opacity-50 cursor-not-allowed';
    const nextBtn = `<a href="#" class="px-3 py-1 border rounded-md ${nextBtnClass}" data-page="next">下一页</a>`;
    
    // 组合所有按钮
    paginationContainer.html(prevBtn + pageButtons + nextBtn);
}

// 显示加载动画
function showLoading() {
    $('#video-list').html(`
        <div class="col-span-full py-16 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
            <p class="mt-4 text-gray-500">加载中...</p>
        </div>
    `);
}

// 隐藏加载动画
function hideLoading() {
    // 移除加载动画（在renderVideoList中会清空内容）
}

// 显示错误信息
function showError(message) {
    $('#video-list').html(`
        <div class="col-span-full py-16 text-center">
            <p class="text-red-500">${message}</p>
        </div>
    `);
}