
// 页面加载时初始化渲染
document.addEventListener('DOMContentLoaded', function () {
  // 价格方案切换
  // var monthlyBilling = document.getElementById('monthly-billing');
  // var yearlyBilling = document.getElementById('yearly-billing');
  // monthlyBilling.addEventListener('click', function () {
  //   monthlyBilling.classList.add('text-primary', 'bg-primary/5');
  //   monthlyBilling.classList.remove('text-gray-500');
  //   yearlyBilling.classList.remove('text-primary', 'bg-primary/5');
  //   yearlyBilling.classList.add('text-gray-500');
  // });
  // yearlyBilling.addEventListener('click', function () {
  //   yearlyBilling.classList.add('text-primary', 'bg-primary/5');
  //   yearlyBilling.classList.remove('text-gray-500');
  //   monthlyBilling.classList.remove('text-primary', 'bg-primary/5');
  //   monthlyBilling.classList.add('text-gray-500');
  // });

  // FAQ切换 - 修复版本
  var faqToggles = document.querySelectorAll('.faq-toggle');
  console.log('找到的FAQ切换按钮数量:', faqToggles.length);
  
  faqToggles.forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      console.log('FAQ按钮被点击');
      var content = toggle.nextElementSibling;
      var icon = toggle.querySelector('i');
      
      // 关闭其他所有FAQ
      document.querySelectorAll('.faq-content').forEach(function (item) {
        if (item !== content) {
          item.style.display = 'none';
          var otherIcon = item.previousElementSibling.querySelector('i');
          if (otherIcon) {
            otherIcon.style.transform = 'rotate(0deg)';
          }
        }
      });
      
      // 切换当前FAQ
      if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        if (icon) {
          icon.style.transform = 'rotate(180deg)';
        }
      } else {
        content.style.display = 'none';
        if (icon) {
          icon.style.transform = 'rotate(0deg)';
        }
      }
    });
  });
  
  // 视频播放功能 - 点击后加载并在原位置播放
  function initVideoPlayer() {
    const playBtn = document.getElementById('playDemoBtn');
    const imageContainer = document.getElementById('demoImageContainer');
    const videoContainer = document.getElementById('demoVideoContainer');
    const backBtn = document.getElementById('backToImageBtn');
    const video = document.getElementById('demoVideo');
    let videoLoaded = false; // 标记视频是否已加载
    
    // 确保所有必要的元素都存在
    if (!playBtn || !imageContainer || !videoContainer || !backBtn || !video) {
      console.log('视频播放相关元素未找到');
      return;
    }
    
    // 点击播放按钮时，显示视频并加载
    playBtn.addEventListener('click', function() {
      imageContainer.classList.add('hidden');
      videoContainer.classList.remove('hidden');
      
      // 仅在首次点击时加载视频
      if (!videoLoaded) {
        const source = document.createElement('source');
        source.src = '/static/video/AIVideo001.mp4';
        source.type = 'video/mp4';
        video.appendChild(source);
        
        // 加载完成后自动播放
        video.addEventListener('loadeddata', function() {
          video.play().catch(e => console.log('视频播放需要用户交互', e));
        }, { once: true });
        
        video.load();
        videoLoaded = true;
      } else {
        // 如果已经加载过，直接播放
        video.play().catch(e => console.log('视频播放需要用户交互', e));
      }
    });
    
    // 返回查看图片
    backBtn.addEventListener('click', function() {
      video.pause();
      videoContainer.classList.add('hidden');
      imageContainer.classList.remove('hidden');
    });
  }
  
  // 初始化视频播放器
  initVideoPlayer();
});