import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Bắt đầu quá trình build App...");

// 1. Chạy Next.js Build
console.log("\n[1/5] Đang build Frontend Next.js...");
execSync("npm run build", { stdio: 'inherit', cwd: __dirname });

const standaloneDir = path.join(__dirname, '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.error("Lỗi: Không tìm thấy thư mục .next/standalone. Đảm bảo next.config.ts có output: 'standalone'.");
  process.exit(1);
}

// 2. Chép file Static & Public
console.log("\n[2/5] Đang sao chép giao diện tĩnh...");
fs.cpSync(path.join(__dirname, '.next', 'static'), path.join(standaloneDir, '.next', 'static'), { recursive: true });
fs.cpSync(path.join(__dirname, 'public'), path.join(standaloneDir, 'public'), { recursive: true });

// 3. Chép thư mục electron-app & API Key
console.log("\n[3/5] Đang thiết lập Môi trường Backend & Giấu API Key...");
fs.cpSync(path.join(__dirname, 'electron-app'), path.join(standaloneDir, 'electron-app'), { recursive: true });

// Load ENV vào app để giấu API Key
if (fs.existsSync(path.join(__dirname, '.env'))) {
  fs.copyFileSync(path.join(__dirname, '.env'), path.join(standaloneDir, '.env'));
  console.log("  -> Đã ẩn giấu file .env thành công vào trong file biên dịch exe.");
} else {
  console.log("  -> ⚠️ Chưa tìm thấy file .env. Bạn lưu ý tạo file .env điền GEMINI_API_KEY trước khi build nhé.");
}

// 4. Tạo file cấu hình electron-builder
console.log("\n[4/5] Cấu hình trình đóng gói Electron Builder...");
const ebConfig = {
  appId: "com.autofb.app",
  productName: "Auto FB AI",
  directories: {
    app: ".",
    output: "../../dist-exe"
  },
  files: [
    "**/*"
  ],
  extraMetadata: {
    main: "electron-app/main.js"
  },
  win: {
    target: "nsis",
    icon: "public/icon.png"
  },
  mac: {
    target: "dmg",
    icon: "public/icon.png"
  }
};
fs.writeFileSync(path.join(standaloneDir, 'electron-builder.json'), JSON.stringify(ebConfig, null, 2));

// Install npm packages (if needed) for standalone
console.log("  -> Cài đặt dependency cho thư mục đóng gói...");
// It's mostly pre-installed in root, standalone uses relative node_modules from its bundle.
// electron-builder uses standard node_modules if present. Next standalone doesn't include devDependencies.

// 5. Build ra mã nhị phân EXE
console.log("\n[5/5] Đang đóng gói thành file .exe hoàn chỉnh (quá trình này có thể mất vài phút)...");
try {
  // Use npx electron-builder from the standalone folder, but it needs electron dependencies
  // Actually, we can run electron-builder from the root folder, targeting the standalone folder!
  execSync("npx electron-builder build --win --projectDir .next/standalone -c electron-builder.json", { stdio: 'inherit', cwd: __dirname });
  
  console.log("\n🎉 HOÀN TẤT! File cài đặt của bạn nằm ở thư mục: dist-exe/");
} catch (e) {
  console.error("Lỗi khi build electron:", e);
}
