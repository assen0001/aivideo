// 页面加载时初始化渲染
document.addEventListener('DOMContentLoaded', function () {
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
  
  // 视频播放功能 - 点击后跳转到帮助页面
  function initVideoPlayer() {
    const playBtn = document.getElementById('playDemoBtn');
    
    // 点击播放按钮时，跳转到指定URL
    playBtn.addEventListener('click', function() {
      window.location.href = '/help?id=6';
    });
  }
  
  // 初始化视频播放器
  initVideoPlayer();
});