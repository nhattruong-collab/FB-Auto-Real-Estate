import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { groupPosts, libraryPosts } = await req.json();

    if (!groupPosts || !Array.isArray(groupPosts) || groupPosts.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    if (!libraryPosts || !Array.isArray(libraryPosts) || libraryPosts.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const fullPrompt = `Bạn là một trợ lý AI thông minh chuyên phân tích bài đăng bất động sản trên Facebook và đối chiếu nhu cầu khách hàng để đưa ra bình luận giới thiệu căn hộ/nhà đất thích hợp.

Dưới đây là danh sách bài đăng từ nhóm Facebook (Group Posts) mà bot vừa quét được:
${JSON.stringify(groupPosts, null, 2)}

Dưới đây là kho bài đăng giới thiệu bất động sản hiện có của bạn (Library Posts):
${JSON.stringify(libraryPosts.map(p => ({ id: p.id, content: p.content })), null, 2)}

Nhiệm vụ của bạn:
1. Duyệt qua từng bài đăng trong danh sách Group Posts.
2. Xác định xem bài đăng đó có phải là một LỜI TÌM KIẾM/NHU CẦU MUA hoặc THUÊ từ khách hàng hay không (Ví dụ: "cần mua", "tìm mua", "tìm nhà dưới 4 tỷ", "cần thuê", "tìm mảnh đất", v.v.). Nếu là bài quảng cáo bán, bài chia sẻ tin tức dạo, hoặc bài không liên quan, hãy BỎ QUA.
3. Đối với mỗi bài tìm kiếm bất động sản của khách hàng, hãy phân tích tiêu chí của họ (khu vực, giá bđs, diện tích, mục đích) và tìm trong "Library Posts" xem có sản phẩm nào phù hợp hoặc tương đồng có thể đáp ứng không (Ví dụ: khách tìm dưới 4 tỷ ở Tam Bình, trong kho có bài bán nhà Tam Bình 3.8 tỷ hoặc lân cận 4.2 tỷ thì coi là khớp tốt).
4. Nếu tìm được sản phẩm khớp, hãy soạn một câu giới thiệu ngắn gọn (customIntro) dài khoảng 1-2 câu, nêu rõ những đặc điểm nổi bật nhất khớp theo đúng nhu cầu của họ (Ví dụ: "Chào bạn, bên mình đang có căn nhà Tam Bình hẻm xe hơi, diện tích 52m2 có sổ riêng chính chủ bán chỉ 3.8 tỷ rất khớp nhu cầu của bạn ạ!"). Văn phong phải lịch sự, chân thành và tự nhiên như người thật tư vấn.

Hãy trả về kết quả dưới dạng một cấu trúc JSON duy nhất:
{
  "matches": [
    {
      "groupPostId": "ID bài viết nhóm",
      "matchedPostId": "ID bài viết trong kho phù hợp nhất",
      "reason": "Giải thích ngắn gọn lý do khớp",
      "customIntro": "Lời bình luận giới thiệu ngắn gọn, súc tích (1-2 câu) đúng trọng tâm nhu cầu"
    }
  ]
}

Nếu không có bài đăng nào khớp hoặc không có bài tìm mua nào, hãy trả về mảng "matches" rỗng.
LƯU Ý CỰC KỲ QUAN TRỌNG: Chỉ trả về chuỗi JSON thô hợp lệ, không bọc trong thẻ markdown \`\`\` hay có bất kỳ giải thích nào.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  groupPostId: { type: Type.STRING },
                  matchedPostId: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  customIntro: { type: Type.STRING }
                },
                required: ["groupPostId", "matchedPostId", "reason", "customIntro"]
              }
            }
          },
          required: ["matches"]
        }
      }
    });

    const text = (response.text || "{}").trim();
    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Gemini Match Error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi phân tích và khớp kịch bản bằng AI.", matches: [] },
      { status: 500 }
    );
  }
}
