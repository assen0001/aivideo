$(document).ready(function() {
    let currentPage = 1;
    let currentPerPage = 10;
    let totalPages = 0;

    // 初始化
    loadVideoData();

    // 每页数量选择事件
    $('#perPageSelect').change(function() {
        currentPerPage = parseInt($(this).val());
        currentPage = 1;
        loadVideoData();
    });

    // 加载视频数据
    function loadVideoData() {
        showLoading();
        
        $.ajax({
            url: '/autovideo_list/data',
            type: 'GET',
            data: {
                page: currentPage,
                per_page: currentPerPage
            },
            success: function(response) {
                hideLoading();
                
                if (response.data && response.data.length > 0) {
                    renderVideoGrid(response.data);
                    totalPages = response.total_pages;
                    renderPagination();
                    
                    $('#videoGrid').show();
                    $('#paginationSection').show();
                    $('#emptySection').hide();
                } else {
                    $('#videoGrid').hide();
                    $('#paginationSection').hide();
                    $('#emptySection').show();
                }
            },
            error: function(xhr, status, error) {
                hideLoading();
                console.error('加载视频数据失败:', error);
                alert('加载数据失败，请重试');
            }
        });
    }

    // 显示加载状态
    function showLoading() {
        $('#loadingSection').show();
        $('#videoGrid').hide();
        $('#emptySection').hide();
        $('#paginationSection').hide();
    }

    // 隐藏加载状态
    function hideLoading() {
        $('#loadingSection').hide();
    }

    // 渲染视频网格
    function renderVideoGrid(videos) {
        const grid = $('#videoGrid');
        grid.empty();

        videos.forEach(video => {
            const videoCard = createVideoCard(video);
            grid.append(videoCard);
        });
    }

    // 创建视频卡片
    function createVideoCard(video) {
        const hasVideo = video.videomerge_url && video.videomerge_url.trim() !== '';
        const videoSrc = hasVideo ? `/${video.videomerge_url}` : '';
        
        return `
            <div class="video-card" data-video-id="${video.id}" data-video-url="${videoSrc}">
                <div class="video-thumbnail">
                    ${hasVideo ? `
                        <video preload="metadata">
                            <source src="${videoSrc}#t=0.5" type="video/mp4">
                        </video>
                        <div class="play-overlay">
                            <i class="fas fa-play"></i>
                        </div>
                    ` : `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #a0a0a0;">
                            <i class="fas fa-video-slash" style="font-size: 2rem;"></i>
                        </div>
                    `}
                </div>
                <div class="video-info">
                    <div class="video-title" title="${video.book_name}">${video.book_name}</div>
                    <div class="video-meta">
                        <div class="video-time">${video.createtime}</div>
                        <div class="video-status status-${video.book_status}">${video.status_text}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // 渲染分页
    function renderPagination() {
        const pagination = $('#pagination');
        pagination.empty();

        if (totalPages <= 1) {
            return;
        }

        // 上一页
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        pagination.append(`
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a>
            </li>
        `);

        // 页码
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            pagination.append(`
                <li class="page-item">
                    <a class="page-link" href="#" data-page="1">1</a>
                </li>
            `);
            if (startPage > 2) {
                pagination.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const active = i === currentPage ? 'active' : '';
            pagination.append(`
                <li class="page-item ${active}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pagination.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
            }
            pagination.append(`
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                </li>
            `);
        }

        // 下一页
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        pagination.append(`
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>
            </li>
        `);

        // 绑定分页点击事件
        pagination.find('.page-link').click(function(e) {
            e.preventDefault();
            const page = parseInt($(this).data('page'));
            if (page >= 1 && page <= totalPages && page !== currentPage) {
                currentPage = page;
                loadVideoData();
            }
        });
    }

    // 视频播放事件
    $(document).on('click', '.video-card', function() {
        const videoUrl = $(this).data('video-url');
        const bookName = $(this).find('.video-title').text();
        
        if (videoUrl && videoUrl.trim() !== '') {
            playVideo(videoUrl, bookName);
        } else {
            alert('该视频还未生成完成');
        }
    });

    // 播放视频
    function playVideo(videoUrl, title) {
        const modal = $('#videoModal');
        const modalTitle = $('#videoModalTitle');
        const modalVideo = $('#modalVideo');
        
        modalTitle.text(title);
        modalVideo.attr('src', videoUrl);
        
        // 显示模态框
        modal.modal('show');
    }

    // 模态框关闭时停止视频
    $('#videoModal').on('hidden.bs.modal', function() {
        const modalVideo = $('#modalVideo');
        modalVideo.attr('src', '');
    });

    // 键盘事件支持
    $(document).keydown(function(e) {
        if (e.key === 'ArrowLeft' && currentPage > 1) {
            currentPage--;
            loadVideoData();
        } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
            currentPage++;
            loadVideoData();
        }
    });

    // 窗口调整时重新布局
    let resizeTimer;
    $(window).resize(function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            // 可以在这里添加响应式调整逻辑
        }, 250);
    });
});