
// 页面加载时初始化渲染
document.addEventListener('DOMContentLoaded', function () {
  // 价格方案切换
  var monthlyBilling = document.getElementById('monthly-billing');
  var yearlyBilling = document.getElementById('yearly-billing');
  monthlyBilling.addEventListener('click', function () {
    monthlyBilling.classList.add('text-primary', 'bg-primary/5');
    monthlyBilling.classList.remove('text-gray-500');
    yearlyBilling.classList.remove('text-primary', 'bg-primary/5');
    yearlyBilling.classList.add('text-gray-500');
  });
  yearlyBilling.addEventListener('click', function () {
    yearlyBilling.classList.add('text-primary', 'bg-primary/5');
    yearlyBilling.classList.remove('text-gray-500');
    monthlyBilling.classList.remove('text-primary', 'bg-primary/5');
    monthlyBilling.classList.add('text-gray-500');
  });

  // FAQ切换
  var faqToggles = document.querySelectorAll('.faq-toggle');
  faqToggles.forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var content = toggle.nextElementSibling;
      var icon = toggle.querySelector('i');
      // 关闭其他所有FAQ
      document.querySelectorAll('.faq-content').forEach(function (item) {
        if (item !== content) {
          item.classList.add('hidden');
          item.previousElementSibling.querySelector('i').classList.remove('rotate-180');
        }
      });
      // 切换当前FAQ
      content.classList.toggle('hidden');
      icon.classList.toggle('rotate-180');
    });
  });
  
});