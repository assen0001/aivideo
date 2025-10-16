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
    // const COQUITTS_URL = config.COQUITTS_URL;
    const INDEXTTS_URL = config.INDEXTTS_URL;
    const AIBOOKVIDEO_URL = config.AIBOOKVIDEO_URL;
    const COMFYUI_URL_WAN = config.COMFYUI_URL_WAN;
    
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
        $.get(`/get_images/${bookId}`, {page: page, per_page: 3}, function(data) {
            const tbody = $('#imagesTable tbody');
            tbody.empty();
            
            // 更新分页信息
            $('#startRecord').text((data.page - 1) * data.per_page + 1);
            $('#endRecord').text(Math.min(data.page * data.per_page, data.total));
            $('#totalRecords').text(data.total);
            
            // 渲染分页控件
            renderImagesPagination(data.page, data.total_pages);
            
            data.data.forEach(image => {
                const row = `
                    <tr>
                        <td>${image.id}</td>
                        <td><textarea rows="4" data-id="${image.id}" data-field="paragraph_initial" 
                              class="form-control paragraph-input">${image.paragraph_initial || ''}</textarea>
                              <br>
                            <textarea rows="2" data-id="${image.id}" data-field="images_supplement_prompt" 
                              class="form-control paragraph-input">${image.images_supplement_prompt || ''}</textarea>  
                              <br>
                              <button class="btn btn-sm btn-info btn-generate-prompt" data-id="${image.id}">生成提示词</button>
                              <button class="btn btn-sm btn-warning btn-translate" data-id="${image.id}">翻译</button>
                              <br>
                              <!-- <button class="btn btn-sm btn-success btn-generate-image" data-id="${image.id}">生成图片</button>  -->   
                              <button class="btn btn-sm btn-success btn-refresh-image" data-id="${image.id}">刷新图片</button>                         
                        </td>
                        <td>
                            <textarea rows="4" data-id="${image.id}" data-field="paragraph_prompt_cn" 
                              class="form-control paragraph-input">${image.paragraph_prompt_cn || ''}</textarea>
                            <br>
                            <textarea rows="4" data-id="${image.id}" data-field="paragraph_prompt_en" 
                              class="form-control paragraph-input">${image.paragraph_prompt_en || ''}</textarea>
                            <br>
                            <select class="form-select" name="camera_movement" id="camera_movement" data-id="${image.id}" data-field="camera_movement">
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
            $('.status-select').change(updateImageStatus);
            $('.btn-generate-prompt').click(function() {
                if (!confirm('确定要生成提示词吗？')) return;
                const imageId = $(this).data('id');
                const url = `${N8N_URL}/webhook/fe398694-255c-40fd-8acc-48da55ae70d1?id=${imageId}`;
                $.get(url, function(data) {
                    console.log('提示词生成请求已发送');
                });
            });
            
            // 绑定事件：中文翻译成英文(仅翻译)
            $('.btn-translate').click(function() {
                if (!confirm('确定要翻译吗？')) return;
                const imageId = $(this).data('id');
                const url = `${N8N_URL}/webhook/fe398694-255c-40fd-8acc-48da55ae70d1?id=${imageId}&translate=only`;
                $.ajax({
                    url: url,
                    method: 'GET',
                    success: function(data) {
                        console.log('翻译请求已发送');
                    },
                    error: function(xhr) {
                        console.error('翻译请求失败:', xhr.status, xhr.statusText);
                    }
                });
            });
            
            // 绑定事件：文生图(4个图)
            // $('.btn-generate-image').click(function() {
            //     const imageId = $(this).data('id');
            //     const url = `${N8N_URL}/webhook/ce63b3c1-9e01-4e45-ac3d-38c594a0fe22?id=${imageId}`;
            //     $.ajax({
            //         url: url,
            //         method: 'GET',
            //         success: function(data) {
            //             console.log('图片生成请求已发送');
            //         },
            //         error: function(xhr) {
            //             console.error('图片生成请求失败:', xhr.status, xhr.statusText);
            //         }
            //     });
            // });

            // 绑定事件：刷新图片
            $('.btn-refresh-image').click(function() {
                if (!confirm('确定要刷新图片吗？')) return;
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

            // 绑定事件：onchange自动保存文本框值
            $(document).on('input', '.paragraph-input', function() {
                const id = $(this).data('id');
                const field = $(this).data('field');
                const value = $(this).val();
                updateParagraph(id, field, value);
            });
            
            // 绑定双击事件：paragraph_prompt_en
            $('#imagesTable').on('dblclick', 'textarea[data-field="paragraph_prompt_en"]', function(e) {
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
                            $this.val(response.paragraph_prompt_en).trigger('input');
                        }
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
            <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}" id="prevPage">
                <a class="page-link" href="#" data-page="${currentPage - 1}">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `);

        // 页码按钮 - 显示所有页码
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
            <div class="image-cell text-center">
                <img src="${fullUrl}" alt="图片" class="img-thumbnail" data-url="${url}">
                <div class="d-flex gap-2 justify-content-center mt-2">
                    <button class="btn btn-sm btn-success btn-redo-image" data-id="${id}" data-field="${field_url}">重做</button>
                    <!-- 这里增加一个“下载”按钮 -->
                    <button class="btn btn-sm btn-success btn-download-image" data-image-id="${id}" data-url="${url}">下载</button> 
                    <!-- 
                    // 暂时删除
                    <button class="btn btn-sm btn-danger btn-delete-image" data-id="${id}" data-field="${field}">删除</button>
                    <select class="form-select status-select" data-id="${id}" data-field="${field}">
                        <option value="0" ${status == 0 ? 'selected' : ''}>未选中</option>
                        <option value="1" ${status == 1 ? 'selected' : ''}>选中</option>
                        <option value="2" ${status == 2 ? 'selected' : ''}>图生视频</option>
                    </select>
                    -->
                </div>
            </div>
        `;
    }

    // 更新图片状态
    function updateImageStatus() {
        const select = $(this);
        const id = select.data('id');
        const field = select.data('field');
        const value = select.val();
        
        $.ajax({
            url: '/update_image_status',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                id: id,
                field: field,
                value: value
            }),
            success: function() {
                console.log('状态更新成功');
            }
        });
    }

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

    // 删除图片
    function deleteImage() {
        const button = $(this);
        const id = button.data('id');
        const field = button.data('field');
        const imageField = field.replace('_status_', '_url_');
        
        if (!confirm('确定要删除这张图片吗？')) return;
        
        $.ajax({
            url: '/delete_image',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                id: id,
                field: imageField
            }),
            success: function() {
                button.closest('.image-cell').remove();
            }
        });
    }

    // 绑定删除图片按钮事件
    $(document).on('click', '.btn-delete-image', deleteImage);
    
    // 绑定重做图片按钮事件
    $(document).on('click', '.btn-redo-image', function() {
        if (confirm('确定要重做张图片吗？')) {
            const id = $(this).data('id');
            const field = $(this).data('field');
            const url = `${N8N_URL}/webhook/ae0fa780-56b4-41db-9425-dce994b81094`;
            $.ajax({
                url: url,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    id: id,
                    field: field,
                    comfyui_url: COMFYUI_URL
                }),
                success: function() {
                    console.log('重做图片请求已发送');
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
        video.className = 'img-thumbnail';
        
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
        const url = `${N8N_URL}/webhook/df662fdc-ee11-47b0-a3f7-9fea94a47a5e`;
        
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
                indextts_url: INDEXTTS_URL
            }),
            success: function(data) {
                console.log('图片生成请求已发送');
                alert('图片生成请求已发送成功！');
            },
            error: function(xhr) {
                console.error('图片生成请求失败:', xhr.status, xhr.statusText);
                alert('图片生成请求失败，请稍后重试！');
            },
            complete: function() {
                // 无论成功或失败，都重新启用按钮
                // $('#generateImagesBtn').prop('disabled', false);
            }
        });
    });

});
