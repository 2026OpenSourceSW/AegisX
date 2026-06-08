import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string): string => readFileSync(join(process.cwd(), 'src', path), 'utf8');

describe('Korean supporting page UI copy', () => {
    it('localizes the report templates list and new-template form copy', () => {
        const templatesList = readSource('pages/templates/templates.tsx');
        const templateDetail = readSource('pages/templates/template.tsx');
        const routeTitles = readSource('lib/route-titles/index.ts');

        expect(templatesList).toContain('보고서 템플릿');
        expect(templatesList).toContain('아직 보고서 템플릿이 없습니다');
        expect(templatesList).toContain('새 템플릿');
        expect(templatesList).not.toMatch(/Templaetes|No templates yet|New Template/);

        expect(templateDetail).toContain('새 보고서 템플릿 만들기');
        expect(templateDetail).toContain('제목과 내용을 입력하거나');
        expect(templateDetail).toContain('미리 준비된 템플릿');
        expect(templateDetail).not.toMatch(/New template|Create a new template|Preset template/);

        expect(routeTitles).toContain("templateId === 'new' ? '새 보고서 템플릿'");
        expect(routeTitles).toContain("templates: { title: '보고서 템플릿' }");
        expect(routeTitles).not.toMatch(/New template|Templates/);
    });

    it('keeps the resources upload guidance readable in Korean', () => {
        const resourcesPage = readSource('pages/resources/resources.tsx');
        const dropZone = readSource('components/ui/file-drop-zone.tsx');

        expect(resourcesPage).toContain('AegisX 에이전트가 점검 중 참고할 문서를 업로드하세요.');
        expect(resourcesPage).toContain('이 패널 어디로든 파일을 끌어다 놓을 수 있습니다.');
        expect(resourcesPage).not.toContain(
            'AegisX 에이전트가 점검 중 참고할 문서를 업로드하세요. 이 패널 어디로든 파일을 끌어다 놓을 수 있습니다.',
        );
        expect(dropZone).toContain('whitespace-pre-line');
    });

    it('localizes knowledge menu copy and explains its purpose', () => {
        const knowledgesList = readSource('pages/knowledges/knowledges.tsx');
        const knowledgeHeader = readSource('features/knowledges/knowledge-header.tsx');
        const knowledgeControls = readSource('features/knowledges/knowledge-form-controls.tsx');
        const knowledgeLayout = readSource('features/knowledges/knowledge-form-layout.tsx');
        const routeTitles = readSource('lib/route-titles/index.ts');

        expect(knowledgesList).toContain('지식');
        expect(knowledgesList).toContain(
            'AegisX 에이전트가 점검 중 다시 참고할 수 있는 질문, 답변, 가이드, 코드 지식을 관리합니다.',
        );
        expect(knowledgesList).toContain('아직 지식 문서가 없습니다');
        expect(knowledgesList).not.toMatch(/>Knowledges<|No knowledge documents yet|New Knowledge/);

        expect(knowledgeHeader).toContain('새 지식 문서');
        expect(knowledgeHeader).not.toMatch(/New knowledge|>Knowledges<|Knowledge actions/);
        expect(knowledgeControls).toContain('지식 내용');
        expect(knowledgeControls).not.toContain('Knowledge content (will be embedded into the vector store)');
        expect(knowledgeLayout).toContain('새 지식 문서 만들기');
        expect(knowledgeLayout).not.toContain('Create a new knowledge document');

        expect(routeTitles).toContain("knowledgeId === 'new' ? '새 지식 문서'");
        expect(routeTitles).toContain("knowledges: { title: '지식' }");
        expect(routeTitles).not.toMatch(/New knowledge|Knowledges/);
    });

    it('localizes the visible settings navigation and first-level page copy', () => {
        const settingsLayout = readSource('components/layouts/settings-layout.tsx');
        const providers = readSource('pages/settings/settings-providers.tsx');
        const prompts = readSource('pages/settings/settings-prompts.tsx');
        const apiTokens = readSource('pages/settings/settings-api-tokens.tsx');

        expect(settingsLayout).toContain('설정');
        expect(settingsLayout).toContain('Provider');
        expect(settingsLayout).toContain('프롬프트');
        expect(settingsLayout).toContain('API 토큰');
        expect(settingsLayout).not.toMatch(/Back to App|Create Provider|Edit Provider|Create Prompt|Edit Prompt/);

        expect(providers).toContain('언어 모델 Provider를 관리합니다');
        expect(providers).toContain('Provider 만들기');
        expect(prompts).toContain('시스템 및 사용자 지정 프롬프트 템플릿을 관리합니다');
        expect(apiTokens).toContain('프로그램 방식 접근에 사용할 API 토큰을 관리합니다');
        expect(apiTokens).toContain('토큰 만들기');
    });

    it('localizes settings table actions, dialogs, and editor controls', () => {
        const providers = readSource('pages/settings/settings-providers.tsx');
        const providerDetail = readSource('pages/settings/settings-provider.tsx');
        const prompts = readSource('pages/settings/settings-prompts.tsx');
        const promptDetail = readSource('pages/settings/settings-prompt.tsx');
        const apiTokens = readSource('pages/settings/settings-api-tokens.tsx');

        expect(providers).toContain('이름');
        expect(providers).toContain('유형');
        expect(providers).toContain('생성일');
        expect(providers).toContain('수정일');
        expect(providers).toContain('작업 메뉴 열기');
        expect(providers).not.toMatch(
            /title="Name"|title="Type"|title="Created"|title="Updated"|aria-label="Open menu"/,
        );

        expect(providerDetail).toContain('검색어와 일치하는 항목이 없습니다.');
        expect(providerDetail).toContain('사용자 지정 값으로 사용');
        expect(providerDetail).toContain('유효성 검사 오류를 수정하세요');
        expect(providerDetail).toContain('새 언어 모델 Provider를 설정합니다');
        expect(providerDetail).toContain('에이전트 설정');
        expect(providerDetail).toContain('Provider 테스트 결과');
        expect(providerDetail).toContain('추론 설정');
        expect(providerDetail).toContain('가격 설정');
        expect(providerDetail).toContain('취소');
        expect(providerDetail).toContain('삭제');
        expect(providerDetail).not.toMatch(
            /Search \$\{label.toLowerCase\(\)\}|No \{label.toLowerCase\(\)\} found|Use "\{search\}" as custom|Please fix the following validation errors|'Cancel'|>Cancel<|'Deleting\.\.\.'|>Deleting\.\.\.<|'Testing\.\.\.'|>Testing\.\.\.<|'Stay'|New Provider|Provider Settings|Configure a new language model provider|Update provider settings and configuration|Agent Configurations|Configure settings for each agent type|Provider Test Results|Reasoning Configuration|Price Configuration|Price per 1M|Model is required|Provider name is required|Provider type is required/,
        );

        expect(prompts).toContain('에이전트 프롬프트');
        expect(prompts).toContain('에이전트 이름');
        expect(prompts).toContain('프롬프트 템플릿');
        expect(prompts).toContain('도구 프롬프트');
        expect(prompts).toContain('시스템 도구와 유틸리티용 프롬프트 템플릿');
        expect(prompts).toContain('프롬프트를 기본 템플릿으로 되돌릴까요?');
        expect(prompts).not.toMatch(
            /Agent Name|Tool Name|System Prompt|Human Prompt|Prompt Templates|>Template<|Loading prompts|Error loading prompts|Prompt templates could not be loaded|No prompts available|Agent Prompts|System and human prompts for AI agents|Filter agents|>Tool Prompts<|Prompt templates for system tools and utilities|Filter tools|cancelText="Cancel"|confirmText="Reset"/,
        );

        expect(promptDetail).toContain('초기화 중...');
        expect(promptDetail).toContain('유효성 검사');
        expect(promptDetail).toContain('변경사항 저장');
        expect(promptDetail).toContain('프롬프트 데이터를 불러오지 못했습니다');
        expect(promptDetail).toContain('프롬프트를 찾을 수 없습니다');
        expect(promptDetail).toContain('이 프롬프트를 기본값으로 초기화할까요?');
        expect(promptDetail).not.toMatch(
            /Resetting\.\.\.|>Validate<|Save Changes|Reset Prompt|system prompt|human prompt|Error loading prompt data|Prompt not found|Please wait while we fetch prompt information|Loading prompt data|could not be found or is not supported for editing|cancelText="Cancel"|>Cancel</,
        );

        expect(apiTokens).toContain('토큰 이름은 255자 이하여야 합니다');
        expect(apiTokens).toContain('만료일이 필요합니다');
        expect(apiTokens).toContain('활성');
        expect(apiTokens).toContain('폐기됨');
        expect(apiTokens).toContain('토큰 ID 복사');
        expect(apiTokens).toContain('API 토큰이 생성되었습니다');
        expect(apiTokens).not.toMatch(
            /Token name must be 255 characters or less|Expiration date is required|>active<|>revoked<|>expired<|Pick date|Copy Token|>Close<|API Token Created|Copy this token now|Please wait while we fetch your API tokens|Loading tokens|Error loading tokens|aria-label="Submit"|aria-label="Cancel"|aria-label="Open menu"|>Edit</,
        );
    });

    it('localizes high-traffic auth, flow form, and report states', () => {
        const flowForm = readSource('features/flows/flow-form.tsx');
        const loginForm = readSource('features/authentication/login-form.tsx');
        const passwordChangeForm = readSource('features/authentication/password-change-form.tsx');
        const flowReport = readSource('pages/flows/flow-report.tsx');

        expect(flowForm).toContain("aria-label={isCanceling ? '취소 중...' : '취소'}");
        expect(flowForm).not.toMatch(/aria-label=\{isCanceling \? 'Cancelling…' : 'Cancel'\}/);

        expect(loginForm).toContain("name: 'Google로 계속'");
        expect(loginForm).toContain("name: 'GitHub로 계속'");
        expect(loginForm).not.toMatch(/Continue with Google|Continue with GitHub|text-\[#1A2B4B\]/);

        expect(passwordChangeForm).toContain('현재 비밀번호');
        expect(passwordChangeForm).toContain('새 비밀번호 확인');
        expect(passwordChangeForm).toContain('나중에 변경');
        expect(passwordChangeForm).toContain('비밀번호 변경');
        expect(passwordChangeForm).not.toMatch(
            /Current Password|New Password|Confirm New Password|Skip for now|Update Password|Password successfully changed/,
        );

        expect(flowReport).toContain("state === 'loading' ? '보고서 준비 중' : 'PDF 생성 중'");
        expect(flowReport).toContain("state === 'loading' ? '보고서' : 'PDF 내보내기'");
        expect(flowReport).toContain('보고서 데이터를 불러오지 못했습니다');
        expect(flowReport).toContain('보고서 불러오기 오류');
        expect(flowReport).toContain('닫기');
        expect(flowReport).not.toMatch(
            /Loading report|Generating PDF|Report error|Error loading report|Failed to load flow data|Failed to generate PDF|Close|Flow security report|AegisX report/,
        );
    });
});
