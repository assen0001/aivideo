/**
 * 帮助中心页面左侧目录功能
 * 实现文章分类和文章列表的动态加载和显示
 */

// 全局变量，存储分类和文章数据
let categoriesData = [];
let currentArticleId = null;

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    // 加载左侧目录
    loadCategoriesAndArticles();
    
    // 设置搜索功能
    setupSearch();
    
    // 检查URL参数，如果有文章ID则加载文章内容
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    if (articleId) {
        loadArticleContent(articleId);
    }
});

/**
 * 加载分类和文章数据
 */
function loadCategoriesAndArticles() {
    // 显示加载状态
    showLoadingState();
    
    // 调用API获取数据
    fetch('/help/articles')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                categoriesData = data.data;
                renderCategoriesMenu();
            } else {
                console.error('加载数据失败:', data.message);
                showErrorState('加载数据失败，请刷新页面重试');
            }
        })
        .catch(error => {
            console.error('请求失败:', error);
            showErrorState('网络请求失败，请检查网络连接');
        });
}

/**
 * 渲染分类菜单
 */
function renderCategoriesMenu() {
    const menuContainer = document.querySelector('.bg-white.rounded-lg.shadow.p-4 ul');
    if (!menuContainer) {
        console.error('菜单容器未找到');
        return;
    }
    
    // 清空现有内容
    menuContainer.innerHTML = '';
    
    if (categoriesData.length === 0) {
        menuContainer.innerHTML = '<li class="text-gray-500 text-center py-4">暂无数据</li>';
        return;
    }
    
    // 遍历分类数据，生成菜单
    categoriesData.forEach(category => {
        // 创建分类项
        const categoryItem = document.createElement('li');
        categoryItem.className = 'font-semibold text-gray-800 mb-2';
        
        // 创建分类标题（可点击展开/收起）
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'flex justify-between items-center cursor-pointer py-2';
        categoryTitle.innerHTML = `
            <span>${category.cat_name}</span>
            <span class="transform transition-transform duration-200">▼</span>
        `;
        
        // 创建文章列表容器
        const articlesList = document.createElement('ul');
        articlesList.className = 'ml-4 space-y-1 text-gray-600 hidden';
        
        // 添加文章项
        if (category.articles && category.articles.length > 0) {
            category.articles.forEach(article => {
                const articleItem = document.createElement('li');
                articleItem.className = 'py-1';
                
                const articleLink = document.createElement('a');
                articleLink.href = `/help?id=${article.id}`;
                articleLink.className = 'text-blue-600 hover:text-blue-800 transition-colors duration-200';
                articleLink.textContent = article.title;
                articleLink.onclick = function(e) {
                    e.preventDefault();
                    loadArticleContent(article.id);
                    updateActiveArticle(article.id);
                };
                
                articleItem.appendChild(articleLink);
                articlesList.appendChild(articleItem);
            });
        } else {
            const noArticleItem = document.createElement('li');
            noArticleItem.className = 'text-gray-400 text-sm py-1';
            noArticleItem.textContent = '暂无文章';
            articlesList.appendChild(noArticleItem);
        }
        
        // 点击分类标题展开/收起文章列表
        categoryTitle.onclick = function() {
            const isHidden = articlesList.classList.contains('hidden');
            const arrow = categoryTitle.querySelector('span:last-child');
            
            if (isHidden) {
                articlesList.classList.remove('hidden');
                arrow.style.transform = 'rotate(180deg)';
            } else {
                articlesList.classList.add('hidden');
                arrow.style.transform = 'rotate(0deg)';
            }
        };
        
        categoryItem.appendChild(categoryTitle);
        categoryItem.appendChild(articlesList);
        menuContainer.appendChild(categoryItem);
    });
    
    // 默认展开第一个分类
    const firstCategory = menuContainer.querySelector('li:first-child');
    if (firstCategory) {
        const firstTitle = firstCategory.querySelector('div');
        const firstList = firstCategory.querySelector('ul');
        const firstArrow = firstTitle.querySelector('span:last-child');
        
        firstList.classList.remove('hidden');
        firstArrow.style.transform = 'rotate(180deg)';
    }
}

