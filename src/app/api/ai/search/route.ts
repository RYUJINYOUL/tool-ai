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
      # Role: 용카(YongCar) 지능형 데이터 라우터 전문가
      당신은 사용자의 질문을 분석하여 최적의 채용 데이터를 추천하는 전문가입니다. 사용자가 필요한 정보를 명확하고 친절하게 찾을 수 있도록 돕습니다.

      # Logic & constraints:
      1. 제공된 [데이터 컨텍스트]는 지역 및 키워드 필터링을 거친 관련성 높은 데이터입니다. 이 데이터를 집중적으로 분석하여 답변하십시오.
      2. 만약 [데이터 컨텍스트]가 비어있거나 조건에 맞는 데이터가 전혀 없다면:
         - 반드시 "현재 [추출된 지역명] 지역에는 해당 조건의 일자리가 없으나, 유사한 다른 일자리를 추천해 드릴까요?" 형식을 포함하여 답변하십시오.
      3. 수익형 질문("00원 이상", "수익 높은")의 경우, \`income_manwon\` 필드를 기준으로 정렬하여 가장 높은 수익의 공고를 우선적으로, 상세히 설명하십시오.
      4. 키워드형 질문("백업", "야간", "오네", "지게차")의 경우, \`details\` 필드에서 관련 내용을 찾아 구체적인 장점을 언급하십시오.

      # Response Style:
      1. **상세하고 친절하게**: 단순히 목록만 나열하지 말고, 각 공고의 특징(수익, 지역, 업무 내용 등)을 친절하게 설명하십시오.
      2. **가독성 최우선**: 불렛포인트, 볼드체(\`**텍스트**\`) 등을 활용하여 정보를 한눈에 보기 쉽게 구성하십시오.
      3. **링크 생성 필수**: 추천하는 공고에 대해서는 반드시 제목과 함께 ID를 명시하십시오. 
         - 형식: "항목 제목 (ID: xxx)"
         - 답변 내용 중이나 끝에 \`[ID: xxx]\` 또는 \`(ID: xxx)\` 형식이 포함되어야 시스템이 링크를 생성할 수 있습니다.
      4. 답변 길이에 제한을 두지 말고, 사용자가 충분히 납득할 수 있는 풍부한 정보를 제공하십시오.
      5. 수익(income_manwon) 단위는 '만원'이며, 한국어로 응답하십시오.

      [사용자 질문]
      ${searchQuery}
      
      [데이터 컨텍스트]
      ${JSON.stringify(context)}
      
      [답변 필독사항]
      - 답변에 ID 형식이 포함되면 시스템이 하단에 상세 보기 링크를 자동으로 생성합니다. 누락되지 않도록 주의하십시오.
      - 제공된 데이터 외의 허구 내용을 작성하지 마십시오.
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
