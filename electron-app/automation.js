const puppeteer = require('puppeteer-core');

async function runAutomation(config, logCallback) {
  const { keywords, posts, intervalMinutes } = config;
  
  logCallback(`[HỆ THỐNG] Chuẩn bị bộ máy tự động hóa...`);
  logCallback(`[HỆ THỐNG] Đang kết nối với Google Chrome của bạn để dùng tài khoản FB hiện tại...`);

  let browser;

  try {
    // Kết nối tới Chrome đang bật ở chế độ debug
    // Điều kiện tiên quyết: Phải mở Chrome bằng lệnh: chrome.exe --remote-debugging-port=9222
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    logCallback(`[THÀNH CÔNG] Đã liên kết với Chrome thành công. Bắt đầu tác vụ thao tác chuột/phím.`);
    
    // Mở Tab mới
    const page = await browser.newPage();

    logCallback(`[HÀNH ĐỘNG] Mở Facebook - Tìm kiếm group từ khóa: "${keywords}"`);
    await page.goto(`https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(keywords)}`, { waitUntil: 'load' });

    logCallback(`[CHỜ] Đợi 5 giây để Facebook load hoàn tất...`);
    await new Promise(r => setTimeout(r, 5000));

    logCallback(`[HÀNH ĐỘNG] Cuộn trang và tìm group...`);
    // Giả lập scroll trang
    await page.evaluate(() => {
      window.scrollBy(0, 500);
    });
    
    await new Promise(r => setTimeout(r, 2000));

    logCallback(`[KỊCH BẢN THỰC TẾ TRONG TƯƠNG LAI]`);
    logCallback(`- Bài viết sẽ lấy ngẫu nhiên từ 1 trong ${posts?.length || 0} bài bạn đã viết.`);
    logCallback(`- Cấu trúc giả định: await page.click('aria-label="Tạo bài viết nhóm"');`);
    
    if (posts && posts.length > 0) {
      logCallback(`- Nội dung ví dụ sẽ đăng: "${posts[0].content.substring(0, 50)}..."`);
    }

    logCallback(`- Chờ ${intervalMinutes} phút trước khi đăng nhóm tiếp theo...`);

    logCallback(`[THÀNH CÔNG] Kịch bản demo đã thực hiện xong! Bạn có thể kiểm tra tab mới vừa hiển thị trong Chrome.`);
    
    await browser.disconnect();
    logCallback(`[HỆ THỐNG] Đã ngắt kết nối với Chrome an toàn.`);
    
  } catch (error) {
    if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
      logCallback(`[LỖI NGHIÊM TRỌNG] Không thể kết nối với Chrome ở cổng 9222!`);
      logCallback(`=> VUI LÒNG TẮT HOÀN TOÀN TẤT CẢ CHROME HIỆN TẠI KỂ CẢ CHẠY NGẦM.`);
      logCallback(`=> Sau đó mở hộp thoại Run (Win + R), nhập lệnh sau đây và Enter:`);
      logCallback(`   chrome.exe --remote-debugging-port=9222`);
      logCallback(`=> Sau khi mở lại Chrome, hãy bấm BẮT ĐẦU CHẠY BOT lại nhé!`);
    } else {
      logCallback(`[LỖI] ${error.message}`);
    }
    
    // Đảm bảo đóng kết nối nếu có lỗi xảy ra
    if (browser) {
       browser.disconnect().catch(e => {}); 
    }
    throw error;
  }
}

module.exports = { runAutomation };
