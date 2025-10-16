$(document).ready(function() {
    // 从配置读取URL
    // let config = {};
    // $.ajax({
    //     url: '/get_config',
    //     async: false,
    //     success: function(data) {
    //         config = data;
    //     }
    // });

    // const N8N_URL = config.N8N_URL;
    // const COMFYUI_URL = config.COMFYUI_URL;
    
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
            }
        }).fail(function() {
            console.error('加载书单失败');
        });
    }


    // 视频合成按钮点击事件
    $('#mergeBtn').click(function() {
        const bookId = $('#bookSelect').val();
        if (!bookId) {
            alert('请先选择书单');
            return;
        }

        if (confirm('确定要合成视频吗？')) {
            const $btn = $(this);
            $btn.prop('disabled', true);
            $btn.text('视频合成中...');

            $.ajax({
                url: '/create_video',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    book_id: bookId
                }),
                success: function() {
                    // 合成请求已发送，开始轮询检查结果
                    location.reload(); // 刷新页面
                },
                error: function(xhr, status, error) {
                    console.error('视频合成请求失败:', error);
                    alert('视频合成请求失败，请重试');
                    $btn.prop('disabled', false);
                    $btn.text('视频合成');
                    // location.reload(); // 刷新页面
                }
            });
        }
    });

    // 新增轮询检查函数
    // function startPolling(bookId, $btn) {
    //     const pollInterval = setInterval(function() {
    //         $.ajax({
    //             url: '/get_video_list?book_id=' + bookId,
    //             type: 'GET',
    //             success: function(data) {
    //                 // 检查是否有视频数据返回，如果有说明合成完成
    //                 if (data && data.length > 0) {
    //                     clearInterval(pollInterval);
    //                     alert('视频合成功能！');
    //                     location.reload(); // 刷新页面
    //                 }
    //             },
    //             error: function() {
    //                 // 如果获取失败，可能是还在处理中，继续轮询
    //                 console.log('正在等待视频合成完成...');
    //             }
    //         });
    //     }, 3000); // 每3秒检查一次
    // }

    // 页面加载时初始化
    loadBooklists();

    // 初始化时加载视频列表（如果有选中的书单）
    const savedBookId = getCookie('selectedBookId');
    if (savedBookId) {
        loadVideos(savedBookId);
    }

    // 日期格式化函数
    function formatDateTime(dateStr) {
        // 创建Date对象，然后减去8小时（8 * 60 * 60 * 1000 毫秒）
        const date = new Date(new Date(dateStr).getTime() - 8 * 60 * 60 * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // 加载视频列表
    function loadVideos(bookId) {
        if (!bookId) {
            $('#videoListContainer').hide();
            return;
        }

        $.ajax({
            url: '/get_video_list?book_id=' + bookId,
            type: 'GET',
            success: function(data) {
                const videoList = $('#videoList');
                videoList.empty();
                
                if (data && data.length > 0) {
                    $('#videoListContainer').show();
                    data.forEach(video => {
                        const videoElement = `
                            <div class="mb-4 d-flex">
                                <video width="460" height="613" controls style="background:#000">
                                    <source src="/${video.videomerge_url}" type="video/mp4">
                                    您的浏览器不支持视频播放
                                </video>
                                <div class="ms-4">
                                    <div class="mb-2">生成时间：${formatDateTime(video.create_time)}</div>
                                    <div class="mb-2">
                                        B站视频链接: 
                                        ${video.bilibili_url ? 
                                            `<a href="${video.bilibili_url}" target="_blank">${video.bilibili_url}</a>` : 
                                            '无链接'}
                                    </div>
                                    <div>
                                        <button class="btn btn-danger me-2" onclick="deleteVideo(${video.id})">删除</button>
                                        <button class="btn btn-primary" onclick="downloadVideo(${video.id}, '${video.videomerge_url}')">下载</button>
                                    </div>
                                </div>
                            </div>
                        `;
                        videoList.append(videoElement);
                    });
                } else {
                    $('#videoListContainer').hide();
                }
            },
            error: function() {
                console.error('加载视频列表失败');
            }
        });
    }

    // 删除视频
    window.deleteVideo = function(videoId) {
        if (confirm('确定要删除这个视频吗？')) {
            $.ajax({
                url: '/delete_videomerge',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    video_id: videoId
                }),
                success: function() {
                    const bookId = $('#bookSelect').val();
                    loadVideos(bookId);
                },
                error: function(xhr, status, error) {
                    console.error('视频删除失败:', error);
                    alert('视频删除失败，请重试');
                }
            });
        }
    }

    // 下载视频
    window.downloadVideo = function(videoId, filename) {
        // 弹出确认对话框
        if (!confirm('确定要下载这个视频吗？')) { return; } 
        
        const link = document.createElement('a');
        link.href = `/${filename}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 书单选择变化事件
    $('#bookSelect').change(function() {
        const bookId = $(this).val();
        if (bookId) {
            setCookie('selectedBookId', bookId, 7); // 保存7天
            loadVideos(bookId);
        } else {
            document.cookie = 'selectedBookId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            $('#videoListContainer').hide();
        }
    });

});
