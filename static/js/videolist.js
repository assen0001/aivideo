$(document).ready(function() {
    // 从配置读取URL
    let config = {};
    $.ajax({
        url: '/get_config',
        async: false,
        success: function(data) {
            config = data;
        }
    });
     
     const COMFYUI_URL_WAN = config['COMFYUI_URL_WAN_PROXY'];

    // 全局变量：当前页码
    let currentPage = 1;
    // 全局变量：定时器ID
    let load_videolist_interval;
     
    // Cookie操作函数
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i=0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
        }
        return null;
    }

    // 加载书单数据
    function loadBooklists() {
        $.get('/get_booklists', function(data) {
            const bookSelect = $('#bookSelect');
            bookSelect.empty();
            bookSelect.append('<option value="">-- 请选择 --</option>');
            data.forEach(book => {
                bookSelect.append(`<option value="${book.id}">${book.book_name}</option>`);
            });

            // 加载完成后检查是否有保存的书单选择
            const savedBookId = getCookie('selectedBookId');
            if (savedBookId) {
                bookSelect.val(savedBookId);
                loadVideos(savedBookId);
            }
        }).fail(function() {
            console.error('加载书单失败');
        });
    }

    // 加载视频数据
    function loadVideos(bookId, page = 1) {
        $.get(`/get_videos/${bookId}`, {page: page, per_page: 10}, function(data) {
            const tbody = $('#videosTable tbody');
            tbody.empty();
            
            // 更新分页信息
            $('#startRecord').text((data.page - 1) * data.per_page + 1);
            $('#endRecord').text(Math.min(data.page * data.per_page, data.total));
            $('#totalRecords').text(data.total);

            // 更新全局当前页码
            currentPage = data.page;
            
            // 渲染分页控件
            renderVideosPagination(data.page, data.total_pages);
            
            data.data.forEach(video => {
                const videoUrls = video.video_urls ? video.video_urls.split(',') : [];
                const videoStatuses = video.video_statuses ? video.video_statuses.split(',') : [];
                
                const videoCells = videoUrls.map((url, index) => {
                    const status = index < videoStatuses.length ? videoStatuses[index] : '0';
                    return renderVideoCell(url, video.image_id, status);
                }).join('');

                const row = `
                    <tr data-video-id="${video.video_id}">
                        <td class="text-center">${video.image_id}</td>
                        <td>${video.paragraph_initial || ''}</td>
                        <td>
                            <div class="w-full">
                                <div class="flex flex-wrap gap-4 items-start">
                                    ${videoCells}
                                </div>
                                <div class="flex flex-wrap gap-4 items-start">
                                    ${renderStatusCheckboxes(videoUrls, videoStatuses, video.video_id)}
                                </div>
                            </div>                            
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });

        });
    }

    // 渲染视频单元格
    function renderVideoCell(url, imageId, status) {
        if (!url) return '';
        
        const fullUrl = `${COMFYUI_URL_WAN}/view?filename=${url}`;
        return ` 
            <div class="video-thumbnail-container" style="width: 200px; margin-top: 10px;">
                <video src="${fullUrl}" class="video-thumbnail mx-auto border-2 border-gray-200 rounded-lg" data-url="${url}" data-image-id="${imageId}" controls> </video>
            </div>
        `;
    }

    // 渲染状态checkbox
    function renderStatusCheckboxes(urls, statuses, videoId) {
        return urls.map((url, index) => {
            const status = index < statuses.length ? statuses[index] : '0';
            return `
                <div class="flex justify-center items-center space-x-2" style="width: 200px; margin-bottom: 10px;">
                    <!-- 这里增加一个"重做"按钮 -->
                    <button class="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 btn-redo-video" data-video-id="${videoId}" data-url="${url}">重做</button>
                    <!-- 这里增加一个“下载”按钮 -->
                    <button class="px-3 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600 btn-download-video" data-video-id="${videoId}" data-url="${url}">下载</button>
                </div>
            `;
        }).join('');
    }

    // 绑定重做视频按钮事件
    $(document).on('click', '.btn-redo-video', function() {
        const videoId = $(this).data('video-id');
        const url = $(this).data('url');
        if (confirm('确定要重做这条视频吗？')) {
            // 发送POST请求并不处理回调
            $.ajax({
                url: `/call_redo3_video`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({                   
                    video_url: url,
                }),
                success: function() {
                    // 提示后由用户自行刷新
                    console.log('已发送重做视频任务。');

                    clearInterval(load_videolist_interval);
                    load_videolist_interval = setInterval(load_videoslist, 60000);
                },
                error: function(xhr) {
                    try {
                        // 尝试解析JSON响应
                        var errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse.message) {
                            alert('错误: ' + errorResponse.message);
                        } else {
                            alert('请求失败: ' + xhr.status + ' ' + xhr.statusText);
                        }
                    } catch (e) {
                        // 如果解析失败，显示默认错误信息
                        alert('请求失败: ' + xhr.status + ' ' + xhr.statusText);
                    }
                }
            });
        }
    });

    // 渲染视频分页控件
    function renderVideosPagination(currentPage, totalPages) {
        const pagination = $('#videosPagination');
        pagination.empty();

        // 上一页按钮
        const prevDisabled = currentPage <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-100 hover:text-gray-700 cursor-pointer';
        pagination.append(`
            <li class="page-item" id="prevPage">
                <a class="page-link block px-3 py-2 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg ${prevDisabled}" href="#" data-page="${currentPage - 1}">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `);

        // 页码按钮
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === currentPage 
                ? 'text-blue-600 bg-blue-50 border-blue-300' 
                : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-100 hover:text-gray-700';
            pagination.append(`
                <li class="page-item">
                    <a class="page-link block px-3 py-2 leading-tight border ${activeClass}" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }

        // 下一页按钮
        const nextDisabled = currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-gray-100 hover:text-gray-700 cursor-pointer';
        pagination.append(`
            <li class="page-item" id="nextPage">
                <a class="page-link block px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg ${nextDisabled}" href="#" data-page="${currentPage + 1}">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `);

        // 绑定分页事件
        $('.page-link').off('click').on('click', function(e) {
            e.preventDefault();
            const page = $(this).data('page');
            const bookId = $('#bookSelect').val();
            if (bookId) {
                loadVideos(bookId, page);
            }
        });
    }


    // 页面加载时初始化
    loadBooklists();

    // 书单选择变化事件
    $('#bookSelect').change(function() {
        const bookId = $(this).val();
        if (bookId) {
            setCookie('selectedBookId', bookId, 7); // 保存7天
            currentPage = 1;  // 重置当前页码为第一页
            loadVideos(bookId, currentPage);
        } else {
            document.cookie = 'selectedBookId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            $('#videosTable tbody').empty();
        }
    });


    // 生成视频按钮点击事件
    $('#generateVideosBtn').click(function() {       
        // 获取当前下拉控件所选中的书单ID
        const bookId = $('#bookSelect').val();
        if (!bookId) {
            alert('请先选择书单！');
            return;
        }

        // 弹出确认窗口
        if (!confirm('视频生成时间较长，请稍后返回页面查看，是否继续生成？')) {
            return;
        }

        // 设置按钮为禁用状态，防止重复点击
        $(this).prop('disabled', true);
        
        // 发送AJAX POST请求
        const url = `/call_job3_video`;
        $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                book_id: bookId,
            }),
            success: function(data) {
                console.log('视频生成请求已发送');
                alert('视频生成请求已发送成功！');
            },
            error: function(xhr) {
                console.error('视频生成请求失败:', xhr.status, xhr.statusText);
                // 当状态码为403时，尝试提取返回的JSON错误信息
                if (xhr.status === 403) {
                    const res = JSON.parse(xhr.responseText);
                    if (res.status === 'error' && res.message) {
                        alert(res.message);
                        return;
                    }
                }
                alert('视频生成请求失败，请稍后重试！');
            },
            complete: function() {
                // 无论成功或失败，都重新启用按钮
                // $('#generateVideosBtn').prop('disabled', false);
            }
        });
        
        clearInterval(load_videolist_interval);
        load_videolist_interval = setInterval(load_videoslist, 60000);
    });

    // 绑定下载视频按钮事件
    $(document).on('click', '.btn-download-video', function() {
        const videoId = $(this).data('video-id');
        const url = $(this).data('url');
        const fullUrl = `${COMFYUI_URL_WAN}/view?filename=${url}`;
        window.open(fullUrl, '_blank');
    });
    
    // 加载视频列表
    function load_videoslist() {        
        const bookId = $('#bookSelect').val();
        if (bookId) {
            loadVideos(bookId, currentPage);
            console.log('加载视频列表...，当前页码：', currentPage);
        }  
    }

});
