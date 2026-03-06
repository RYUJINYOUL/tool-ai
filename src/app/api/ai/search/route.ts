import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const { query: searchQuery, context } = await req.json();

        if (!searchQuery) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
      너는 용차/화물/배송 전문 AI 상담사야. 
      아래 제공된 [채용 정보 및 공지사항] 데이터를 바탕으로 사용자의 질문에 답변해줘.

      [핵심 가이드라인]
      1. 반드시 제공된 데이터에 기반하여 답변해. 데이터에 없는 내용은 추측하지 마.
      2. 적절한 공고가 있다면 반드시 해당 항목의 제목과 ID를 언급해줘. 
         형식: "제목 (ID: xxx)" 또는 답변 끝에 "[ID: xxx]"를 포함해줘.
      3. 조건(급여, 지역, 시간)이 완벽히 일치하지 않더라도 가장 유사한 항목을 추천해주고 이유를 설명해줘.
      4. 답변은 친절하고 전문적인 어조로, 가독성 좋게(불렛포인트 등 활용) 5줄 내외로 작성해줘.
      5. 수익(Income) 단위가 숫자만 있다면 '만원' 단위를 의미해. (예: 500 -> 500만원)

      [사용자 질문]
      ${searchQuery}
      
      [데이터 컨텍스트]
      ${JSON.stringify(context)}
      
      [답변 필독사항]
      - 답변에 [ID: xxx] 형식이 포함되면 시스템이 자동으로 링크를 생성하니, 추천하는 공고가 있다면 ID를 꼭 포함해줘.
      - 한국어로 응답해.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ answer: text });
    } catch (error) {
        console.error('Gemini Search API Error:', error);
        return NextResponse.json({ error: 'AI 검색 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
