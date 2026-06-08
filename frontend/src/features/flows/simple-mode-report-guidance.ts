export const owaspTopTen2025Categories = [
    'A01:2025 - Broken Access Control',
    'A02:2025 - Security Misconfiguration',
    'A03:2025 - Software Supply Chain Failures',
    'A04:2025 - Cryptographic Failures',
    'A05:2025 - Injection',
    'A06:2025 - Insecure Design',
    'A07:2025 - Authentication Failures',
    'A08:2025 - Software or Data Integrity Failures',
    'A09:2025 - Security Logging and Alerting Failures',
    'A10:2025 - Mishandling of Exceptional Conditions',
] as const;

interface SimpleModeMessageInput {
    readonly promptMarker?: string;
    readonly scenarioIntent: string;
    readonly scenarioTitle: string;
    readonly target: string;
}

export function buildOwaspTopTen2025ReportGuidance(): readonly string[] {
    return [
        '보고서 분류: 발견 항목마다 OWASP Top 10:2025 기준으로 분류합니다.',
        `OWASP Top 10:2025 기준: ${owaspTopTen2025Categories.join('; ')}`,
        '보고서 구성: "쉬운 요약", "발견 항목 요약", "위험도별 발견 항목", "주요 발견 사항", "조치 우선순위" 순서로 간단히 정리합니다.',
        '제목 규칙: clean Markdown heading hierarchy를 유지하고 제목에는 상태 이모지, 체크 표시, raw task or subtask IDs를 넣지 않습니다.',
        '쉬운 요약: 먼저 각 취약점의 위험, 영향, 우선 조치를 비전문가도 이해할 수 있게 짧게 정리합니다.',
        '발견 항목 요약: "위험도 | OWASP Top 10:2025 유형 | 취약점" 표를 사용해 상세 설명 전에 먼저 정리합니다.',
        '위험도별 발견 항목: "위험도 | 개수 | 항목" 표로 HIGH, MEDIUM, LOW, INFO 순서에 맞춰 묶어 정리합니다.',
        '주요 발견 사항: 각 항목마다 위험도, OWASP Top 10:2025 분류, 쉬운 설명, 근거, 영향, 조치 방법을 포함합니다.',
        '발견 없음: 확인된 취약점이 없으면 "확인된 취약점 없음"으로 적고, 점검 범위와 한계를 짧게 설명합니다.',
        '분류가 애매한 항목은 가장 가까운 항목을 선택하고, 근거가 부족하면 "해당 없음/추가 확인 필요"로 표시합니다.',
    ];
}

export function buildSimpleModeMessage({
    promptMarker,
    scenarioIntent,
    scenarioTitle,
    target,
}: SimpleModeMessageInput): string {
    return [
        ...(promptMarker ? [promptMarker] : []),
        `승인된 보안 점검 대상: ${target}`,
        `점검 시나리오: ${scenarioTitle}`,
        `점검 목적: ${scenarioIntent}`,
        ...(promptMarker
            ? [
                  '빠른 점검 제한: 병렬 가능한 확인은 한 번에 묶어 실행하고, 긴 정밀 스캔/무차별 대입/권한 범위 밖 탐색은 수행하지 않습니다.',
                  '도구 실행 기준: 단일 terminal 명령은 120초 안에 끝나도록 timeout을 함께 사용하고, 외부 검색/API 호출이 지연되면 "추가 확인 필요"로 표시합니다.',
              ]
            : []),
        '안전 범위: 사용자가 선언한 대상만 점검하고, 승인 범위 밖으로 이동하거나 확장하지 않습니다.',
        '결과 형식: 발견 내용을 쉬운 말로 설명하고, 근거와 구체적인 조치 방법을 함께 제안합니다.',
        ...buildOwaspTopTen2025ReportGuidance(),
    ].join('\n');
}
