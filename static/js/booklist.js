$(document).ready(function() {
     // 加载书单管理数据
    function loadBooklistData(page = 1) {
        const params = {
            page: page,
            book_name: $('#bookName').val(),
            book_author: $('#bookAuthor').val(),
            book_status: $('#bookStatus').val()
        };

        $.get('/booklist/data', params, function(data) {
            const tbody = $('#booklistTable tbody');
            tbody.empty();
            
            data.data.forEach(book => {
                const statusText = getStatusText(book.book_status);
                const row = `
                    <tr class="bg-white border-b hover:bg-gray-50">
                        <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${book.id}</td>
                        <!-- <td class="px-6 py-4">${book.book_name || ''}</td> -->
                        <!-- <td class="px-6 py-4">${book.book_author || ''}</td> -->
                        <td class="px-6 py-4">${book.book_note || ''}</td>
                        <td class="px-6 py-4">${book.book_content || ''}</td>
                        <td class="px-6 py-4">${statusText}</td>
                        <td class="px-6 py-4">
                            <button class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 mr-2 mb-2 btn-edit" data-id="${book.id}">修改</button>
                            <button class="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-4 py-2 mr-2 mb-2 btn-delete" data-id="${book.id}">删除</button>
                            <br>
                            <button class="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 mr-2 mb-2 btn-create" data-id="${book.id}">生成文案</button>
                            <button class="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 mr-2 mb-2 btn-prompt" data-id="${book.id}">生成字幕</button>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });

            // 渲染分页
            renderPagination(data.page, data.total_pages);
            
            // 绑定按钮事件
            $('.btn-edit').click(showEditModal);
            $('.btn-delete').click(deleteBook);
            $('.btn-create').click(createCopy);
            $('.btn-prompt').click(promptCopy);
        });
    }

    // 获取状态文本 0-待生成文案，1-已生成文案，2-已生成字幕，3-已生成语音，4-已生成图片，5-已图生视频 ，6-已完成
    function getStatusText(status) {
        const statusMap = {
            '0': '待生成文案',
            '1': '已生成文案',
            '2': '已生成字幕',
            '3': '已生成语音',
            '4': '已生成图片',
            '5': '已图生视频',
            '6': '已完成'
        };
        return statusMap[status] || '未知状态';
    }

    // 渲染分页控件
    function renderPagination(currentPage, totalPages) {
        const pagination = $('#pagination');
        pagination.empty();

        // 上一页按钮
        pagination.append(`
            <li>
                <a href="#" class="block py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 ${currentPage <= 1 ? 'opacity-50 pointer-events-none' : ''}" data-page="${currentPage - 1}">上一页</a>
            </li>
        `);

        // 页码按钮 - 显示所有页码
        for (let i = 1; i <= totalPages; i++) {
            pagination.append(`
                <li>
                    <a href="#" class="py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 ${i === currentPage ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700' : ''}" data-page="${i}">${i}</a>
                </li>
            `);
        }

        // 下一页按钮
        pagination.append(`
            <li>
                <a href="#" class="block py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 ${currentPage >= totalPages ? 'opacity-50 pointer-events-none' : ''}" data-page="${currentPage + 1}">下一页</a>
            </li>
        `);

        // 绑定分页事件
        $('#pagination a').off('click').on('click', function(e) {
            e.preventDefault();
            const page = $(this).data('page');
            if (page) {
                loadBooklistData(page);
            }
        });
    }

    // 显示编辑模态框
    function showEditModal() {
        const bookId = $(this).data('id');
        const modal = $('#bookModal');
        
        if (bookId) {
            // 修改模式
            modal.find('#modalTitle').text('修改项目');
            modal.find('#bookId').val(bookId);
            modal.find('#modalBookContent').closest('div').show();
            modal.find('#modalBookStatus').closest('div').show();
            // 获取完整书单数据
            $.get('/booklist/data', {page: 1, per_page: 1, id: bookId}, function(data) {
                if (data.data && data.data.length > 0) {
                    const book = data.data[0];
                    // modal.find('#modalBookName').val(book.book_name);
                    // modal.find('#modalBookAuthor').val(book.book_author);
                    modal.find('#modalBookNote').val(book.book_note);
                    modal.find('#modalBookContent').val(book.book_content);
                    modal.find('#modalBookPrompt').val(book.book_supplement_prompt);
                    modal.find('#modalBookStatus').val(book.book_status);
                    modal.find('#modalBookStyler').val(book.sdxl_prompt_styler);
                    modal.find('#modalBookType').val(book.video_type);
                    modal.find('#modalBookRatio').val(book.video_aspect);
                    modal.find('#modalBookVoice').val(book.video_voice);
                    modal.find('#modalBookMusic').val(book.video_music);
                }
            });
        } else {
            // 新增模式
            modal.find('#modalTitle').text('新增项目');
            modal.find('#bookId').val('');
            modal.find('#bookForm')[0].reset();
            modal.find('#modalBookContent').closest('div').hide();
            modal.find('#modalBookStatus').closest('div').hide();
        }
        
        // 显示模态框
        modal.removeClass('hidden').addClass('block');
        // 防止背景滚动
        $('body').addClass('overflow-hidden');
    }

    // 隐藏模态框
    function hideModal() {
        $('#bookModal').removeClass('block').addClass('hidden');
        $('body').removeClass('overflow-hidden');
    }

    // 保存书单
    function saveBook() {
        const $btn = $('#btnSave');
        const originalText = $btn.text();        
        const bookId = $('#bookId').val();
        const data = {
            // book_name: $('#modalBookName').val(),
            // book_author: $('#modalBookAuthor').val(),
            book_note: $('#modalBookNote').val(),
            book_content: $('#modalBookContent').val(),
            // book_supplement_prompt: $('#modalBookPrompt').val(),
            book_status: $('#modalBookStatus').val(),
            sdxl_prompt_styler: $('#modalBookStyler').val(),
            book_type: $('#modalBookType').val(),
            book_ratio: $('#modalBookRatio').val(),
            book_voice: $('#modalBookVoice').val(),
            book_music: $('#modalBookMusic').val(),
        };

        // 这里增加判断：book_note、book_type、book_ratio、sdxl_prompt_styler不能为空
        if (!data.book_note) {
            alert('请填写主题文本内容。');
            $('#modalBookNote').focus();
            return;
        }

        if (!data.book_type || !data.book_ratio || !data.sdxl_prompt_styler) {
            alert('请正确选择必填选择框信息。');
            return;
        }
        
        // 防止重复提交
        $btn.prop('disabled', true).text('保存中...');

        const url = bookId ? '/booklist/update' : '/booklist/create';
        if (bookId) data.id = bookId;

        $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(res) {
                hideModal();
                loadBooklistData();
            },
            error: function(xhr) {
                if (xhr.status === 403) {
                    const resp = xhr.responseJSON || {};
                    alert(resp.message);
                } else {
                    alert('保存失败，请稍后重试');
                }
            },
            complete: function() {
                $btn.prop('disabled', false).text(originalText);
            }
        });
    }

    // 生成文案
    function createCopy() {       
        if (!confirm('确定要生成文案吗？')) return;
        
        const bookId = $(this).data('id');
        $.ajax({
            url: '/call_job1_wenan?bookid=' + bookId,
            method: 'GET',
            async: true,
            success: function(response) {
                if (response.status === 'error') {
                    // 显示错误信息
                    alert(response.message);
                } else {
                    // 请求成功，15秒后再次查询
                    setTimeout(() => loadBooklistData(), 15000);
                }
            },
            error: function(xhr) {
                try {
                    // 尝试解析错误响应
                    const response = JSON.parse(xhr.responseText);
                    alert(response.message || '请求失败，请稍后重试');
                } catch (e) {
                    // 解析失败时显示通用错误
                    alert('请求失败，请稍后重试');
                }
            }
        });
    }

    // 生成提示词
    function promptCopy() {
        if (!confirm('确定要生成提示词吗？')) return;
        
        const bookId = $(this).data('id');
        $.ajax({
            url: '/call_job1_duanluo?type=prompt&bookid=' + bookId,
            method: 'GET',
            async: true,
            success: function(response) {
                if (response.status === 'error') {
                    // 显示错误信息
                    alert(response.message);
                }
            },
            error: function(xhr) {
                try {
                    // 尝试解析错误响应
                    const response = JSON.parse(xhr.responseText);
                    alert(response.message || '请求失败，请稍后重试');
                } catch (e) {
                    // 解析失败时显示通用错误
                    alert('请求失败，请稍后重试');
                }
            }
        });
    }

    // 删除书单
    function deleteBook() {
        if (!confirm('确定要删除这条书单吗？删除后数据将无法恢复。')) return;
        
        const bookId = $(this).data('id');
        $.ajax({
            url: '/booklist/delete',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({id: bookId}),
            success: function() {
                // alert('删除成功');
                loadBooklistData();
            },
            error: function(xhr) {
                if (xhr.status === 403) {
                    const resp = xhr.responseJSON || {};
                    alert(resp.message);
                } else {
                    alert('删除失败，请稍后重试');
                }
            }
        });
    }

    // 初始化书单管理页面
    if ($('#booklistTable').length) {
        loadBooklistData();
        
        // 查询表单提交
        $('#searchForm').submit(function(e) {
            e.preventDefault();
            loadBooklistData(1);
        });
        
        // 新增按钮点击
        $('#btnAdd').click(function() {
            showEditModal.call({data: function() { return ''; }});
        });
        
        // 保存按钮点击 - 确保只绑定一次
        $('#btnSave').off('click').on('click', saveBook);
        
        // 关闭模态框按钮点击
        $('[data-modal-toggle="bookModal"]').click(function() {
            hideModal();
        });
        
        // 点击模态框背景关闭模态框
        $('#bookModal .fixed.inset-0').click(function(e) {
            if (e.target === this) {
                hideModal();
            }
        });
    }
});
