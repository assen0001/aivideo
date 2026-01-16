/**
 * 文章编辑页面JavaScript功能
 * 负责文章编辑页面的数据加载、表单验证、保存和编辑器初始化
 */

$(document).ready(function() {
    initArticleEditPage();
});

/**
 * 文章编辑页面初始化函数
 * 负责文章编辑页面的数据加载和功能初始化
 */
function initArticleEditPage() {
    console.log('初始化文章编辑页面...');
    
    // 获取URL参数中的文章ID
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    // 初始化CKEditor
    initCKEditor();
    
    // 加载文章分类数据
    loadArticleCategories();
    
    // 如果是编辑模式，加载文章数据
    if (articleId) {
        loadArticleData(articleId);
    } else {
        // 新建模式，设置默认值
        setDefaultValues();
    }
    
    // 绑定事件监听器
    bindArticleEditEvents();
}

/**
 * 初始化CKEditor富文本编辑器
 */
function initCKEditor() {
    try {       
        // 初始化CKEditor-4 ,使用jQuery适配器初始化CKEditor
        $('#editor1').ckeditor({
            // 基本配置
            language: 'zh-cn',
            height: 300,
            
            // 移除可能导致问题的配置
            removePlugins: 'elementspath',
            resize_enabled: true,
            versionCheck: false,
            // 确保皮肤正确加载
            skin: 'moono-lisa'
        });
        
    } catch (error) {
        console.error('CKEditor初始化失败:', error);
        // 如果CKEditor加载失败，使用普通textarea
        $('#editor1').addClass('border border-gray-300 rounded p-2 w-full h-64');
    }
}

/**
 * 加载文章分类数据
 */
function loadArticleCategories() {
    $.ajax({
        url: '/api/user/articles/categories',
        type: 'GET',
        success: function(response) {
            if (response.success) {
                renderArticleCategories(response.data);
            } else {
                console.error('加载文章分类失败：', response.message);
                showError('加载文章分类失败，请刷新页面重试');
            }
        },
        error: function(xhr, status, error) {
            console.error('加载文章分类失败：', error);
            showError('网络错误，请稍后重试');
        }
    });
}

/**
 * 渲染文章分类下拉框
 * @param {Array} categories - 分类数据数组
 */
function renderArticleCategories(categories) {
    const $categorySelect = $('#article-category');
    
    // 清空现有选项
    $categorySelect.empty();
    
    // 添加默认选项
    $categorySelect.append('<option value="">请选择文章分类</option>');
    
    // 添加分类选项
    categories.forEach(category => {
        $categorySelect.append(`
            <option value="${category.id}">${escapeHtml(category.cat_name)}</option>
        `);
    });
}

/**
 * 加载文章数据（编辑模式）
 * @param {number} articleId - 文章ID
 */
function loadArticleData(articleId) {
    // 显示加载状态
    showArticleEditLoading(true);
    
    $.ajax({
        url: `/api/user/articles/detail/${articleId}`,
        type: 'GET',
        success: function(response) {
            showArticleEditLoading(false);
            
            if (response.success) {
                fillArticleForm(response.data);
                // 更新页面标题
                document.title = '编辑文章 - ' + response.data.title;
            } else {
                showError('加载文章数据失败：' + response.message);
                // 如果文章不存在，3秒后返回文章列表
                setTimeout(() => {
                    window.location.href = '/user/article_list';
                }, 3000);
            }
        },
        error: function(xhr, status, error) {
            showArticleEditLoading(false);
            showError('网络错误，请稍后重试');
            console.error('加载文章数据失败:', error);
        }
    });
}

/**
 * 填充文章表单数据
 * @param {Object} articleData - 文章数据
 */
function fillArticleForm(articleData) {
    // 填充表单字段
    $('#article-title').val(articleData.title);
    $('#article-category').val(articleData.cate_id);
    $('#article-order').val(articleData.order_id);
    
    // 设置CKEditor内容
    try {
        const editor = CKEDITOR.instances.editor1;
        if (editor) {
            editor.setData(articleData.content);
        } else {
            // 如果CKEditor未初始化，直接设置textarea值
            $('#editor1').val(articleData.content);
        }
    } catch (error) {
        console.error('设置编辑器内容失败:', error);
        $('#editor1').val(articleData.content);
    }
}

/**
 * 设置默认值（新建模式）
 */
function setDefaultValues() {
    // 设置默认排序编号
    $('#order_id').val(100);
    
    // 设置页面标题
    document.title = '新建文章';
}

/**
 * 绑定文章编辑页面事件监听器
 */
