import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { phoneNumber } = await req.json();

    const fullPrompt = `Bạn là một AI chuyên viết nội dung marketing bất động sản.
Hãy tạo tối đa 5 câu mẫu bình luận (comment) ngắn gọn, tự nhiên và thân thiện để người môi giới có thể đính kèm ở cuối phần tư vấn cho khách hàng.
Yêu cầu:
- Kêu gọi khách hàng liên hệ qua số điện thoại/Zalo: ${phoneNumber}
- Mỗi câu trên 1 dòng duy nhất.
- Không có số thứ tự ở đầu, không có gạch đầu dòng, không có bất kỳ ký tự thừa nào khác.
- Tạo tối đa 5 mẫu.
- Ví dụ mẫu:
Nhắn Zalo ${phoneNumber} mình gửi thông tin và sổ hồng chi tiết nhé.
Ib Zalo ${phoneNumber} để mình tư vấn thêm vài căn siêu đẹp cho bạn.
Bạn liên hệ ${phoneNumber} để đi xem nhà trực tiếp nha.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });
    
    let text = response.text || "";
    // Xóa các dòng rỗng
    text = text.split('\n').map(t => t.trim()).filter(Boolean).slice(0, 5).join('\n');

    return NextResponse.json({ templates: text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tạo câu comment mẫu." },
      { status: 500 }
    );
  }
}
