export interface JobItem {
    id: string;
    title: string;
    details?: string;
    income_manwon?: number;
    [key: string]: any;
}

export class YongCarDataRouter {
    private cityKeywords: string[] = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
    private promptDetailKeywords: string[] = ["백업", "야간", "오네", "지게차"];
    private revenueQueryPhrases: string[] = ["수익 높은", "고수익", "돈 많이 버는"];

    private extractRegionFromQuery(query: string): string {
        for (const city of this.cityKeywords) {
            if (query.includes(city)) {
                return city;
            }
        }
        return "해당";
    }

    public routeData(searchQuery: string, context: JobItem[]): string {
        if (!context || !Array.isArray(context)) {
            return "데이터 컨텍스트 형식이 올바르지 않습니다.";
        }

        const regionFromQuery = this.extractRegionFromQuery(searchQuery);

        // 1. 제공된 데이터 컨텍스트가 비어있는 경우 처리
        if (context.length === 0) {
            return `현재 ${regionFromQuery} 지역에는 해당 조건의 일자리가 없으나, 유사한 다른 일자리를 추천해 드릴까요?`;
        }

        // 2. 사용자 질문 분석: 수익형 및 키워드형 질문 식별
        let isRevenueQuery = false;
        let minIncomeFilter = 0;

        const incomeMatch = searchQuery.match(/(\d+)\s*만원\s*이상/);
        if (incomeMatch) {
            minIncomeFilter = parseInt(incomeMatch[1], 10);
            isRevenueQuery = true;
        } else {
            for (const phrase of this.revenueQueryPhrases) {
                if (searchQuery.includes(phrase)) {
                    isRevenueQuery = true;
                    break;
                }
            }
        }

        let isKeywordQuery = false;
        const targetDetailKeywords: string[] = [];
        for (const keyword of this.promptDetailKeywords) {
            if (searchQuery.includes(keyword)) {
                targetDetailKeywords.push(keyword);
                isKeywordQuery = true;
            }
        }

        // 3. 데이터 필터링 및 정렬
        let filteredResults = [...context];

        // 키워드 필터링 (details 필드)
        if (isKeywordQuery) {
            for (const keyword of targetDetailKeywords) {
                filteredResults = filteredResults.filter(item => (item.details || "").includes(keyword));
            }
        }

        // 수익 필터링 (income_manwon 필드 - 'N만원 이상' 조건)
        if (minIncomeFilter > 0) {
            filteredResults = filteredResults.filter(item => (item.income_manwon || 0) >= minIncomeFilter);
        }

        // 필터링 후 조건에 맞는 데이터가 없는 경우 처리
        if (filteredResults.length === 0) {
            return `현재 ${regionFromQuery} 지역에는 해당 조건의 일자리가 없으나, 유사한 다른 일자리를 추천해 드릴까요?`;
        }

        // 최종적으로 필터링된 데이터를 수익 기준으로 정렬 (가장 높은 수익 우선)
        filteredResults.sort((a, b) => (b.income_manwon || 0) - (a.income_manwon || 0));

        // 4. 답변 생성
        const recommendedJobs = filteredResults.slice(0, 3); // 상위 3개 추천

        const responseLines = ["용카 지능형 데이터 라우터입니다. 요청하신 조건에 맞는 채용 데이터를 추천해 드립니다:"];

        if (isRevenueQuery && isKeywordQuery) {
            const keywordsStr = targetDetailKeywords.join(', ');
            responseLines.push(`'${keywordsStr}' 키워드를 포함하며 높은 수익을 기대할 수 있는 일자리를 찾아보았습니다:`);
        } else if (isRevenueQuery) {
            responseLines.push(`특히 높은 수익을 기대할 수 있는 일자리를 찾아보았습니다:`);
        } else if (isKeywordQuery) {
            const keywordsStr = targetDetailKeywords.join(', ');
            responseLines.push(`'${keywordsStr}' 키워드를 포함하는 일자리를 찾아보았습니다:`);
        } else { // 일반적인 질문인 경우
            responseLines.push("현재 추천 가능한 일자리는 다음과 같습니다:");
        }

        for (const job of recommendedJobs) {
            responseLines.push(`- ${job.title} (ID: ${job.id}) (예상 월 ${job.income_manwon}만원)`);
        }

        return responseLines.join('\n');
    }
}
