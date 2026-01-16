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

    const COMFYUI_URL = config['COMFYUI_URL_PROXY'];
    const COMFYUI_URL_WAN = config['COMFYUI_URL_WAN_PROXY'];
    
    // 全局变量：当前页码
    let currentPage = 1;
    // 全局变量：定时器ID
    let load_imageslist_interval;
    
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
                loadImages(savedBookId);
            }
        }).fail(function() {
            console.error('加载书单失败');
        });
    }

    // 加载图片数据
    function loadImages(bookId, page = 1) {
        $.get(`/get_images/${bookId}`, {page: page, per_page: 5}, function(data) {
            const tbody = $('#imagesTable tbody');
            tbody.empty();
            
            // 更新分页信息
            $('#startRecord').text((data.page - 1) * data.per_page + 1);
            $('#endRecord').text(Math.min(data.page * data.per_page, data.total));
            $('#totalRecords').text(data.total);
            
            // 更新全局当前页码
            currentPage = data.page;
            
            // 渲染分页控件
            renderImagesPagination(data.page, data.total_pages);
            
            data.data.forEach(image => {
                const row = `
                    <tr>
                        <td class="text-center">${image.id}</td>
                        <td><textarea rows="4" data-id="${image.id}" data-field="paragraph_initial" 
                              class="w-full px-3 py-2 border border-gray-300 rounded-md paragraph-input">${image.paragraph_initial || ''}</textarea>
                              <br>
                              <button class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 btn-generate-prompt" data-id="${image.id}">生成提示词</button>
                              <button class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 btn-refresh-image" data-id="${image.id}">刷新图片</button>                         
                        </td>
                        <td>
                            <textarea rows="4" data-id="${image.id}" data-field="paragraph_prompt_cn" 
                              class="w-full px-3 py-2 border border-gray-300 rounded-md paragraph-input">${image.paragraph_prompt_cn || ''}</textarea>
                            <br>
                            <select class="w-full px-3 py-2 border border-gray-300 rounded-md" name="camera_movement" id="camera_movement" data-id="${image.id}" data-field="camera_movement">
                                <option value="">-- 请选择运镜动作 --</option>
                                <option value="镜头向上移动" ${image.camera_movement == '镜头向上移动' ? 'selected' : ''}>镜头向上移动</option>
                                <option value="镜头向下移动" ${image.camera_movement == '镜头向下移动' ? 'selected' : ''}>镜头向下移动</option>
                                <option value="镜头向左平移" ${image.camera_movement == '镜头向左平移' ? 'selected' : ''}>镜头向左平移</option>
                                <option value="镜头向右平移" ${image.camera_movement == '镜头向右平移' ? 'selected' : ''}>镜头向右平移</option>
                                <option value="镜头推近" ${image.camera_movement == '镜头推近' ? 'selected' : ''}>镜头推近</option>
                                <option value="镜头拉远" ${image.camera_movement == '镜头拉远' ? 'selected' : ''}>镜头拉远</option>
                                <option value="镜头向左弧形移动" ${image.camera_movement == '镜头向左弧形移动' ? 'selected' : ''}>镜头向左弧形移动</option>
                                <option value="镜头向右弧形移动" ${image.camera_movement == '镜头向右弧形移动' ? 'selected' : ''}>镜头向右弧形移动</option>
                                <option value="镜头从平视逐渐上升，最后俯拍" ${image.camera_movement == '镜头从平视逐渐上升，最后俯拍' ? 'selected' : ''}>镜头从平视逐渐上升，最后俯拍</option>
                                <option value="镜头逐渐拉远，展现环境全貌" ${image.camera_movement == '镜头逐渐拉远，展现环境全貌' ? 'selected' : ''}>镜头逐渐拉远，展现环境全貌</option>
                                <option value="镜头环绕主体360°旋转一周" ${image.camera_movement == '镜头环绕主体360°旋转一周' ? 'selected' : ''}>镜头环绕主体360°旋转一周</option>
                                <option value="镜头先特写面部，再向下摇到脚步" ${image.camera_movement == '镜头先特写面部，再向下摇到脚步' ? 'selected' : ''}>镜头先特写面部，再向下摇到脚步</option>
                                <option value="镜头跟随主体向前奔跑，保持同步移动" ${image.camera_movement == '镜头跟随主体向前奔跑，保持同步移动' ? 'selected' : ''}>镜头跟随主体向前奔跑，保持同步移动</option>
                                <option value="镜头从全景快速推至特写" ${image.camera_movement == '镜头从全景快速推至特写' ? 'selected' : ''}>镜头从全景快速推至特写</option>
                                <option value="镜头缓慢升空俯拍，同时顺时针旋转" ${image.camera_movement == '镜头缓慢升空俯拍，同时顺时针旋转' ? 'selected' : ''}>镜头缓慢升空俯拍，同时顺时针旋转</option>
                                <option value="镜头在前景遮挡物后方滑过，形成"揭示"效果" ${image.camera_movement == '镜头在前景遮挡物后方滑过，形成"揭示"效果' ? 'selected' : ''}>镜头在前景遮挡物后方滑过，形成"揭示"效果</option>
                            </select>
                        </td>
                        <td>
                            ${renderImageCell(image.images_url_01, image.id, 'images_status_01', image.images_status_01)}
                        </td>
                        <td>
                            ${renderImageCell(image.images_url_02, image.id, 'images_status_02', image.images_status_02)}
                        </td>
                        <td>
                            ${renderImageCell(image.images_url_03, image.id, 'images_status_03', image.images_status_03)}
                        </td>
                        <td>
                            ${renderImageCell(image.images_url_04, image.id, 'images_status_04', image.images_status_04)}
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });

            // 绑定事件：生成提示词            
            $('.btn-generate-prompt').click(function() {
                if (!confirm('确定要生成提示词吗？')) return;
                const imageId = $(this).data('id');
                const url = `/call_redo1_prompt?id=${imageId}&type=fenjing`;
                $.get(url, function(data) {
                    console.log('提示词生成请求已发送');
                });

                setTimeout(load_imageslist, 10000);
                // clearInterval(load_imageslist_interval);
                // load_imageslist_interval = setInterval(load_imageslist, 6000);
            });
            
            // 绑定事件：刷新图片
            $('.btn-refresh-image').click(function() {
                // if (!confirm('确定要刷新图片吗？')) return;
                const imageId = $(this).data('id');
                $.ajax({
                    url: '/get_images_by_id',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({id: imageId}),
                    success: function(response) {
                        // 更新4个图片单元格
                        updateImageCell(imageId, 'images_url_01', response.images_url_01);
                        updateImageCell(imageId, 'images_url_02', response.images_url_02);
                        updateImageCell(imageId, 'images_url_03', response.images_url_03);
                        updateImageCell(imageId, 'images_url_04', response.images_url_04);
                    }
                });
            });

            // 绑定双击事件：paragraph_prompt_cn
            $('#imagesTable').on('dblclick', 'textarea[data-field="paragraph_prompt_cn"]', function(e) {
                e.stopPropagation();
                const $this = $(this);
                const id = $this.data('id');
                $.ajax({
                    url: '/get_images_by_id',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({id: id}),
                    success: function(response) {
                        if (response.status === 'success') {
                            $this.val(response.paragraph_prompt_cn).trigger('input');
                        }
                    }
                });
            });

            // 绑定运镜动作下拉框change事件
            $(document).on('change', 'select[name="camera_movement"]', function() {
                const id = $(this).data('id');
                const field = $(this).data('field');
                const value = $(this).val();
                updateParagraph(id, field, value);
            });
        });
    }

    // 渲染图片分页控件
    function renderImagesPagination(currentPage, totalPages) {
        const pagination = $('#imagesPagination');
        pagination.empty();

        // 上一页按钮
        pagination.append(`
            <li class="${currentPage <= 1 ? 'disabled' : ''}" id="prevPage">
                <a class="px-3 py-1 rounded border ${currentPage <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}" href="#" data-page="${currentPage - 1}">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `);

        // 页码按钮 - 显示所有页码
        for (let i = 1; i <= totalPages; i++) {
            pagination.append(`
                <li class="${i === currentPage ? 'active' : ''}">
                    <a class="px-3 py-1 rounded border ${i === currentPage ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }

        // 下一页按钮
        pagination.append(`
            <li class="${currentPage >= totalPages ? 'disabled' : ''}" id="nextPage">
                <a class="px-3 py-1 rounded border ${currentPage >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}" href="#" data-page="${currentPage + 1}">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `);

        // 绑定分页事件
        $('#imagesPagination').off('click', 'a').on('click', 'a', function(e) {
            e.preventDefault();
            const page = $(this).data('page');
            const bookId = $('#bookSelect').val();
            if (bookId) {
                loadImages(bookId, page);
            }
        });
    }

    // 渲染图片单元格
    function renderImageCell(url, id, field, status) {
        if (!url) return '';
        
        const fullUrl = `${COMFYUI_URL}/view?filename=${url}`;
        field_url = field.replace("status", "url")
        return `
            <div class="image-cell text-center my-[10px]">
                <img src="${fullUrl}" alt="图片" class="mx-auto border-2 border-gray-200 rounded-lg" data-url="${url}">
                <div class="flex gap-2 justify-center mt-2">
                    <button class="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 btn-redo-image" data-id="${id}" data-field="${field_url}">重做</button>
                    <button class="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 btn-download-image" data-image-id="${id}" data-url="${url}">下载</button> 
                </div>
            </div>
        `;
    }

    // 绑定事件：blur自动保存文本框值 - 放在loadImages外部，只绑定一次
    $(document).on('blur', '.paragraph-input', function() {
        const id = $(this).data('id');
        const field = $(this).data('field');
        const value = $(this).val();
        updateParagraph(id, field, value);
    });

    // 自动更新文本框内容
    function updateParagraph(id, field, value) {
        $.ajax({
            url: '/update_paragraph',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                id: id,
                field: field,
                value: value
            }),
            success: function() {
                console.log('段落更新成功');
            }
        });
    }

    // 绑定删除图片按钮事件
    // $(document).on('click', '.btn-delete-image', deleteImage);

    // 删除图片
    // function deleteImage() {
    //     const button = $(this);
    //     const id = button.data('id');
    //     const field = button.data('field');
    //     const imageField = field.replace('_status_', '_url_');
        
    //     if (!confirm('确定要删除这张图片吗？')) return;
        
    //     $.ajax({
    //         url: '/delete_image',
    //         method: 'POST',
    //         contentType: 'application/json',
    //         data: JSON.stringify({
    //             id: id,
    //             field: imageField
    //         }),
    //         success: function() {
    //             button.closest('.image-cell').remove();
    //         }
    //     });
    // }
    
    // 绑定重做图片按钮事件
    $(document).on('click', '.btn-redo-image', function() {
        if (confirm('确定要重做张图片吗？')) {
            const id = $(this).data('id');
            const field = $(this).data('field');
            const url = `/call_redo2_images`;
            $.ajax({
                url: url,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    id: id,
                    field: field,
                }),
                success: function() {
                    console.log('重做图片请求已发送');

                    clearInterval(load_imageslist_interval);
                    load_imageslist_interval = setInterval(load_imageslist, 60000);
                },
                error: function(xhr) {
                    console.error('重做图片请求失败:', xhr.status, xhr.statusText);
                }
            });
        }
    });

    // 下载图片功能
    $(document).on('click', '.btn-download-image', function() {
        // 弹出确认对话框
        // if (!confirm('确定要下载这个图片吗？')) { return; }
        
        // 获取data-url值
        const url = $(this).data('url');
        
        // 拼接完整的图片URL
        const fullUrl = `${COMFYUI_URL}/view?filename=${url}`;
        
        // 创建隐藏的下载链接并触发点击
        const downloadLink = document.createElement('a');
        downloadLink.href = fullUrl;
        downloadLink.download = url; // 使用原始文件名作为下载文件名
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
    
    // 绑定图片点击事件
    $(document).on('click', '.image-cell img', function() {
        const url = $(this).data('url');
        handleImageClick(url, this);
    });

    // 处理图片点击事件
    function handleImageClick(url, imgElement) {
        $.ajax({
            url: '/get_video_url',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({images_url: url}),
            success: function(response) {
                if (response.video_url) {
                    const videoUrl = `${COMFYUI_URL_WAN}/view?filename=${response.video_url}`;
                    const videoElement = createVideoElement(videoUrl, imgElement);
                    imgElement.parentNode.replaceChild(videoElement, imgElement);
                }
            },
            error: function(xhr) {
                console.error('Error:', xhr.status, xhr.statusText);
            }
        });
    }

    // 创建视频元素
    function createVideoElement(videoUrl, originalImg) {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.width = 200;
        video.height = 266;
        video.controls = true;
        video.autoplay = true;
        video.className = 'mx-auto border-2 border-gray-200 rounded-lg';
        
        video.addEventListener('ended', function() {
            this.parentNode.replaceChild(originalImg, this);
        });
        
        return video;
    }

    // 更新图片单元格
    function updateImageCell(imageId, field, url) {
        if (!url) return;
        const fullUrl = `${COMFYUI_URL}/view?filename=${url}`;
        
        // 根据field确定是第几个图片单元格 (01-04)
        const imgIndex = parseInt(field.split('_').pop());
        
        // 图片单元格从第4列开始(第1列是ID，第2-3列是文本)
        const cellIndex = imgIndex + 3; 
        
        // 找到对应行的图片单元格
        const row = $(`tr:has(td:first-child:contains(${imageId}))`);
        const img = row.find(`td:nth-child(${cellIndex}) img`);
        
        console.log(`更新图片: id=${imageId} field=${field} cellIndex=${cellIndex}`, row, img);
        
        if (img.length) {
            img.attr('src', fullUrl);
            img.attr('data-url', url.split('/').pop());
            console.log(`更新图片成功: ${field}`, img);
        } else {
            console.error(`未找到图片元素: ${field}`, row, img);
        }
    }

    // 页面加载时初始化
    loadBooklists();

    // 书单选择变化事件
    $('#bookSelect').change(function() {
        const bookId = $(this).val();
        if (bookId) {
            setCookie('selectedBookId', bookId, 7); // 保存7天
            currentPage = 1; // 切换书单时重置为第一页
            loadImages(bookId);
        } else {
            document.cookie = 'selectedBookId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            $('#imagesTable tbody').empty();
        }
    });

    // 生成图片按钮点击事件
    $('#generateImagesBtn').click(function() {       
        // 获取当前下拉控件所选中的书单ID
        const bookId = $('#bookSelect').val();
        if (!bookId) {
            alert('请先选择书单！');
            return;
        }

        // 弹出确认窗口
        if (!confirm('图片生成时间较长，请稍后返回页面查看，是否继续生成？')) {
            return;
        }

        // 设置按钮为禁用状态，防止重复点击
        $(this).prop('disabled', true);
        
        // 发送AJAX POST请求
        const url = `/call_job2_images`;        
        $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                book_id: bookId,
            }),
            success: function(data) {
                console.log('图片生成请求已发送');
                alert('图片生成请求已发送成功！');
            },
            error: function(xhr) {
                console.error('图片生成请求失败:', xhr.status, xhr.statusText);
                // 当状态码为403时，尝试提取返回的JSON错误信息
                if (xhr.status === 403) {
                    const res = JSON.parse(xhr.responseText);
                    if (res.status === 'error' && res.message) {
                        alert(res.message);
                        return;
                    }
                }
                alert('图片生成请求失败，请稍后重试！');
            },
            complete: function() {
                // 无论成功或失败，都重新启用按钮
                // $('#generateImagesBtn').prop('disabled', false);
            }
        });

        clearInterval(load_imageslist_interval);
        load_imageslist_interval = setInterval(load_imageslist, 60000);
    });


    // 加载图片列表
    function load_imageslist() {        
        const bookId = $('#bookSelect').val();
        if (bookId) {
            loadImages(bookId, currentPage);
            console.log('加载图片列表...，当前页码：', currentPage);
        }  
    }
    
});
