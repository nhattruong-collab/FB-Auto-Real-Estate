const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Create a global state to allow stopping
let shouldStop = false;

function normalizeKeywords(keywords) {
  const raw = Array.isArray(keywords) ? keywords.join('\\n') : (keywords || '');
  const items = String(raw)
    .split(/[\n,;|]+/g)
    .map(k => k.trim())
    .filter(Boolean);

  return items.length > 0 ? [...new Set(items)] : ['Bat dong san'];
}


async function doActionWait(ms, logCallback) {
  let elapsed = 0;
  while (elapsed < ms) {
    if (shouldStop) throw new Error("STOPPED_BY_USER");
    await new Promise(r => setTimeout(r, 1000));
    elapsed += 1000;
  }
}

async function actionScrollHome(page, durationSeconds, logCallback) {
   logCallback(`[HÀNH ĐỘNG] Lướt News feed trong ${durationSeconds} giây...`);
   await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' }).catch(e=>null);
   const ms = (durationSeconds || 30) * 1000;
   let elapsed = 0;
   while(elapsed < ms) {
     if (shouldStop) throw new Error("STOPPED_BY_USER");
     await page.evaluate(() => window.scrollBy(0, 800));
     await new Promise(r => setTimeout(r, 2000));
     elapsed += 2000;
     
     // Thỉnh thoảng like dạo
     if (Math.random() < 0.3) {
       await page.evaluate(() => {
          const likes = Array.from(document.querySelectorAll('div[aria-label="Thích"], div[aria-label="Like"]'));
          if (likes.length > 0) {
             const randomLike = likes[Math.floor(Math.random() * likes.length)];
             randomLike.click();
          }
       }).catch(e=>null);
     }
   }
}

async function actionScrollCurrentPage(page, durationSeconds, logCallback) {
   logCallback(`[HÀNH ĐỘNG] Đi dạo quanh trang hiện tại ${durationSeconds} giây...`);
   const ms = (durationSeconds || 30) * 1000;
   let elapsed = 0;
   while(elapsed < ms) {
     if (shouldStop) throw new Error("STOPPED_BY_USER");
     await page.evaluate(() => window.scrollBy(0, 800));
     await new Promise(r => setTimeout(r, 2000));
     elapsed += 2000;
   }
}

async function actionSearchAndPickGroup(page, keywords, logCallback, forcedKeyword = null) {
    const keywordList = normalizeKeywords(keywords);
    const pickedKeyword = forcedKeyword || keywordList[Math.floor(Math.random() * keywordList.length)];
    logCallback(`[HÀNH ĐỘNG] Mở Facebook - Tìm kiếm group từ khóa: "${pickedKeyword}" (${keywordList.length} từ khóa)`);
    await page.goto(`https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(pickedKeyword)}`, { waitUntil: 'networkidle2' }).catch(e=>null);

    logCallback(`[CHỜ] Đợi trang FB load danh sách nhóm...`);
    await doActionWait(4000, logCallback);

    logCallback(`[HÀNH ĐỘNG] Cuộn trang để xem thêm nhóm...`);
    await page.evaluate(() => window.scrollBy(0, 1000));
    await doActionWait(2000, logCallback);

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
      logCallback(`[CẢNH BÁO] Không tìm thấy group nào phù hợp với từ khóa.`);
      return false;
    }

    const randomGroup = groupLinks[Math.floor(Math.random() * groupLinks.length)];
    logCallback(`[HỆ THỐNG] Tìm thấy ${groupLinks.length} nhóm. Chọn ngẫu nhiên: ${randomGroup}`);
    
    await page.goto(randomGroup, { waitUntil: 'networkidle2' }).catch(e=>null);
    logCallback(`[CHỜ] Đợi truy cập vào Group...`);
    await doActionWait(5000, logCallback);
    return randomGroup;
}