/**
 * 加载文章内容
 * @param {number} articleId - 文章ID
 */
function loadArticleContent(articleId) {
    // 显示加载状态
    showArticleLoadingState();
    
    fetch(`/help/article/${articleId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderArticleContent(data.data);
                currentArticleId = articleId;
                updateURL(articleId);
            } else {
                console.error('加载文章失败:', data.message);
                showArticleErrorState('加载文章失败');
            }
        })
        .catch(error => {
            console.error('请求失败:', error);
            showArticleErrorState('网络请求失败');
        });
}

/**
 * 渲染文章内容
 * @param {Object} article - 文章数据
 */
function renderArticleContent(article) {
    const contentContainer = document.querySelector('.bg-white.rounded-lg.shadow.p-6');
    if (!contentContainer) return;
    
    // 应用CKEditor样式到文章内容
    const ckeditorStyles = `
        <style>
            .cke-content-body {
                font-family: sans-serif, Arial, Verdana, "Trebuchet MS";
                font-size: 13px;
                line-height: 1.6;
                color: #333;
                background-color: #fff;
                word-wrap: break-word;
            }
            .cke-content-body h1, .cke-content-body h2, .cke-content-body h3, 
            .cke-content-body h4, .cke-content-body h5, .cke-content-body h6 {
                font-weight: normal;
                line-height: 1.2;
                margin: 1em 0 0.5em 0;
            }
            .cke-content-body p {
                margin: 0 0 1em 0;
            }
            .cke-content-body blockquote {
                font-style: italic;
                font-family: Georgia, Times, "Times New Roman", serif;
                padding: 2px 0;
                border-left: 5px solid #ccc;
                padding-left: 20px;
                margin: 1em 0;
            }
            .cke-content-body a {
                color: #0782C1;
                text-decoration: underline;
            }
            .cke-content-body ol, .cke-content-body ul, .cke-content-body dl {
                padding: 0 40px;
                margin: 1em 0;
            }
            .cke-content-body li {
                margin: 0.5em 0;
            }
            .cke-content-body img {
                max-width: 100%;
                height: auto;
            }
            .cke-content-body table {
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
            }
            .cke-content-body table, .cke-content-body th, .cke-content-body td {
                border: 1px solid #ccc;
                padding: 8px;
            }
            .cke-content-body pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                background: #f5f5f5;
                padding: 10px;
                border-radius: 3px;
                margin: 1em 0;
            }
            .cke-content-body hr {
                border: 0;
                border-top: 1px solid #ccc;
                margin: 1em 0;
            }
        </style>
    `;
    
    contentContainer.innerHTML = `
        <h2 class="text-2xl font-bold mb-2">${article.title}</h2>
        <div class="flex items-center text-gray-500 text-sm mb-4">
            <span class="mr-4">分类: ${article.cat_name}</span>
            <span class="mr-4">发布时间: ${formatDate(article.create_time)}</span>
            <span>阅读数: ${article.views}</span>
        </div>
        
        <div class="mb-8">
            ${ckeditorStyles}
            <div class="cke-content-body">
                ${article.content || '<p>文章内容为空</p>'}
            </div>
        </div>
    `;
}

/**
 * 更新当前活动的文章链接样式
 * @param {number} articleId - 文章ID
 */
function updateActiveArticle(articleId) {
    // 移除所有活动状态
    document.querySelectorAll('.text-blue-600').forEach(link => {
        link.classList.remove('font-semibold', 'text-blue-800');
        link.classList.add('text-blue-600');
    });
    
    // 设置当前文章为活动状态
    const activeLink = document.querySelector(`a[href="/help?id=${articleId}"]`);
    if (activeLink) {
        activeLink.classList.remove('text-blue-600');
        activeLink.classList.add('font-semibold', 'text-blue-800');
    }
}

/**
 * 更新URL参数
 * @param {number} articleId - 文章ID
 */
function updateURL(articleId) {
    const newUrl = `${window.location.pathname}?id=${articleId}`;
    window.history.pushState({}, '', newUrl);
}

/**
 * 设置搜索功能
 */
function setupSearch() {
    const searchInput = document.querySelector('input[type="text"]');
    const searchButton = document.querySelector('button.bg-blue-500');
    
    if (searchInput && searchButton) {
        const performSearch = () => {
            const keyword = searchInput.value.trim();
            if (keyword) {
                searchArticles(keyword);
            }
        };
        
        searchButton.onclick = performSearch;
        searchInput.onkeypress = function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        };
    }
}

/**
 * 搜索文章
 * @param {string} keyword - 搜索关键词
 */
function searchArticles(keyword) {
    // 这里可以实现搜索功能，暂时使用客户端过滤
    const results = [];
    
    categoriesData.forEach(category => {
        if (category.articles) {
            category.articles.forEach(article => {
                if (article.title.includes(keyword)) {
                    results.push({
                        category: category.cat_name,
                        ...article
                    });
                }
            });
        }
    });
    
    if (results.length > 0) {
        // 显示搜索结果
        showSearchResults(results, keyword);
    } else {
        alert(`未找到包含"${keyword}"的文章`);
    }
}

/**
 * 显示搜索结果
 * @param {Array} results - 搜索结果
 * @param {string} keyword - 搜索关键词
 */
function showSearchResults(results, keyword) {
    const contentContainer = document.querySelector('.bg-white.rounded-lg.shadow.p-6');
    if (!contentContainer) return;
    
    let html = `<h2 class="text-2xl font-bold mb-4">搜索"${keyword}"的结果 (${results.length}条)</h2>`;
    
    results.forEach(result => {
        html += `
            <div class="border-b border-gray-200 py-3">
                <h3 class="text-lg font-semibold mb-1">
                    <a href="/help?id=${result.id}" class="text-blue-600 hover:text-blue-800" 
                       onclick="event.preventDefault(); loadArticleContent(${result.id}); updateActiveArticle(${result.id})">
                        ${result.title}
                    </a>
                </h3>
                <p class="text-gray-600 text-sm">分类: ${result.category}</p>
            </div>
        `;
    });
    
    contentContainer.innerHTML = html;
}

/**
 * 格式化日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateString) {
    if (!dateString) return '未知';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * 显示加载状态
 */
function showLoadingState() {
    const menuContainer = document.querySelector('.bg-white.rounded-lg.shadow.p-4 ul');
    if (menuContainer) {
        menuContainer.innerHTML = '<li class="text-gray-500 text-center py-4">加载中...</li>';
    }
}

/**
 * 显示错误状态
 * @param {string} message - 错误消息
 */
function showErrorState(message) {
    const menuContainer = document.querySelector('.bg-white.rounded-lg.shadow.p-4 ul');
    if (menuContainer) {
        menuContainer.innerHTML = `<li class="text-red-500 text-center py-4">${message}</li>`;
    }
}

/**
 * 显示文章加载状态
 */
function showArticleLoadingState() {
    const contentContainer = document.querySelector('.bg-white.rounded-lg.shadow.p-6');
    if (contentContainer) {
        contentContainer.innerHTML = '<div class="text-center py-8">加载中...</div>';
    }
}

/**
 * 显示文章错误状态
 * @param {string} message - 错误消息
 */
function showArticleErrorState(message) {
    const contentContainer = document.querySelector('.bg-white.rounded-lg.shadow.p-6');
    if (contentContainer) {
        contentContainer.innerHTML = `<div class="text-center py-8 text-red-500">${message}</div>`;
    }
}