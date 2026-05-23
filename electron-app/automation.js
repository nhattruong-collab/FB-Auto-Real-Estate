const puppeteer = require('puppeteer-core');

async function runAutomation(config, logCallback) {
  const { keywords, postContent } = config;
  
  logCallback(`[HỆ THỐNG] Chuẩn bị bộ máy tự động hóa...`);
  logCallback(`[HỆ THỐNG] Đang kết nối với Google Chrome của bạn để dùng tài khoản FB hiện tại...`);

  try {
    // Kết nối tới Chrome đang bật ở chế độ debug
    // Điều kiện tiên quyết: Phải mở Chrome bằng lệnh: chrome.exe --remote-debugging-port=9222
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    logCallback(`[THÀNH CÔNG] Đã liên kết với Chrome thành công. Bắt đầu tác vụ thao tác chuột/phím.`);
    
    // Mở Tab mới
    const page = await browser.newPage();

    logCallback(`[HÀNH ĐỘNG] Mở Facebook - Tìm kiếm group từ khóa: "${keywords}"`);
    await page.goto(`https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(keywords)}`, { waitUntil: 'load' });

    logCallback(`[CHỜ] Đợi 5 giây để Facebook load hoàn tất (mô phỏng thao tác người dùng chậm)...`);
    await new Promise(r => setTimeout(r, 5000));

    logCallback(`[HÀNH ĐỘNG] Cuộn trang và tìm group...`);
    // Giả lập scroll trang
    await page.evaluate(() => {
      window.scrollBy(0, 500);
    });
    
    await new Promise(r => setTimeout(r, 2000));

    logCallback(`[KỊCH BẢN THỰC TẾ TRONG TƯƠNG LAI]`);
    logCallback(`- Do Facebook thường xuyên thay đổi class obfuscation, bạn cần F12 lấy XPATH thực tế.`);
    logCallback(`- Cấu trúc giả định: await page.click('aria-label="Tạo bài viết nhóm"');`);
    logCallback(`- await page.keyboard.type(\`${postContent}\`);`);
    logCallback(`- await page.click('aria-label="Đăng"');`);

    logCallback(`[THÀNH CÔNG] Kịch bản demo đã thực hiện xong! Bạn có thể kiểm tra tab mới vừa hiển thị.`);
    
    await browser.disconnect();
    logCallback(`[HỆ THỐNG] Đã ngắt kết nối với Chrome an toàn.`);
    
  } catch (error) {
    if (error.message.includes('fetch')) {
      logCallback(`[LỖI NGHIÊM TRỌNG] Không thể kết nối với Chrome.`);
      logCallback(`=> VUI LÒNG TẮT HOÀN TOÀN CHROME HIỆN TẠI.`);
      logCallback(`=> Sau đó mở hộp thoại Run (Win + R), nhập lệnh sau đây:`);
      logCallback(`   chrome.exe --remote-debugging-port=9222`);
      logCallback(`=> Sau khi mở lại lên Chrome, hãy chạy lại script nhé!`);
    } else {
      logCallback(`[LỖI] ${error.message}`);
    }
    throw error;
  }
}

module.exports = { runAutomation };