async function actionPostToCurrentGroup(page, post, logCallback) {
    if (!post) {
       logCallback(`[CẢNH BÁO] Không có nội dung bài đăng nào!`);
       return;
    }
    logCallback(`[HÀNH ĐỘNG] Đang tìm khung tạo bài viết...`);
    
    let clickedBox = await page.evaluate(() => {
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
      await doActionWait(3000, logCallback);
      
      const textBox = await page.$('div[contenteditable="true"][role="textbox"]');
      if (textBox) {
         logCallback(`[HÀNH ĐỘNG] Đang tự động điền nội dung bài bán hàng...`);
         await textBox.click();
         await page.evaluate((text) => document.execCommand('insertText', false, text), post.content);
         
         logCallback(`[CHỜ] Đợi 3s sau khi điền chữ xong...`);
         await doActionWait(3000, logCallback);
         
         let imagePaths = [];
         if (post.images && post.images.length > 0) {
            logCallback(`[HÀNH ĐỘNG] Đang chuẩn bị ${post.images.length} ảnh để tải lên...`);
            try {
               for (let i = 0; i < post.images.length; i++) {
                  const base64Data = post.images[i].replace(/^data:image\/\w+;base64,/, "");
                  const tmpPath = path.join(os.tmpdir(), `fb_post_img_${Date.now()}_${i}.jpg`);
                  fs.writeFileSync(tmpPath, base64Data, 'base64');
                  imagePaths.push(tmpPath);
               }
               
               const fileChooserPromise = page.waitForFileChooser({ timeout: 4000 }).catch(e => null);
               const clickedPhotoBtn = await page.evaluate(() => {
                 const dialog = document.querySelector('div[role="dialog"]');
                 if(!dialog) return false;
                 const btns = Array.from(dialog.querySelectorAll('div[role="button"]'));
                 for (let btn of btns) {
                   const ariaLabel = btn.getAttribute('aria-label') || '';
                   if (ariaLabel.includes('Ảnh/video') || ariaLabel.includes('Photo/video') || ariaLabel.includes('Ảnh')) {
                     btn.click();
                     return true;
                   }
                 }
                 return false;
               });
               
               let uploaded = false;
               if(clickedPhotoBtn) {
                   logCallback(`[HÀNH ĐỘNG] Đã mở khu vực tải ảnh lên. Tự động xử lý File Dialog...`);
                   const fileChooser = await fileChooserPromise;
                   if (fileChooser) {
                      await fileChooser.accept(imagePaths);
                      uploaded = true;
                      logCallback(`[THÀNH CÔNG] Đã tải ảnh lên thành công. CHỜ 8s...`);
                      await doActionWait(8000, logCallback);
                   } else {
                      logCallback(`[HÀNH ĐỘNG] Không có OS Dialog, tiếp tục đẩy ảnh qua input ngầm...`);
                   }
               }

               if (!uploaded) {
                 logCallback(`[HÀNH ĐỘNG] Đẩy trực tiếp ảnh vào trình duyệt...`);
                 let fileInputs = await page.$$('div[role="dialog"] input[type="file"]');
                 if (fileInputs.length === 0) fileInputs = await page.$$('input[type="file"][accept*="image"]');
                 
                 for (let fileInput of fileInputs) {
                    const accept = await page.evaluate(el => el.getAttribute('accept') || '', fileInput);
                    if (accept.includes('image') || accept === '*/*') {
                       try {
                          await fileInput.uploadFile(...imagePaths);
                          uploaded = true;
                          logCallback(`[THÀNH CÔNG] Đã tải lên qua input ẩn. CHỜ 8s để Facebook xử lý ảnh...`);
                          await doActionWait(8000, logCallback);
                          break;
                       } catch(e) {}
                    }
                 }
               }
               if (!uploaded) logCallback(`[CẢNH BÁO] Không tìm thấy khe đăng ảnh.`);
            } catch(e) {
               logCallback(`[LỖI] Lỗi chuẩn bị file ảnh: ${e.message}`);
            }
         }

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
            await doActionWait(4000, logCallback);
         } else {
            logCallback(`[CẢNH BÁO] Không tìm thấy nút Đăng, hoặc nhóm này yêu cầu bạn trả lời/chọn loại hình kinh doanh trước.`);
         }
      } else {
         logCallback(`[CẢNH BÁO] Không tìm thấy ô gõ chữ. Giao diện nhóm này có thể khác biệt.`);
      }
    } else {
       logCallback(`[CẢNH BÁO] Không thấy chỗ "Viết gì đó". Bạn CHƯA THAM GIA nhóm này hoặc bị cấm đăng.`);
    }
}

