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
                loadSubtitleContent(savedBookId);
            }
        }).fail(function() {
            console.error('加载书单失败');
        });
    }

    // 加载字幕内容
    function loadSubtitleContent(bookId) {
        $.ajax({
            url: '/get_subtitle_content?book_id=' + bookId,
            type: 'GET',
            success: function(data) {
                if (data && data.paragraph_initial) {
                    $('#subtitleContent').val(data.paragraph_initial.replace(/\\n/g, '\n'));
                } else {
                    $('#subtitleContent').val('该书单暂无字幕内容');
                }
            },
            // error: function() {
            //     alert('加载字幕内容失败');
            // }
        });
    }

    
    // 提交按钮点击事件
    $('#submitBtn').click(function() {
        if (confirm('是否提交字幕转语音？')) {
            const bookId = $('#bookSelect').val();
            const voiceType = $('input[name="voiceType"]:checked').val();
            const subtitleContent = $('#subtitleContent').val();
            const speed = $('#speedSlider').val();
            
            if (!bookId || !subtitleContent) {
                alert('请先选择书单并加载字幕内容');
                return;
            }
    
            // 禁用按钮并显示"转换中..."文字
            const $submitBtn = $(this);
            $submitBtn.prop('disabled', true).text('语音转换中...').addClass('disabled');
            
            // 发送请求
            $.ajax({
                url:  `/txt2voice_create`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    book_id: bookId,
                    speaker_wav: voiceType,
                    speed: speed
                }),
                success: function(response) {
                    console.log('语音生成请求已提交成功');
                    // alert('语音生成请求已提交，系统正在处理，请稍后刷新页面查看结果');
                    $submitBtn.prop('disabled', false).text('字幕转换成语音').removeClass('disabled');
                    // 刷新本页面
                    location.reload();
                    // 可以考虑添加一个轮询函数来检查生成状态
                },
                error: function(xhr, status, error) {
                    console.error('合成请求失败:', error);
                    if (xhr.status === 403) {
                        const resp = xhr.responseJSON || {};
                        alert(resp.message);
                    } else {
                        alert('合成请求失败，请重试');
                    }
                    $submitBtn.prop('disabled', false).text('字幕转换成语音').removeClass('disabled');
                }
            });
        }
    });

    // 加载书单数据
    loadBooklists();
    
    // 为音色选项添加点击播放功能
    $('input[name="voiceType"]').on('click', function() {
        const audioUrl = `/static/speaker/${$(this).val()}`;
        const audio = new Audio(audioUrl);
        audio.play();
    });

    // 语速控制滑块联动
    $('#speedSlider').on('input', function() {
        const speedValue = $(this).val();
        $('#speedValue').text(speedValue);
    });

    // 加载语音列表
    function loadVoiceList(bookId) {
        if (!bookId) {
            $('#voiceListContainer').hide();
            return;
        }

        $.ajax({
            url: '/get_voice_list?book_id=' + bookId,
            type: 'GET',
            success: function(data) {
                const voiceList = $('#voiceList');
                voiceList.empty();
                
                if (data && data.length > 0) {
                    $('#voiceListContainer').show();
                    data.forEach(voice => {                        
                        console.log("日期："+voice.create_time);
                        const audioElement = `
                            <div class="mb-4 flex flex-col md:flex-row md:items-center">                                
                                <audio controls class="w-full md:w-3/5">
                                    <source src="/${voice.voice_url}" type="audio/mpeg">
                                    您的浏览器不支持音频元素
                                </audio>
                                <div class="mt-2 md:mt-0 md:ml-4 flex flex-col md:flex-row md:items-center">
                                    <div class="flex items-center mb-2 md:mb-0">
                                        <span class="mr-2">是否选中：</span>
                                        <input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-linear rounded focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" ${voice.voice_status === 1 ? 'checked' : ''} 
                                            onchange="updateVoiceStatus(${voice.id}, this.checked ? 1 : 0)">
                                    </div>
                                    <div class="flex items-center mb-2 md:mb-0 md:ml-4">
                                        <span class="mr-2">生成时间：</span>
                                        <small class="text-gray-500">${formatDateTime(voice.create_time)}</small>
                                    </div>
                                    <div class="flex space-x-2 md:ml-4">
                                        <button class="bg-red-500 hover:bg-red-700 text-white py-1 px-3 rounded text-sm transition duration-150 ease-in-out" onclick="deleteVoice(${voice.id})">删除</button>
                                        <button class="bg-blue-500 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm transition duration-150 ease-in-out" onclick="downloadVoice(${voice.id}, '${voice.voice_url}')">下载</button>
                                    </div>
                                </div>
                            </div>
                        `;
                        voiceList.append(audioElement);
                    });                              
                } else {
                    $('#voiceListContainer').hide();
                }
            },
            error: function() {
                console.error('加载语音列表失败');
            }            
        });
    }

    // 书单选择变化事件
    $('#bookSelect').change(function() {
        const bookId = $(this).val();
        if (bookId) {
            setCookie('selectedBookId', bookId, 7); // 保存7天
            loadSubtitleContent(bookId);
            loadVoiceList(bookId);
        } else {
            $('#subtitleContent').val('');
            $('#voiceListContainer').hide();
        }
    });

    // 初始化时加载语音列表（如果有选中的书单）
    const savedBookId = getCookie('selectedBookId');
    if (savedBookId) {
        loadVoiceList(savedBookId);
    }

    // 更新语音状态
    window.updateVoiceStatus = function(voiceId, status) {
        $.ajax({
            url: '/update_voice_status',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                voice_id: voiceId,
                status: status
            }),
            success: function() {
                console.log('语音状态更新成功');
            },
            error: function(xhr, status, error) {
                console.error('语音状态更新失败:', error);
                alert('语音状态更新失败，请重试');
            }
        });
    }

    // 删除语音
    window.deleteVoice = function(voiceId) {
        if (confirm('确定要删除这条语音吗？')) {
            $.ajax({
                url: '/delete_voice',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    voice_id: voiceId
                }),
                success: function() {
                    // 重新加载语音列表
                    const bookId = $('#bookSelect').val();
                    loadVoiceList(bookId);
                    console.log('语音删除成功');
                },
                error: function(xhr, status, error) {
                    console.error('语音删除失败:', error);
                     const resp = xhr.responseJSON || {};
                    if (xhr.status === 403) {                       
                        alert(resp.message);                        
                    } else if (xhr.status === 400) {
                        alert(resp.message);  
                    } else {
                        alert('语音删除失败，请重试');
                    }
                }
            });
        }
    }

    // 下载语音
    window.downloadVoice = function(voiceId, filename) {
        const link = document.createElement('a');
        link.href = `/${filename}`;
        link.target = '_blank';  // 在新窗口中打开
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

});
