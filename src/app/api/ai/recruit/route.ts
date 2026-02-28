import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // 2.5 flash is preview, using 1.5/2.0 for stability if 2.5 not found

        const prompt = `
      당신은 채용 공고 정리 전문가입니다. 
      아래의 가공되지 않은 채용 공고 텍스트를 분석하여 구조화된 JSON 데이터로 변환해주세요.
      
      [공고 텍스트]
      ${text}
      
      [응답 형식]
      {
        "courier": "택배사명 (예: CJ대한통운, 롯데, 한진 등)",
        "delivery_address": "배송지 주소 (동/구 단위)",
        "terminal_address": "터미널 주소",
        "delivery_ratio": "배송 비율 (예: 아파트 X%, 지번 Y%)",
        "income": "매출 / 수익",
        "sorting_helper": "분류도우미 유무",
        "working_hours": "근무시간",
        "agency": "대리점명",
        "license": "화물운송자격증 필요여부",
        "deadline": "모집마감 (예: 채용 시 마감)",
        "contact": "연락처",
        "description": "상세설명 및 기타 안내"
      }
      
      [주의 사항]
      1. 반드시 JSON 형식으로만 응답하세요.
      2. 텍스트에서 찾을 수 없는 정보는 빈 문자열("")로 처리하세요. 특히 '대리점명' 같은 정보가 없으면 비워두세요.
      3. 가능한 한 텍스트의 내용을 그대로 살려 정리해주세요.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonText = response.text();

        // Markdown code block removal if present
        jsonText = jsonText.replace(/```json|```/g, '').trim();

        const parsedData = JSON.parse(jsonText);

        return NextResponse.json(parsedData);
    } catch (error) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({ error: 'AI 분석 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