async function runAIAutoCommentMatch(page, posts, commentTemplates, logCallback, groupUrl) {
  logCallback(`[HÀNH ĐỘNG] AI đang lên danh sách nhóm từ khóa hành vi mua (Ví dụ: cần tìm nhà, tìm đất...)`);
  const intentKeywords = ["cần mua", "tìm mua", "tìm nhà", "cần tìm", "tài chính"];
  const randomIntent = intentKeywords[Math.floor(Math.random() * intentKeywords.length)];
  
  const searchUrl = groupUrl.endsWith('/') ? `${groupUrl}search/?q=${encodeURIComponent(randomIntent)}` : `${groupUrl}/search/?q=${encodeURIComponent(randomIntent)}`;
  
  logCallback(`[HÀNH ĐỘNG] Chuyển hướng tìm kiếm trong nhóm với từ khóa: "${randomIntent}"`);
  await page.goto(searchUrl, { waitUntil: 'networkidle2' }).catch(e=>null);
  await doActionWait(5000, logCallback);
  
  // Cuộn trang nhẹ để tải thêm bài viết kết quả tìm kiếm
  await page.evaluate(() => window.scrollBy(0, 800));
  await doActionWait(3000, logCallback);
  await page.evaluate(() => window.scrollBy(0, 800));
  await doActionWait(3000, logCallback);

  try {
    const rawGroupPosts = await page.evaluate(() => {
      const sel = 'div[data-ad-preview="message"], div[dir="auto"], div[role="article"]';
      const els = Array.from(document.querySelectorAll(sel));
      return els.map((el, i) => ({
        id: `gp_post_${i}_${Date.now().toString().slice(-4)}`,
        text: el.innerText ? el.innerText.trim() : ''
      })).filter(p => p.text.length > 25 && p.text.length < 1500);
    });

    if (!rawGroupPosts || rawGroupPosts.length === 0) {
      logCallback(`[HỆ THỐNG] Không tìm thấy bài nào với từ khóa "${randomIntent}". Sẽ chuyển nhóm khác ở chu kỳ sau.`);
      return;
    }

    logCallback(`[AI PHÂN TÍCH] Đã quét được ${rawGroupPosts.length} bài đăng. Đang tải dữ liệu đối sánh bất động sản khớp nhu cầu khách...`);

    const clientFetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
    const res = await clientFetch('http://localhost:3000/api/gemini/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupPosts: rawGroupPosts.slice(0, 8),
        libraryPosts: posts || []
      })
    });

    const data = await res.json().catch(() => ({ matches: [] }));
    if (!data.matches || data.matches.length === 0) {
      logCallback(`[AI PHÂN TÍCH] Quét xong. Không thấy khách nào có nhu cầu khớp sản phẩm bất động sản của bạn.`);
      return;
    }

    logCallback(`[AI PHÂN TÍCH] Phát hiện ${data.matches.length} bài tìm bđs khớp tốt với kho hàng của bạn.`);

    for (let match of data.matches) {
      if (shouldStop) break;

      logCallback(`[AI KHỚP CHÍNH XÁC] Khớp nhu cầu mua: "${match.reason}"`);
      logCallback(`[HÀNH ĐỘNG] Đang tự động gõ bình luận giới thiệu căn phù hợp...`);

      const textSplit = commentTemplates ? commentTemplates.split('\n').map(t => t.trim()).filter(Boolean) : [];
      const suffix = textSplit.length > 0 ? textSplit[Math.floor(Math.random() * textSplit.length)] : 'Vui lòng liên hệ mình để xem chi tiết nhé!';
      const fullComment = `${match.customIntro}\n${suffix}`;

      const commented = await page.evaluate((toCommentText) => {
        const commentBox = document.querySelector('div[aria-label="Viết bình luận"], div[aria-label="Write a comment..."], div[role="textbox"][aria-label*="bình luận"]');
        if (commentBox) {
          commentBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          commentBox.focus();
          document.execCommand('insertText', false, toCommentText);
          return true;
        }
        return false;
      }, fullComment);

      if (commented) {
        await doActionWait(2000, logCallback);
        await page.keyboard.press('Enter');
        logCallback(`[THÀNH CÔNG] Đã bình luận bám đuổi bằng AI thành công!`);
        await doActionWait(4000, logCallback);
      } else {
        logCallback(`[CẢNH BÁO] Không tìm thấy ô bình luận dưới bài viết khớp bđs.`);
      }
    }
  } catch (err) {
    logCallback(`[LỖI AX] Lỗi tiến trình tự động bình luận bằng AI: ${err.message}`);
  }
}

