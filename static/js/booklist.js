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
                    <tr>
                        <td>${book.id}</td>
                        <td>${book.book_name || ''}</td>
                        <td>${book.book_author || ''}</td>
                        <td>${book.book_note || ''}</td>
                        <td>${book.book_content || ''}</td>
                        <td>${statusText}</td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-edit" data-id="${book.id}">修改</button>
                            <button class="btn btn-sm btn-danger btn-delete" data-id="${book.id}">删除</button>
                            <br>
                            <button class="btn btn-sm btn-success btn-create" data-id="${book.id}">生成文案</button>
                            <button class="btn btn-sm btn-success btn-prompt" data-id="${book.id}">生成字幕</button>
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
            <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a>
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
            <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>
            </li>
        `);

        // 绑定分页事件
        $('.page-link').off('click').on('click', function(e) {
            e.preventDefault();
            const page = $(this).data('page');
            loadBooklistData(page);
        });
    }

    // 显示编辑模态框
    function showEditModal() {
        const bookId = $(this).data('id');
        const modal = $('#bookModal');
        
        if (bookId) {
            // 修改模式
            modal.find('.modal-title').text('修改书单');
            modal.find('#bookId').val(bookId);
            
            // 获取完整书单数据
            $.get('/booklist/data', {page: 1, per_page: 1, id: bookId}, function(data) {
                if (data.data && data.data.length > 0) {
                    const book = data.data[0];
                    modal.find('#modalBookName').val(book.book_name);
                    modal.find('#modalBookAuthor').val(book.book_author);
                    modal.find('#modalBookNote').val(book.book_note);
                    modal.find('#modalBookContent').val(book.book_content);
                    modal.find('#modalBookPrompt').val(book.book_supplement_prompt);
                    modal.find('#modalBookStatus').val(book.book_status);
                    modal.find('#modalBookStyler').val(book.sdxl_prompt_styler);
                }
            });
        } else {
            // 新增模式
            modal.find('.modal-title').text('新增书单');
            modal.find('#bookId').val('');
            modal.find('#bookForm')[0].reset();
            // 加载SDXL样式数据
            $.get('/sdxl_styles.json', function(styles) {
                const select = $('#modalBookStyler');
                select.empty();
                select.append('<option value="">-- 请选择 --</option>');
                styles.forEach(style => {
                    select.append(`<option value="${style.name}">${style.name}</option>`);
                });
            });
        }
        
        modal.modal('show');
    }

    // 保存书单
    function saveBook() {
        const $btn = $('#btnSave');
        const originalText = $btn.text();
        
        // 防止重复提交
        $btn.prop('disabled', true).text('保存中...');
        
        const bookId = $('#bookId').val();
        const data = {
            book_name: $('#modalBookName').val(),
            book_author: $('#modalBookAuthor').val(),
            book_note: $('#modalBookNote').val(),
            book_content: $('#modalBookContent').val(),
            book_supplement_prompt: $('#modalBookPrompt').val(),
            book_status: $('#modalBookStatus').val(),
            sdxl_prompt_styler: $('#modalBookStyler').val()
        };

        const url = bookId ? '/booklist/update' : '/booklist/create';
        if (bookId) data.id = bookId;

        $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function() {
                $('#bookModal').modal('hide');
                loadBooklistData();
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
            url: N8N_URL + '/webhook/b339e7f8-5db6-41c6-b319-e66be6f2b9dd?id=' + bookId,
            method: 'GET',
            async: true
        });
    }

    // 生成提示词
    function promptCopy() {
        if (!confirm('确定要生成提示词吗？')) return;
        
        const bookId = $(this).data('id');
        $.ajax({
            url: N8N_URL + '/webhook/b339e7f8-5db6-41c6-b319-e66be6f2b9dd?type=prompt&id=' + bookId,
            method: 'GET',
            async: true
        });
    }

    // 删除书单
    function deleteBook() {
        if (!confirm('确定要删除这条书单吗？')) return;
        
        const bookId = $(this).data('id');
        $.ajax({
            url: '/booklist/delete',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({id: bookId}),
            success: function() {
                // alert('删除成功');
                loadBooklistData();
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
    }



});
