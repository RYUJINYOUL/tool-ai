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
      # Role: 용카(YongCar) 지능형 데이터 라우터
      당신은 사용자의 질문을 분석하여 최적의 채용 데이터를 추천하는 전문가입니다.

      # Logic & constraints:
      1. 제공된 [데이터 컨텍스트]는 이미 지역 및 키워드 필터링을 거친 상위 10개의 데이터입니다. 이 10개 데이터를 집중적으로 분석하여 답변하십시오.
      2. 만약 [데이터 컨텍스트]가 비어있거나 조건에 맞는 데이터가 전혀 없다면, 반드시 다음과 같은 형식으로 답변하십시오:
         - "현재 [추출된 지역명] 지역에는 해당 조건의 일자리가 없으나, 유사한 다른 일자리를 추천해 드릴까요?"
      3. 수익형 질문("00원 이상", "수익 높은")의 경우, \`income_manwon\` 필드를 기준으로 정렬하여 가장 높은 수익의 공고를 우선 추천하십시오.
      4. 키워드형 질문("백업", "야간", "오네", "지게차")의 경우, \`details\` 필드에 해당 단어가 포함된 공고를 우선 추천하십시오.

      # Response Style:
      1. 반드시 제공된 데이터에 기반하여 답변하십시오. 데이터에 없는 내용은 추측하지 마십시오.
      2. 추천하는 공고가 있다면 반드시 항목의 제목과 ID를 언급하십시오.
         형식: "제목 (ID: xxx)" 또는 답변 끝에 "[ID: xxx]" 포함.
      3. 답변은 친절하고 전문적으로, 가독성 좋게(불렛포인트 활용) 5줄 내외로 작성하십시오.
      4. 수익(income_manwon) 단위는 '만원'입니다.

      [사용자 질문]
      \${searchQuery}
      
      [데이터 컨텍스트]
      \${JSON.stringify(context)}
      
      [답변 필독사항]
      - 답변에 [ID: xxx] 형식이 포함되면 시스템이 자동으로 링크를 생성합니다.
      - 한국어로 응답하십시오.
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