async function runAutomation(config, logCallback, postCount = 0) {
  const { mode, keywords, posts, intervalMinutes, postsBeforeBreak = 10, breakMinutes = 30, scenarios, commentTemplates } = config;
  const cycleKeywords = normalizeKeywords(keywords);
  shouldStop = false;
  
  logCallback(`[HỆ THỐNG] Chuẩn bị bộ máy tự động hóa chạy nhánh: ${mode === 'comment' ? 'Bình luận AI' : 'Đăng bài'}...`);
  logCallback(`[HỆ THỐNG] Đang kết nối với Google Chrome của bạn để dùng tài khoản FB hiện tại...`);

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    logCallback(`[THÀNH CÔNG] Đã liên kết với Chrome thành công. Bắt đầu tác vụ thao tác chuột/phím.`);
    
    // Pick Scenario
    let currentScenario = scenarios && scenarios.length > 0 ? scenarios[Math.floor(Math.random() * scenarios.length)] : null;
    if (!currentScenario) {
       currentScenario = { actions: [{type: 'search_and_pick_group'}, {type: 'post_to_current_group'}] };
    }

    const post = posts && posts.length > 0 ? posts[Math.floor(Math.random() * posts.length)] : null;
    if (!post && mode !== 'comment' && currentScenario.actions.some(a => a.type === 'post_to_current_group')) {
       logCallback(`[CẢNH BÁO] Kịch bản yêu cầu đăng bài nhưng bạn chưa chọn bài viết nào! Sẽ bỏ qua thao tác đăng.`);
    }

    const page = await browser.newPage();
    
    // Tự động bỏ qua hộp thoại xác nhận khi rời trang (ví dụ: "Leave site?", "Changes you made may not be saved")
    page.on('dialog', async dialog => {
      try {
        logCallback(`[HỆ THỐNG] Đã tự động đóng hộp thoại cảnh báo: ${dialog.message()}`);
        await dialog.accept();
      } catch (err) {
        // Bỏ qua lỗi nếu hộp thoại đã tự động đóng
      }
    });

    if (mode === 'comment') {
        logCallback(`[KỊCH BẢN] Đang chạy kịch bản riêng: Tự Động Bình Luận AI theo tư vấn bám đuổi.`);
        for (const keyword of cycleKeywords) {
          if (shouldStop) break;
          logCallback(`[HỆ THỐNG] Chu kỳ này đang chạy từ khóa: "${keyword}"`);
          const groupUrl = await actionSearchAndPickGroup(page, keywords, logCallback, keyword);
          if (!shouldStop && groupUrl) {
            await runAIAutoCommentMatch(page, posts, commentTemplates, logCallback, groupUrl);
          }
        }
    } else {
        logCallback(`[KỊCH BẢN] Đang chạy kịch bản: ${currentScenario.name || 'Mặc định'}`);
        for (const keyword of cycleKeywords) {
           if (shouldStop) break;
           logCallback(`[HỆ THỐNG] Chu kỳ này đang chạy từ khóa: "${keyword}"`);
           for (let action of currentScenario.actions) {
              if (shouldStop) break;
              try {
                switch (action.type) {
                  case 'scroll_home':
                    await actionScrollHome(page, action.durationSeconds || 60, logCallback);
                    break;
                  case 'search_and_pick_group':
                    await actionSearchAndPickGroup(page, keywords, logCallback, keyword);
                    break;
                  case 'scroll_current_page':
                    await actionScrollCurrentPage(page, action.durationSeconds || 30, logCallback);
                    break;
                  case 'post_to_current_group':
                    await actionPostToCurrentGroup(page, post, logCallback);
                    break;
                  default:
                    logCallback(`[BỎ QUA] Hành động không hỗ trợ: ${action.type}`);
                }
              } catch (err) {
                if (err.message === "STOPPED_BY_USER") {
                   logCallback(`[HỆ THỐNG] Đã nhận lệnh ngắt giữa chừng kịch bản.`);
                   break;
                } else {
                   logCallback(`[LỖI] Xảy ra lỗi khi chạy hành động ${action.type}: ${err.message}`);
                }
              }
           }
        }
    }

    logCallback(`[HỆ THỐNG] Kịch bản bot vòng này đã kết thúc. Đang dọn dẹp tab...`);
    try {
      await page.close();
    } catch(e) {}
    await browser.disconnect();
    
    if (shouldStop) {
       logCallback(`[HỆ THỐNG] Đã nhận lệnh Dừng. Dừng auto.`);
       return;
    }

    postCount++;
    if (postCount >= postsBeforeBreak) {
       logCallback(`[CHỜ] Đã chạy xong ${postCount}/${postsBeforeBreak} bài. Bắt đầu NGHỈ DÀI ${breakMinutes} phút theo cấu hình...`);
       await doActionWait(breakMinutes * 60 * 1000, logCallback).catch(e=>{});
       if (shouldStop) { logCallback(`[HỆ THỐNG] Đã hủy thời gian chờ nghỉ dài. Dừng auto.`); return; }
       postCount = 0;
    } else {
       logCallback(`[CHỜ] Đã chạy xong ${postCount}/${postsBeforeBreak} chu kỳ. Đang đợi ${intervalMinutes} phút trước khi chạy tiếp...`);
       await doActionWait(intervalMinutes * 60 * 1000, logCallback).catch(e=>{});
       if (shouldStop) { logCallback(`[HỆ THỐNG] Đã hủy thời gian chờ. Dừng auto.`); return; }
    }

    logCallback(`[HỆ THỐNG] Hết thời gian chờ, bắt đầu vòng lặp mới!`);
    await runAutomation(config, logCallback, postCount);
    
  } catch (error) {
    if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
      logCallback(`[LỖI NGHIÊM TRỌNG] Không thể kết nối với Chrome ở cổng 9222!`);
      logCallback(`=> VUI LÒNG DÙNG LỆNH MỚI BÊN DƯỚI ĐỂ VÀO. ĐÓNG CHROME CŨ:`);
      logCallback(`=> Mở Run (Win + R), nhập lệnh sau:`);
      logCallback(`   chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\\chrome-dev-fb"`);
      logCallback(`=> Đăng nhập Facebook ở Chrome mới mở rồi bấm BẮT ĐẦU CHẠY BOT. (Chờ loading xong FB rồi hãy bấm)`);
    } else {
      logCallback(`[LỖI] ${error.message}`);
    }
    
    if (browser) browser.disconnect().catch(e => {}); 
  }
}

module.exports = { 
  runAutomation,
  stopAutomation: () => { shouldStop = true; }
};



