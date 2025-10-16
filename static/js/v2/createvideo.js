// 视频创作表单交互逻辑
// 处理视频创作表单的交互逻辑，包括表单验证、视频生成流程、进度显示、通知提示等功能
document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  var videoForm = document.getElementById('video-creation-form');   // 视频创作表单
  var generateBtn = document.getElementById('generate-video-btn');    // 生成视频按钮
  var formContent = document.querySelector('#video-creation-form');   // 视频创作表单
  var generationStatus = document.getElementById('generation-status');    // 生成状态
  var generationResult = document.getElementById('generation-result');    // 生成结果
  var progressBar = document.getElementById('progress-bar');    // 进度条
  var progressText = document.getElementById('progress-text');    // 进度文本
  var cancelGenerationBtn = document.getElementById('cancel-generation');    // 取消生成按钮
  var durationInput = document.getElementById('video-duration');    // 视频时长输入框
  var durationSlider = document.getElementById('duration-slider');    // 视频时长滑块
  var durationValue = document.getElementById('duration-value');    // 视频时长值
  var fileUpload = document.getElementById('file-upload');    // 文件上传
  var uploadedImages = document.getElementById('uploaded-images');    // 上传的图片
  var playMusicBtn = document.getElementById('play-music');    // 播放背景音乐按钮
  var pauseMusicBtn = document.getElementById('pause-music');    // 暂停背景音乐按钮  
  var notificationModal = document.getElementById('notification-modal');    // 通知弹窗
  var modalCloseBtn = document.getElementById('modal-close');    // 弹窗关闭按钮
  var modalTitle = document.getElementById('modal-title');    // 弹窗标题
  var modalMessage = document.getElementById('modal-message');    // 弹窗消息
  var modalIcon = document.getElementById('modal-icon');    // 弹窗图标
  var aspectRadios = document.querySelectorAll('input[name="video-aspect"]');    // 视频比例单选框：16:9（1024x576）、4:3（1024x768）
  var styleRadios = document.querySelectorAll('input[name="video-style"]');    // 视频风格单选框
  var videoTypeItems = document.querySelectorAll('.video-type-item');    // 视频类型项

  // 从配置读取URL
  let config = {};
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/get_config', false); 
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {        
          config = JSON.parse(xhr.responseText);        
      }
    }
  };
  xhr.send();

  // 设置默认配置值，防止配置加载失败
  const N8N_URL = config.N8N_URL || '';
  const COMFYUI_URL = config.COMFYUI_URL || '';
  const INDEXTTS_URL = config.INDEXTTS_URL || '';
  const AIBOOKVIDEO_URL = config.AIBOOKVIDEO_URL || '';
  const COMFYUI_URL_WAN = config.COMFYUI_URL_WAN || '';
  const COMFYUI_URL_PATH = config.COMFYUI_URL_PATH || '';
  
  // 视频时长滑块和输入框联动
  // durationSlider.addEventListener('input', function () {
  //   var value = parseInt(durationSlider.value);
  //   durationInput.value = value;
  //   durationValue.textContent = "".concat(value, "秒");

  //   // 免费会员时长限制检查
  //   if (value > 30) {
  //     showNotification('提示', '免费会员最长支持30秒视频，升级VIP可解锁更长时长', 'info');
  //     durationSlider.value = 30;
  //     durationInput.value = 30;
  //     durationValue.textContent = '180秒';
  //   }
  // });

  // durationInput.addEventListener('input', function () {
  //   var value = parseInt(durationInput.value) || 5;
  //   // 限制最小值和最大值
  //   value = Math.min(Math.max(value, 5), 30);
  //   durationInput.value = value;
  //   durationSlider.value = value;
  //   durationValue.textContent = "".concat(value, "秒");
  // });

  // 图片上传预览
  // fileUpload.addEventListener('change', function (e) {
  //   var file = e.target.files[0];
  //   if (file) {
  //     // 检查文件类型
  //     if (!file.type.startsWith('image/')) {
  //       showNotification('错误', '请上传图片文件', 'error');
  //       return;
  //     }

  //     // 检查文件大小
  //     if (file.size > 10 * 1024 * 1024) {
  //       showNotification('错误', '图片大小不能超过10MB', 'error');
  //       return;
  //     }

  //     var reader = new FileReader();
  //     reader.onload = function (event) {
  //       // 显示上传图片预览
  //       uploadedImages.classList.remove('hidden');
  //       uploadedImages.innerHTML = "<div class=\"relative\">\n  <img src=\"" + event.target.result + "\" alt=\"上传图片预览\" class=\"w-24 h-24 object-cover rounded-md border border-gray-200\">\n    <button type=\"button\" class=\"absolute top-1 right-1 bg-white rounded-full p-1 shadow-md text-gray-500 hover:text-red-500 transition duration-150 ease-in-out\" id=\"remove-image\">\n      <i class=\"fas fa-times\">\n      </i>\n    </button>\n  </div>";

  //       // 移除图片预览
  //       document.getElementById('remove-image').addEventListener('click', function () {
  //         uploadedImages.classList.add('hidden');
  //         uploadedImages.innerHTML = '';
  //         fileUpload.value = '';
  //       });
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // });

  // 背景音乐播放/暂停按钮切换
  playMusicBtn.addEventListener('click', function () {
    playMusicBtn.classList.add('hidden');
    pauseMusicBtn.classList.remove('hidden');
    showNotification('提示', '背景音乐预览功能即将上线', 'info');
  });

  pauseMusicBtn.addEventListener('click', function () {
    pauseMusicBtn.classList.add('hidden');
    playMusicBtn.classList.remove('hidden');
  });

  // 视频规格选择样式切换函数
  function updateAspectSelection() {
    aspectRadios.forEach(function (r) {
      var label = document.querySelector("label[for='" + r.id + "']");
      if (r.checked) {
        label.classList.add('border-indigo-500', 'bg-indigo-50');
        label.classList.remove('border-gray-200');

        // 显示选中指示器
        var indicator = label.querySelector('.absolute');
        if (indicator) {
          indicator.classList.remove('opacity-0');
        }
      } else {
        label.classList.remove('border-indigo-500', 'bg-indigo-50');
        label.classList.add('border-gray-200');

        // 隐藏选中指示器
        var _indicator = label.querySelector('.absolute');
        if (_indicator) {
          _indicator.classList.add('opacity-0');
        }
      }
    });
  }

  // 为所有视频比例单选按钮添加change事件监听器
  aspectRadios.forEach(function (radio) {
    radio.addEventListener('change', updateAspectSelection);
  });

  // 页面加载时初始化选中状态样式
  updateAspectSelection();

  // 视频风格选择样式切换函数
    function updateStyleSelection() {
      styleRadios.forEach(function (r) {
        var label = document.querySelector("label[for='" + r.id + "']");
        if (r.checked) {
          label.classList.add('border-indigo-500', 'bg-indigo-50');
          label.classList.remove('border-gray-200');
        } else {
          label.classList.remove('border-indigo-500', 'bg-indigo-50');
          label.classList.add('border-gray-200');
        }
      });
    }
  
    // 为所有视频风格单选按钮添加change事件监听器
    styleRadios.forEach(function (radio) {
      radio.addEventListener('change', updateStyleSelection);
    });
  
    // 页面加载时初始化选中状态样式
    updateStyleSelection();

  // 视频模板选择样式切换函数
  function updateVideoTypeSelection(selectedItem) {
    videoTypeItems.forEach(function (item) {
      var iconContainer = item.querySelector('div');
      var icon = iconContainer.querySelector('i');
      
      if (item === selectedItem) {
        // 选中项样式
        iconContainer.classList.add('bg-indigo-100', 'border-2', 'border-indigo-500');
        iconContainer.classList.remove('bg-gray-100', 'border');
        icon.classList.add('text-indigo-600');
        icon.classList.remove('text-gray-600');
      } else {
        // 未选中项样式
        iconContainer.classList.remove('bg-indigo-100', 'border-2', 'border-indigo-500');
        iconContainer.classList.add('bg-gray-100', 'border');
        icon.classList.remove('text-indigo-600');
        icon.classList.add('text-gray-600');
      }
    });
  }

  // 为所有视频模板添加点击事件监听器
  videoTypeItems.forEach(function (item) {
    item.addEventListener('click', function () {
      updateVideoTypeSelection(item);
      // 可以在这里添加视频模板选择后的其他逻辑
      var videoType = item.getAttribute('data-type');
      console.log('Selected video type:', videoType);
    });
  });

  // 页面加载时初始化视频模板选中状态
  updateVideoTypeSelection(videoTypeItems[0]); // 默认选中第一个（主题创意）

  // showNotification('提示', '视频规格和风格选择将在后续版本中开放', 'success');
  
  // 显示通知模态框
  function showNotification(title, message) {
    var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'info';
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // 设置图标
    if (type === 'success') {
      modalIcon.innerHTML = "<i class=\"fas fa-check-circle text-3xl text-green-500\">\n</i>";
    } else if (type === 'error') {
      modalIcon.innerHTML = "<i class=\"fas fa-exclamation-circle text-3xl text-red-500\">\n</i>";
    } else if (type === 'warning') {
      modalIcon.innerHTML = "<i class=\"fas fa-exclamation-triangle text-3xl text-yellow-500\">\n</i>";
    } else {
      modalIcon.innerHTML = "<i class=\"fas fa-info-circle text-3xl text-indigo-500\">\n</i>";
    }
    notificationModal.classList.remove('hidden');
  }

  // 关闭通知模态框
  modalCloseBtn.addEventListener('click', function() {
    notificationModal.classList.add('hidden');
  });

  // =========== 表单提交处理 - 生成视频 ================  
  videoForm.addEventListener('submit', function (e) {
    e.preventDefault();

    // 获取表单数据
    var formData = {
      type: document.querySelector('.video-type-item .bg-indigo-100').closest('.video-type-item').getAttribute('data-type'), // 视频模板类型
      text: document.getElementById('video-text').value.trim(),   // 视频文本内容
      // hasImage: uploadedImages.classList.contains('hidden') ? false : true, // 是否包含图片
      aspect: document.querySelector('input[name="video-aspect"]:checked').value, // 视频比例
      // duration: parseInt(document.getElementById('video-duration').value), // 视频时长
      style: document.querySelector('input[name="video-style"]:checked').value, // 视频风格      
      voice: document.getElementById('narration-voice').value, // 字幕配音
      // voiceSpeed: document.getElementById('narration-speed').value, // 旁白速度
      music: document.getElementById('background-music').value, // 背景音乐     
      
      // 兼容老版本（AI读书视频）
      book_name: document.getElementById('video-text').value.trim().substring(0, 15),  // 视频文本内容--截取前15个字符
      book_author: "",
      book_note: document.getElementById('video-text').value.trim(),   // 视频文本内容
      book_supplement_prompt: "", 
      sdxl_prompt_styler: document.querySelector('input[name="video-style"]:checked').value, // 视频风格    
    };

    // 使用console.log()打印formData对象
    console.log('Form Data:', formData);

    // 表单验证 - 检查文本内容是否为空
    if (!formData.text) {
      showNotification('错误', '请输入视频文本内容', 'error');
      return;
    }

    // 显示生成状态
    formContent.classList.add('hidden');
    generationStatus.classList.remove('hidden');

    // 调用API创建视频
    fetch('/autovideo/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        // 调用n8n任务 触发视频生成
        const apiUrl = `${N8N_URL}/webhook/c1dad875-725b-4107-8a80-d99f45dbab5f`;    
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            book_id: data.book_id,
            aibookvideo_url: AIBOOKVIDEO_URL,
            n8n_url: N8N_URL,
            comfyui_url: COMFYUI_URL,
            comfyui_url_wan: COMFYUI_URL_WAN,   
            comfyui_url_path: COMFYUI_URL_PATH,                 
            indextts_url: INDEXTTS_URL,
          })
        })
        .then(response => response.json())
        .catch(n8nError => {
          console.error('n8n Error:', n8nError);
          // 处理n8n错误
        }); 

        // 执行定时任务 检查视频是否生成完成
        checkVideoStatus(data.book_id);

        // 视频创建成功
        // setTimeout(function () {
        //   generationStatus.classList.add('hidden');
        //   generationResult.classList.remove('hidden');
          
        //   // 更新成功消息
        //   var resultTitle = document.querySelector('#generation-result h3');
        //   var resultMessage = document.querySelector('#generation-result p');
        //   if (resultTitle && resultMessage) {
        //     resultTitle.textContent = '视频创建成功！';
        //     resultMessage.textContent = '您的视频项目已成功创建，项目ID: ' + data.book_id;
        //   }
        // }, 1000);
      } else {
        // 视频创建失败
        generationStatus.classList.add('hidden');
        formContent.classList.remove('hidden');
        showNotification('错误', data.message || '视频创建失败', 'error');
      }
    })
    .catch(error => {
      // 网络错误
      generationStatus.classList.add('hidden');
      formContent.classList.remove('hidden');
      showNotification('错误', '网络连接失败，请稍后重试', 'error');
      console.error('Error:', error);
    });

    // 模拟进度条（在API调用期间显示进度）
    // var progress = 0;
    // var progressInterval = setInterval(function () {
    //   progress += Math.random() * 10;
    //   if (progress >= 100) {
    //     progress = 100;
    //     clearInterval(progressInterval);
    //   }
    //   progressBar.style.width = "".concat(progress, "%");
    //   progressText.textContent = "".concat(Math.round(progress), "% 完成");
    // }, 1000);

    // 取消生成按钮事件
    cancelGenerationBtn.addEventListener('click', function () {
      clearInterval(progressInterval);
      generationStatus.classList.add('hidden');
      formContent.classList.remove('hidden');
      progressBar.style.width = '0%';
      progressText.textContent = '0% 完成';
    });

  });

  
  // 高级配置切换功能
  // var toggleAdvancedBtn = document.getElementById('toggle-advanced-settings');
  // var advancedSettings = document.getElementById('advanced-settings');
  // var advancedSettingsIcon = document.getElementById('advanced-settings-icon');
  // toggleAdvancedBtn.addEventListener('click', function () {
  //   advancedSettings.classList.toggle('hidden');
  //   advancedSettingsIcon.classList.toggle('rotate-180');
  // });

  checkVideoStatus(0);

  // 定时任务：检查任务状态和进度条更新
  function checkVideoStatus(book_id) {
    console.log("book_id:", book_id);
    const checkUrl = `/autovideo/status?book_id=${book_id}`;
    
    // 使用原生 fetch API 替代 jQuery 的 $.get
    fetch(checkUrl)
        .then(response => {
            response.json().then(data => {
                // console.log("data:", data);
                if (data.status === 'success' && data.data.length > 0) {
                    const jobs = data.data;   
                    console.log("jobs:", jobs);
                    book_id = jobs[0].book_id;             

                    // 显示生成状态
                    formContent.classList.add('hidden');
                    generationStatus.classList.remove('hidden');
                                    
                    // 判断首条任务状态
                    if (jobs[0].job_status === 2) {
                        // 视频创建成功
                        generationStatus.classList.add('hidden');
                        generationResult.classList.remove('hidden');                       
                        // 更新成功消息
                        var resultTitle = document.querySelector('#generation-result h3');
                        var resultMessage = document.querySelector('#generation-result p');
                        if (resultTitle && resultMessage) {
                            resultTitle.textContent = '视频创建成功！';
                            resultMessage.textContent = '您的视频项目已成功创建，项目ID: ' + book_id;
                        }
                        return; // 终止轮询
                    }

                    // 任务出错时，重新提交N8N任务
                    if (jobs[0].job_status === 4) {
                        // 重新 调用n8n任务 触发视频生成
                        const apiUrl = `${N8N_URL}/webhook/c1dad875-725b-4107-8a80-d99f45dbab5f`;    
                        fetch(apiUrl, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ 
                            redo: 'on',
                            book_id: book_id,
                            aibookvideo_url: AIBOOKVIDEO_URL,
                            n8n_url: N8N_URL,
                            comfyui_url: COMFYUI_URL,
                            comfyui_url_wan: COMFYUI_URL_WAN,   
                            comfyui_url_path: COMFYUI_URL_PATH,                 
                            indextts_url: INDEXTTS_URL,
                          })
                        })
                        .then(response => response.json())
                        .catch(n8nError => {
                          console.error('n8n Error:', n8nError);
                          // 处理n8n错误
                        }); 
                    }

                    // 这里增加判断 jobs数组末尾项目job_type的值：
                    if (jobs[jobs.length - 1].job_type === 1) {
                      progressBar.style.width = "10%";
                      progressText.textContent = "10% 完成";
                    } else if (jobs[jobs.length - 1].job_type === 2) {
                        progressBar.style.width = "20%";
                        progressText.textContent = "20% 完成";
                    } else if (jobs[jobs.length - 1].job_type === 3) {
                        progressBar.style.width = "30%";
                        progressText.textContent = "30% 完成";
                    } else if (jobs[jobs.length - 1].job_type === 4) {
                        progressBar.style.width = "50%";
                        progressText.textContent = "50% 完成";
                    } else if (jobs[jobs.length - 1].job_type === 5) {
                        progressBar.style.width = "70%";
                        progressText.textContent = "70% 完成";
                    } else if (jobs[jobs.length - 1].job_type === 6) {
                        progressBar.style.width = "90%";
                        progressText.textContent = "90% 完成";
                    }

                }
            });            
        });

    // 10秒后再次查询
    setTimeout(() => checkVideoStatus(book_id), 10000);
  }  





  // 创作新视频按钮点击事件
  document.querySelector('#generation-result button:has(i.fas.fa-edit)').addEventListener('click', function() {
    // 获取当前的book_id
    // const bookIdElement = document.querySelector('#generation-result p');
    // let bookId = 0;
    
    // if (bookIdElement) {
    //   const match = bookIdElement.textContent.match(/项目ID: (\d+)/);
    //   if (match && match[1]) {
    //     bookId = match[1];
    //   }
    // }
    
    // 异步发送GET请求删除后台任务表里数据
    fetch(`/autovideo/delete_job?book_id=`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }).catch(error => console.error('请求失败:', error));
    
    // 跳转到链接：/createvideo
    window.location.href = '/createvideo';
  });


});
