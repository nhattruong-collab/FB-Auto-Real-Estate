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

    const post = posts && posts.length > 0 ? posts[0] : null;
    if (!post) {
       logCallback(`[LỖI] Bạn chưa chọn bài viết nào để đăng!`);
       await browser.disconnect();
       return;
    }

    logCallback(`[HÀNH ĐỘNG] Mở Facebook - Tìm kiếm group từ khóa: "${keywords}"`);
    await page.goto(`https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(keywords)}`, { waitUntil: 'networkidle2' });

    logCallback(`[CHỜ] Đợi trang FB load danh sách nhóm...`);
    await new Promise(r => setTimeout(r, 4000));

    logCallback(`[HÀNH ĐỘNG] Cuộn trang để xem thêm nhóm...`);
    // Giả lập scroll trang
    await page.evaluate(() => {
      window.scrollBy(0, 1000);
    });
    
    await new Promise(r => setTimeout(r, 2000));

    logCallback(`[HÀNH ĐỘNG] Đang trích xuất link các nhóm từ kết quả tìm kiếm...`);
    const groupLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/groups/"]'));
      const uniqueLinks = new Set();
      links.forEach(a => {
        let href = a.href;
        if (href.includes('/groups/search') || href.includes('/user/')) return;
        const match = href.match(/.*\/groups\/[^\/]+\//);
        if (match) uniqueLinks.add(match[0]);
      });
      return Array.from(uniqueLinks);
    });

    if (groupLinks.length === 0) {
      logCallback(`[LỖI] Không tìm thấy group nào phù hợp với từ khóa.`);
      await browser.disconnect();
      return;
    }

    logCallback(`[HỆ THỐNG] Tìm thấy ${groupLinks.length} nhóm. Sẽ bắt đầu vào nhóm đầu tiên: ${groupLinks[0]}`);
    
    await page.goto(groupLinks[0], { waitUntil: 'networkidle2' });
    logCallback(`[CHỜ] Đợi truy cập vào Group...`);
    await new Promise(r => setTimeout(r, 5000));

    logCallback(`[HÀNH ĐỘNG] Đang tìm khung tạo bài viết...`);
    
    let clickedBox = false;
    // Tìm bằng DOM JS
    clickedBox = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div[role="button"]'));
      for (let el of els) {
        const txt = el.innerText || '';
        if (txt.includes('Viết gì đó') || txt.includes('Bạn viết gì đi') || txt.includes('Write something') || txt.includes('Tạo bài viết')) {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (clickedBox) {
      logCallback(`[THÀNH CÔNG] Đã nhấn mở khung đăng bài. Chờ 3s...`);
      await new Promise(r => setTimeout(r, 3000));
      
      const textBox = await page.$('div[contenteditable="true"][role="textbox"]');
      if (textBox) {
         logCallback(`[HÀNH ĐỘNG] Đang tự động điền nội dung bài bán hàng...`);
         await textBox.click();
         await page.evaluate((text) => {
           document.execCommand('insertText', false, text);
         }, post.content);
         
         logCallback(`[CHỜ] Đợi 3s sau khi điền chữ xong...`);
         await new Promise(r => setTimeout(r, 3000));
         
         logCallback(`[HÀNH ĐỘNG] Tìm nút "Đăng"...`);
         const isPosted = await page.evaluate(() => {
           const btns = Array.from(document.querySelectorAll('div[role="button"]'));
           for (let btn of btns) {
             const txt = btn.innerText || '';
             const ariaDisabled = btn.getAttribute('aria-disabled') === 'true';
             if ((txt === 'Đăng' || txt === 'Post') && !ariaDisabled) {
                btn.click();
                return true;
             }
           }
           return false;
         });

         if (isPosted) {
            logCallback(`[THÀNH CÔNG] 🎉 ĐÃ BẤM ĐĂNG BÀI! Bài sẽ hiển thị sau vài giây nếu nhóm duyệt.`);
            await new Promise(r => setTimeout(r, 4000));
         } else {
            logCallback(`[CẢNH BÁO] Không tìm thấy nút Đăng, hoặc nhóm này yêu cầu bạn trả lời/chọn loại hình kinh doanh trước.`);
         }

      } else {
         logCallback(`[CẢNH BÁO] Không tìm thấy ô gõ chữ. Giao diện nhóm này có thể khác biệt.`);
      }

    } else {
       logCallback(`[CẢNH BÁO] Không thấy chỗ "Viết gì đó". Bạn CHƯA THAM GIA nhóm này hoặc bị cấm đăng.`);
    }

    logCallback(`[HỆ THỐNG] Kịch bản bot cho 1 nhóm đã kết thúc. Theo cài đặt sẽ lặp sau ${intervalMinutes} phút.`);
    
    await browser.disconnect();
    logCallback(`[HỆ THỐNG] Đã ngắt kết nối với Chrome an toàn.`);
    
  } catch (error) {
    if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
      logCallback(`[LỖI NGHIÊM TRỌNG] Không thể kết nối với Chrome ở cổng 9222!`);
      logCallback(`=> VUI LÒNG DÙNG LỆNH MỚI BÊN DƯỚI ĐỂ VÀO. ĐÓNG CHROME CŨ:`);
      logCallback(`=> Mở Run (Win + R), nhập lệnh sau:`);
      logCallback(`   chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\\chrome-dev-fb"`);
      logCallback(`=> Đăng nhập Facebook ở Chrome mới mở rồi bấm BẮT ĐẦU CHẠY BOT.`);
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
