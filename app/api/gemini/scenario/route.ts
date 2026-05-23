import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { prompt } = await req.json();

    const fullPrompt = `Bạn là một AI sắp xếp kịch bản Auto Facebook.
Người dùng sẽ mô tả những gì họ muốn bot làm.
Bạn hãy trả về kịch bản theo dạng MẢNG JSON các thao tác.

Các loại thao tác (Action Type) hợp lệ:
- "scroll_home": Lướt News feed (Trang chủ) và có thể like bài. (Cần thuộc tính: durationSeconds)
- "search_and_pick_group": Tìm kiếm group theo từ khóa và chọn thuật ngẫu nhiên 1 group. (Không cần thuộc tính)
- "scroll_current_page": Lướt trang hiện tại (lướt trong group). (Cần thuộc tính: durationSeconds)
- "post_to_current_group": Đăng bài vào group hiện tại. (Không cần thuộc tính)

Ví dụ người dùng nói: "Lướt fb 1 phút, sau đó vào search group và ném bài luôn"
Bạn trả về JSON:
[
  { "type": "scroll_home", "durationSeconds": 60, "label": "Lướt News feed 1 phút" },
  { "type": "search_and_pick_group", "label": "Tìm và chọn Group ngẫu nhiên" },
  { "type": "post_to_current_group", "label": "Đăng bài viết mới" }
]

Ví dụ 2: "Vào group lướt chán chê 2 phút rồi mới đăng"
Bạn trả về JSON:
[
  { "type": "search_and_pick_group", "label": "Tìm và chọn Group ngẫu nhiên" },
  { "type": "scroll_current_page", "durationSeconds": 120, "label": "Lướt nhóm 2 phút" },
  { "type": "post_to_current_group", "label": "Đăng bài bán hàng" }
]

Yêu cầu người dùng hiện tại:
${prompt}

LƯU Ý QUAN TRỌNG:
Chỉ trả về DUY NHẤT một mảng JSON, không có code block markdown (\`\`\`), không có giải thích.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });
    
    let text = response.text || "[]";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return NextResponse.json({ actions: JSON.parse(text) });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tạo kịch bản." },
      { status: 500 }
    );
  }
}
