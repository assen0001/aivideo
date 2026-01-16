/**
 * 文章管理页面JavaScript功能
 * 负责页面初始化、数据加载、搜索筛选、分页和操作功能
 */

$(document).ready(function() {
    // 页面初始化
    initArticlePage();
    
    // 绑定事件监听器
    bindEventListeners();
});

/**
 * 初始化文章管理页面
 */
function initArticlePage() {
    console.log('初始化文章管理页面...');
    
    // 显示加载状态
    showLoadingState();
    
    // 加载文章分类数据
    loadCategories();
    
    // 加载文章列表数据
    loadArticles();
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 搜索按钮点击事件
    $('#search-btn').on('click', function() {
        performSearch();
    });
    
    // 搜索输入框回车事件
    $('#keyword-search').on('keypress', function(e) {
        if (e.which === 13) {
            performSearch();
        }
    });
    
    // 分类筛选变更事件
    $('#category-filter').on('change', function() {
        loadArticles();
    });
    
    // 重置按钮点击事件
    $('#reset-btn').on('click', function() {
        resetFilters();
    });
    
    // 新建文章按钮点击事件
    $('#create-article-btn').on('click', function() {
        createNewArticle();
    });
    
    // 分页按钮点击事件
    $(document).on('click', '.pagination-btn', function() {
        const page = $(this).data('page');
        if (page) {
            loadArticles(page);
        }
    });
    
    // 上一页按钮点击事件
    $('#prev-page').on('click', function() {
        const page = parseInt($(this).data('current-page') || 1);
        if (page > 1) {
            loadArticles(page - 1);
        }
    });
    
    // 下一页按钮点击事件
    $('#next-page').on('click', function() {
        const page = parseInt($(this).data('current-page') || 1);
        const totalPages = parseInt($(this).data('total-pages') || 1);
        if (page < totalPages) {
            loadArticles(page + 1);
        }
    });
    
    // 编辑按钮点击事件
    $(document).on('click', '.edit-btn', function() {
        const articleId = $(this).data('id');
        editArticle(articleId);
    });
    
    // 删除按钮点击事件
    $(document).on('click', '.delete-btn', function() {
        const articleId = $(this).data('id');
        const articleTitle = $(this).data('title');
        deleteArticle(articleId, articleTitle);
    });
}

/**
 * 显示加载状态
 */
function showLoadingState() {
    $('#article-table-body').html(`
        <tr>
            <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                <div class="flex justify-center items-center">
                    <i class="fas fa-spinner fa-spin text-blue-600 text-xl mr-3"></i>
                    <span>正在加载文章数据...</span>
                </div>
            </td>
        </tr>
    `);
}

/**
 * 加载文章分类数据
 */
function loadCategories() {
    $.ajax({
        url: '/api/user/articles/categories',
        type: 'GET',
        success: function(response) {
            if (response.success) {
                // 接口返回的数据格式是 {data: [...], ...}
                // 直接使用 response.data 而不是 response.data.categories
                renderCategories(response.data);
            } else {
                console.error('加载分类数据失败：', response.message);
            }
        },
        error: function(xhr, status, error) {
            console.error('加载分类数据失败：', error);
        }
    });
}

/**
 * 渲染文章分类下拉框
 * @param {Array} categories - 分类数据数组
 */
function renderCategories(categories) {
    const $categoryFilter = $('#category-filter');
    
    // 清空现有选项（保留"全部分类"选项）
    $categoryFilter.find('option:not(:first)').remove();
    
    // 添加分类选项
    categories.forEach(category => {
        $categoryFilter.append(`
            <option value="${category.id}">${escapeHtml(category.cat_name)}</option>
        `);
    });
}

/**
 * 加载文章列表数据
 * @param {number} page - 页码
 */
function loadArticles(page = 1) {
    const categoryId = $('#category-filter').val();
    const keyword = $('#keyword-search').val().trim();
    
    // 显示加载状态
    showLoadingState();
    
    // 构建请求参数
    const params = {
        page: page,
        page_size: 10
    };
    
    if (categoryId) {
        params.category_id = categoryId;
    }
    
    if (keyword) {
        params.keyword = keyword;
    }
    
    // 显示全局加载状态
    showGlobalLoading(true);
    
    // 发送AJAX请求
    $.ajax({
        url: '/api/user/articles/list',
        type: 'GET',
        data: params,
        success: function(response) {
            showGlobalLoading(false);
            
            if (response.success) {
                // 接口返回的数据格式是 {data: {list: [], pagination: {...}}, success: true}
                // 使用 response.data.list 而不是 response.data.articles
                renderArticles(response.data.list);
                renderPagination(response.data.pagination);
                updateResultCount(response.data.pagination);
            } else {
                showError('加载文章列表失败：' + response.message);
            }
        },
        error: function(xhr, status, error) {
            showGlobalLoading(false);
            showError('网络错误，请稍后重试');
            console.error('加载文章列表失败:', error);
        }
    });
}

/**
 * 渲染文章列表
 * @param {Array} articles - 文章数据数组
 */
