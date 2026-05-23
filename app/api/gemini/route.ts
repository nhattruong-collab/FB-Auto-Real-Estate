import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { prompt } = await req.json();

    const fullPrompt = `Bạn là một chuyên gia marketing bất động sản xuất sắc. 
Hãy viết một bài đăng Facebook thật thu hút, ngắn gọn, có sử dụng emoji phù hợp để đăng vào các group mua bán nhà đất.

Mô tả từ người dùng:
${prompt}

Yêu cầu:
- Bố cục rõ ràng: Tiêu đề thu hút, Vị trí, Thông số (Diện tích, số phòng, pháp lý), Giá bán, Thông tin liên hệ.
- Chỉ tạo ra nội dung bài viết, không bao gồm các hướng dẫn hay lời mở đầu/kết thúc thừa thãi.
- Văn phong: Chuyên nghiệp, tạo sự tin tưởng, thúc giục hành động.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });
    
    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tạo bài viết bằng AI." },
      { status: 500 }
    );
  }
}
