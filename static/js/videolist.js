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
     
     const N8N_URL = config.N8N_URL;
     const COMFYUI_URL = config.COMFYUI_URL;  
     const INDEXTTS_URL = config.INDEXTTS_URL;
     const AIBOOKVIDEO_URL = config.AIBOOKVIDEO_URL;
     const COMFYUI_URL_WAN = config.COMFYUI_URL_WAN;   
     const COMFYUI_URL_PATH = config.COMFYUI_URL_PATH;                 
     
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
                        <td>${video.image_id}</td>
                        <td>${video.paragraph_initial || ''}</td>
                        <td>
                            <div class="d-flex flex-wrap gap-2">
                                ${videoCells}
                            </div>
                            <div class="d-flex flex-wrap gap-2">
                                ${renderStatusCheckboxes(videoUrls, videoStatuses, video.video_id)}
                            </div>                            
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });

            // 绑定状态checkbox事件
            // $('.video-status-checkbox').change(updateVideoStatus);
            // 绑定删除按钮事件
            // $(document).on('click', '.delete-btn', function() {
            //     const videoUrl = $(this).data('url');
            //     deleteVideo(videoUrl);
            // });

        });
    }

    // 绑定重做按钮事件
    $(document).on('click', '.btn-redo-video', function() {
        const videoUrl = $(this).data('url');
        redoVideo(videoUrl);
    });

    // 渲染视频分页控件
    function renderVideosPagination(currentPage, totalPages) {
        const pagination = $('#videosPagination');
        pagination.empty();

        // 上一页按钮
        pagination.append(`
            <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}" id="prevPage">
                <a class="page-link" href="#" data-page="${currentPage - 1}">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `);

        // 页码按钮
        for (let i = 1; i <= totalPages; i++) {
            pagination.append(`
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }

        // 下一页按钮
        pagination.append(`
            <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}" id="nextPage">
                <a class="page-link" href="#" data-page="${currentPage + 1}">
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

    // 渲染视频单元格
    function renderVideoCell(url, imageId, status) {
        if (!url) return '';
        
        const fullUrl = `${COMFYUI_URL_WAN}/view?filename=${url}`;
        return `
            <div class="video-thumbnail-container">
                <video src="${fullUrl}" 
                     class="video-thumbnail img-thumbnail" 
                     data-url="${url}"
                     data-image-id="${imageId}"
                     style="width:200px; height:266px;"
                     controls>
                </video>
            </div>
        `;
    }

    // 渲染状态checkbox
    function renderStatusCheckboxes(urls, statuses, videoId) {
        return urls.map((url, index) => {
            const status = index < statuses.length ? statuses[index] : '0';
            return `
                <div class="form-statustitle">
                    <!-- 
                    // 暂时删除
                    是否选中：                      
                    <input class="form-check-input video-status-checkbox" type="checkbox" data-url="${url}" ${status === '1' ? 'checked' : ''}>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <button class="btn btn-danger btn-sm delete-btn" data-video-id="${videoId}" data-url="${url}">删除</button> 
                    -->
                    <!-- 这里增加一个"重做"按钮 -->
                    <button class="btn btn-sm btn-success btn-redo-video" data-video-id="${videoId}" data-url="${url}">重做</button> 
                    <!-- 这里增加一个“下载”按钮 -->
                    <button class="btn btn-sm btn-success btn-download-video" data-video-id="${videoId}" data-url="${url}">下载</button> 
                </div>
            `;
        }).join('');
    }

    // 更新视频状态
    // function updateVideoStatus() {
    //     const checkbox = $(this);
    //     const url = checkbox.data('url');
    //     const value = checkbox.is(':checked') ? '1' : '0';
        
    //     $.ajax({
    //         url: '/update_video_status',
    //         method: 'POST',
    //         contentType: 'application/json',
    //         data: JSON.stringify({
    //             video_url: url,
    //             value: value
    //         }),
    //         success: function() {
    //             console.log('视频状态更新成功');
    //         }
    //     });
    // }

    // 删除视频
    // function deleteVideo(video_url) {
    //     if (confirm('确定要删除这条记录吗？')) {
    //         $.ajax({
    //             url: '/delete_video',
    //             method: 'POST',
    //             contentType: 'application/json',
    //             data: JSON.stringify({
    //                 url: video_url
    //             }),
    //             success: function() {
    //                 console.log('视频删除成功');
    //                 // 删除成功后刷新列表
    //                 const bookId = $('#bookSelect').val();
    //                 if (bookId) {
    //                     loadVideos(bookId);
    //                 }
    //             },
    //             error: function() {
    //                 console.error('删除失败');
    //                 alert('删除失败');
    //             }
    //         });
    //     }
    // }

    // 重做视频
    function redoVideo(videoUrl) {
        if (confirm('确定要重做这条视频吗？')) {
            // 发送POST请求并不处理回调
            $.ajax({
                url: `${N8N_URL}/webhook/44128795-31ec-46a3-9bbc-94be698373c1`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({                   
                    video_url: videoUrl,
                    comfyui_url: COMFYUI_URL,
                    comfyui_url_wan: COMFYUI_URL_WAN,
                    comfyui_url_path: COMFYUI_URL_PATH
                })
            });            

            // 提示后由用户自行刷新
            alert('已发送视频生成任务，请等待5-10分钟（视GPU算力）后再手动刷新本页');
        }
    }

    // 页面加载时初始化
    loadBooklists();

    // 书单选择变化事件
    $('#bookSelect').change(function() {
        const bookId = $(this).val();
        if (bookId) {
            setCookie('selectedBookId', bookId, 7); // 保存7天
            loadVideos(bookId);
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
        const url = `${N8N_URL}/webhook/5c0c07eb-7d11-4b5f-a157-af0838e355fc`;
        
        $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                book_id: bookId,
                aibookvideo_url: AIBOOKVIDEO_URL,
                n8n_url: N8N_URL,
                comfyui_url: COMFYUI_URL,
                comfyui_url_wan: COMFYUI_URL_WAN,   
                comfyui_url_path: COMFYUI_URL_PATH,                 
                indextts_url: INDEXTTS_URL
            }),
            success: function(data) {
                console.log('视频生成请求已发送');
                alert('视频生成请求已发送成功！');
            },
            error: function(xhr) {
                console.error('视频生成请求失败:', xhr.status, xhr.statusText);
                alert('视频生成请求失败，请稍后重试！');
            },
            complete: function() {
                // 无论成功或失败，都重新启用按钮
                // $('#generateVideosBtn').prop('disabled', false);
            }
        });
    });

    // 下载视频功能
    $(document).on('click', '.btn-download-video', function() {
        // 弹出确认对话框
        // if (!confirm('确定要下载这个视频吗？')) { return; }
        
        // 获取data-url值
        const url = $(this).data('url');
        
        // 拼接完整的视频URL
        const fullUrl = `${COMFYUI_URL_WAN}/view?filename=${url}`;
        
        // 创建隐藏的下载链接并触发点击
        const downloadLink = document.createElement('a');
        downloadLink.href = fullUrl;
        downloadLink.download = url; // 使用原始文件名作为下载文件名
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
    
});
