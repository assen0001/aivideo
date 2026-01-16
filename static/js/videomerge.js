$(document).ready(function() {
    
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
                    alert(xhr.responseJSON ? (xhr.responseJSON.message || xhr.responseJSON.error) : '请求失败，请稍后重试');
                    $btn.prop('disabled', false);
                    $btn.text('视频合成');
                    // location.reload(); // 刷新页面
                }
            });
        }
    });

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
                            <div class="mb-6 flex flex-col md:flex-row gap-4 p-4 bg-white rounded-lg shadow">
                                <div class="md:w-2/3">
                                    <video width="${['4:3', '16:9'].includes(video.video_aspect) ? '100%' : '50%'}" height="auto" controls class="rounded-lg bg-black">
                                        <source src="/${video.videomerge_url}" type="video/mp4">
                                        您的浏览器不支持视频播放
                                    </video>
                                </div>
                                <div class="md:w-1/3">
                                    <div class="mb-3 text-sm text-gray-600">生成时间：${formatDateTime(video.create_time)}</div>
                                    <div class="mb-4">
                                        <div class="text-sm font-medium text-gray-700 mb-1">B站视频:</div>
                                        ${video.bilibili_url ? 
                                            `<div class="w-full">${video.bilibili_url}</div>` : 
                                            '<div class="text-sm text-gray-500">无链接</div>'}
                                    </div>
                                    <div class="flex flex-wrap gap-2">
                                        <button class="px-3 py-1.5 text-sm text-white bg-red-500 rounded hover:bg-red-600 transition-colors duration-200" onclick="deleteVideo(${video.id})">删除</button>
                                        <button class="px-3 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors duration-200" onclick="downloadVideo(${video.id}, '${video.videomerge_url}')">下载</button>
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
                    alert(xhr.responseJSON ? (xhr.responseJSON.message || xhr.responseJSON.error) : '删除失败，请稍后重试');
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