function renderArticles(articles) {
    const $tableBody = $('#article-table-body');
    
    if (articles.length === 0) {
        $tableBody.html(`
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-file-alt text-gray-400 text-4xl mb-3"></i>
                    <p class="text-gray-500">暂无文章数据</p>
                </td>
            </tr>
        `);
        return;
    }
    
    let html = '';
    articles.forEach(article => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${article.id}</td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="font-medium text-gray-900">${escapeHtml(article.title)}</div>
                    <div class="text-xs text-gray-500 mt-1">点击量: ${article.views}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${escapeHtml(article.nickname)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${escapeHtml(article.cat_name)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${escapeHtml(article.create_time)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${article.order_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="flex space-x-2">
                        <button class="edit-btn text-blue-600 hover:text-blue-800" 
                                data-id="${article.id}" 
                                title="编辑文章">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn text-red-600 hover:text-red-800" 
                                data-id="${article.id}" 
                                data-title="${escapeHtml(article.title)}" 
                                title="删除文章">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    $tableBody.html(html);
}

/**
 * 渲染分页控件
 * @param {Object} pagination - 分页数据
 */
function renderPagination(pagination) {
    const $paginationContainer = $('#pagination-container');
    const $pageNumbers = $('#page-numbers');
    const $prevBtn = $('#prev-page');
    const $nextBtn = $('#next-page');
    
    // 清空现有页码
    $pageNumbers.empty();
    
    // 更新上一页/下一页按钮状态 - 使用pagination.page而不是pagination.current_page
    $prevBtn.data('current-page', pagination.page);
    $prevBtn.prop('disabled', pagination.page <= 1);
    
    $nextBtn.data('current-page', pagination.page);
    $nextBtn.data('total-pages', pagination.total_pages);
    $nextBtn.prop('disabled', pagination.page >= pagination.total_pages);
    
    const totalPages = pagination.total_pages;
    let startPage = Math.max(1, pagination.page - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // 调整起始页码，确保显示5个页码
    if (endPage - startPage < 4 && startPage > 1) {
        startPage = Math.max(1, endPage - 4);
    }
    
    // 首页按钮
    if (startPage > 1) {
        $pageNumbers.append(`
            <button class="pagination-btn px-3 py-1 border rounded-md text-sm border-gray-300 text-gray-700 hover:bg-gray-50" data-page="1">
                1
            </button>
        `);
        if (startPage > 2) {
            $pageNumbers.append(`
                <span class="px-3 py-1 text-sm text-gray-500">
                    ...
                </span>
            `);
        }
    }
    
    // 中间页码
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === pagination.page;
        $pageNumbers.append(`
            <button class="pagination-btn px-3 py-1 border rounded-md text-sm ${isActive ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}" data-page="${i}">
                ${i}
            </button>
        `);
    }
    
    // 末页按钮
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            $pageNumbers.append(`
                <span class="px-3 py-1 text-sm text-gray-500">
                    ...
                </span>
            `);
        }
        $pageNumbers.append(`
            <button class="pagination-btn px-3 py-1 border rounded-md text-sm border-gray-300 text-gray-700 hover:bg-gray-50" data-page="${totalPages}">
                ${totalPages}
            </button>
        `);
    }
}

/**
 * 更新结果统计信息
 * @param {Object} pagination - 分页数据
 */
function updateResultCount(pagination) {
    // 使用pagination.page而不是pagination.current_page
    // 使用pagination.total_count而不是pagination.total
    const page = pagination.page || 1;
    const pageSize = pagination.page_size || 10;
    const total = pagination.total_count || 0;
    
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    
    $('#page-info').text(total > 0 ? `${start}-${end}` : '0');
    $('#total-info').text(total);
}

/**
 * 执行搜索操作
 */
function performSearch() {
    loadArticles(1);
}

/**
 * 重置筛选条件
 */
function resetFilters() {
    $('#category-filter').val('');
    $('#keyword-search').val('');
    loadArticles(1);
}

/**
 * 创建新文章
 */
function createNewArticle() {
    // 跳转到文章编辑页面（新建模式）
    window.location.href = '/user/article_edit';
}

/**
 * 编辑文章
 * @param {number} articleId - 文章ID
 */
function editArticle(articleId) {
    // 跳转到文章编辑页面（编辑模式）
    window.location.href = `/user/article_edit?id=${articleId}`;
}

/**
 * 删除文章
 * @param {number} articleId - 文章ID
 * @param {string} articleTitle - 文章标题
 */
function deleteArticle(articleId, articleTitle) {
    // 显示确认对话框
    if (confirm(`确定要删除文章 "${articleTitle}" 吗？此操作不可撤销。`)) {
        // 显示全局加载状态
        showGlobalLoading(true);
        
        $.ajax({
            url: `/api/user/articles/delete/${articleId}`,
            type: 'POST',
            success: function(response) {
                showGlobalLoading(false);
                
                if (response.success) {
                    showSuccess('文章删除成功');
                    // 重新加载文章列表
                    loadArticles();
                } else {
                    showError('删除文章失败：' + response.message);
                }
            },
            error: function(xhr, status, error) {
                showGlobalLoading(false);
                showError('网络错误，请稍后重试');
                console.error('删除文章失败:', error);
            }
        });
    }
}

/**
 * 显示全局加载状态
 * @param {boolean} show - 是否显示
 */
function showGlobalLoading(show) {
    const $loadingOverlay = $('#loading-overlay');
    if (show) {
        $loadingOverlay.removeClass('hidden');
    } else {
        $loadingOverlay.addClass('hidden');
    }
}

/**
 * 显示成功消息
 * @param {string} message - 消息内容
 */
function showSuccess(message) {
    // 可以使用Toast或Alert组件显示成功消息
    alert('成功: ' + message);
}

/**
 * 显示错误消息
 * @param {string} message - 消息内容
 */
function showError(message) {
    // 可以使用Toast或Alert组件显示错误消息
    alert('错误: ' + message);
}

/**
 * 显示信息消息
 * @param {string} message - 消息内容
 */
function showInfo(message) {
    // 可以使用Toast或Alert组件显示信息消息
    alert('信息: ' + message);
}

/**
 * HTML转义函数
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}