function bindArticleEditEvents() {
    // 保存按钮点击事件
    $('#save-article-btn').on('click', function() {
        saveArticle();
    });
    
    // 取消按钮点击事件
    $('#cancel-btn').on('click', function() {
        cancelEdit();
    });
    
    // 表单提交事件
    $('#article-edit-form').on('submit', function(e) {
        e.preventDefault();
        saveArticle();
    });
}

/**
 * 保存文章
 */
function saveArticle() {
    // 获取表单数据
    const formData = getFormData();
    
    // 验证表单数据
    if (!validateFormData(formData)) {
        return;
    }
    
    // 显示保存中状态
    showSaveLoading(true);
    
    // 获取URL参数中的文章ID
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    // 根据是否有文章ID决定是创建还是更新
    const isEditMode = !!articleId;
    const apiUrl = isEditMode ? `/api/user/articles/update/${articleId}` : '/api/user/articles/create';
    const method = isEditMode ? 'PUT' : 'POST';
    
    $.ajax({
        url: apiUrl,
        type: method,
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function(response) {
            showSaveLoading(false);
            
            if (response.success) {
                showSuccess(isEditMode ? '文章更新成功' : '文章创建成功');
                
                // 保存成功后，如果是新建模式，跳转到编辑页面
                if (!isEditMode && response.data && response.data.id) {
                    setTimeout(() => {
                        window.location.href = `/user/article_edit?id=${response.data.id}`;
                    }, 1500);
                } else {
                    // 编辑模式，停留在当前页面
                    setTimeout(() => {
                        // 可以添加一些成功后的处理逻辑
                    }, 1500);
                }
            } else {
                showError((isEditMode ? '更新' : '创建') + '文章失败：' + response.message);
            }
        },
        error: function(xhr, status, error) {
            showSaveLoading(false);
            showError('网络错误，请稍后重试');
            console.error('保存文章失败:', error);
        }
    });
}

/**
 * 获取表单数据
 * @returns {Object} 表单数据对象
 */
function getFormData() {
    // 获取CKEditor内容
    let content = '';
    try {
        const editor = CKEDITOR.instances.editor1;
        if (editor) {
            content = editor.getData();
        } else {
            content = $('#editor1').val();
        }
    } catch (error) {
        console.error('获取编辑器内容失败:', error);
        content = $('#editor1').val();
    }
    
    return {
        title: $('#article-title').val().trim(),
        cate_id: $('#article-category').val(),
        content: content,
        order_id: $('#order_id').val() || 100
    };
}

/**
 * 验证表单数据
 * @param {Object} formData - 表单数据
 * @returns {boolean} 验证是否通过
 */
function validateFormData(formData) {
    // 验证标题
    if (!formData.title) {
        showError('请输入文章标题');
        $('#article-title').focus();
        return false;
    }
    
    if (formData.title.length > 100) {
        showError('文章标题不能超过100个字符');
        $('#article-title').focus();
        return false;
    }
    
    // 验证分类
    if (!formData.cate_id) {
        showError('请选择文章分类');
        $('#article-category').focus();
        return false;
    }
    
    // 验证内容
    if (!formData.content || formData.content.trim() === '') {
        showError('请输入文章内容');
        try {
            const editor = CKEDITOR.instances.editor1;
            if (editor) {
                editor.focus();
            } else {
                $('#editor1').focus();
            }
        } catch (error) {
            $('#editor1').focus();
        }
        return false;
    }
    
    return true;
}

/**
 * 取消编辑
 */
function cancelEdit() {
    // 显示确认对话框
    if (confirm('确定要取消编辑吗？未保存的更改将丢失。')) {
        // 返回文章列表页面
        window.location.href = '/user/article_list';
    }
}

/**
 * 显示文章编辑页面加载状态
 * @param {boolean} show - 是否显示
 */
function showArticleEditLoading(show) {
    const $loadingOverlay = $('#loading-overlay');
    if (show) {
        $loadingOverlay.removeClass('hidden');
    } else {
        $loadingOverlay.addClass('hidden');
    }
}

/**
 * 显示保存加载状态
 * @param {boolean} show - 是否显示
 */
function showSaveLoading(show) {
    const $saveBtn = $('#save-article-btn');
    const $saveIcon = $saveBtn.find('i');
    const $saveText = $saveBtn.find('span');
    
    if (show) {
        $saveBtn.prop('disabled', true);
        $saveIcon.removeClass('fa-save').addClass('fa-spinner fa-spin');
        $saveText.text('保存中...');
    } else {
        $saveBtn.prop('disabled', false);
        $saveIcon.removeClass('fa-spinner fa-spin').addClass('fa-save');
        $saveText.text('保存文章');
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
 * HTML转义函数
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}