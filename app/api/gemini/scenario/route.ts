import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { prompt, isRandom } = await req.json();

    let userInstruction = prompt;
    if (isRandom) {
      userInstruction = "Hãy tự động tạo ra một kịch bản ngẫu nhiên nhưng rất tự nhiên, mô phỏng hành động thực tế của con người ví dụ: lướt trang cá nhân/home dạo chơi trước rồi mới tìm nhóm đăng bài, hoặc vào nhóm xem dạo khoảng 1-2 phút rồi mới đăng bài để tránh bot quét.";
    }

    const fullPrompt = `Bạn là một AI sắp xếp kịch bản Auto Facebook mô phỏng hành vi của người thật để tránh bị Facebook quét spam.
Hãy trả về kịch bản dưới dạng một đối tượng JSON gồm các thuộc tính sau:
- "name": Tên kịch bản ngắn gọn, sinh động và tự nhiên (Ví dụ: "Nuôi nick lướt dạo rồi đăng", "Khởi động nhẹ nhàng", "Tương tác sâu trước đăng", v.v.)
- "actions": MẢNG JSON các thao tác.

Các loại thao tác (Action Type) hợp lệ:
- "scroll_home": Lướt News feed (Trang chủ) và có thể like bài. (Cần thuộc tính: durationSeconds - số giây, nên khoảng từ 30-180 giây)
- "search_and_pick_group": Tìm kiếm group theo từ khóa và chọn ngẫu nhiên 1 group. (Không cần thuộc tính phụ)
- "scroll_current_page": Lướt trang hiện tại (lướt trong group). (Cần thuộc tính: durationSeconds - số giây, nên khoảng từ 30-120 giây)
- "post_to_current_group": Đăng bài vào group hiện tại. (Không cần thuộc tính phụ)

Ví dụ mẫu trả về dưới dạng JSON:
{
  "name": "Lướt Newsfeed rồi mới đăng bài",
  "actions": [
    { "type": "scroll_home", "durationSeconds": 60, "label": "Lướt News feed ngẫu nhiên 60s" },
    { "type": "search_and_pick_group", "label": "Tìm kiếm nhóm phù hợp" },
    { "type": "scroll_current_page", "durationSeconds": 30, "label": "Xem dạo nhóm 30s" },
    { "type": "post_to_current_group", "label": "Tiến hành đăng bài viết" }
  ]
}

Yêu cầu cụ thể từ người dùng hoặc hệ thống:
${userInstruction}

LƯU Ý CỰC KỲ QUAN TRỌNG:
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ, không có code block markdown (\`\`\`), không có bất kỳ giải thích nào bên ngoài.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });
    
    let text = response.text || "{}";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);
    return NextResponse.json({ 
      name: parsed.name || "Kịch bản tùy chỉnh AI", 
      actions: parsed.actions || [] 
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tạo kịch bản." },
      { status: 500 }
    );
  }
}
