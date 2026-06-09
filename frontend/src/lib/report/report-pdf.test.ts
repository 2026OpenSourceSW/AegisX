import { describe, expect, it } from 'vitest';

import {
    createPdfNodeKey,
    generatePDFBlobNew,
    getPdfFontFamilyForTextRun,
    getPdfVectorFontFamilyForCharacter,
    parseMarkdownTokens,
    splitTextForPdfFonts,
} from './report-pdf';
import {
    ensurePdfVectorFontsLoaded,
    layoutPdfVectorTextLine,
    measurePdfVectorTextRuns,
    type PdfVectorTextRun,
} from './report-pdf-vector-text';

const readBlobAsLatin1 = async (blob: Blob): Promise<string> => {
    return Buffer.from(await blob.arrayBuffer()).toString('latin1');
};

describe('report PDF font segmentation', () => {
    it('keeps mixed Korean and Latin report lines in one PDF text run', () => {
        const segments = splitTextForPdfFonts('AegisX 점검 보고서 https://hackerlogin.com/ 기본 점검 완료');

        expect(segments).toEqual([
            {
                isCJK: true,
                text: 'AegisX 점검 보고서 https://hackerlogin.com/ 기본 점검 완료',
            },
        ]);
    });

    it('keeps repeated PDF node keys unique', () => {
        const occurrences = new Map<string, number>();

        expect(createPdfNodeKey('paragraph-repeat', occurrences)).toBe('paragraph-repeat-1');
        expect(createPdfNodeKey('paragraph-repeat', occurrences)).toBe('paragraph-repeat-2');
    });

    it('routes Korean report text to a Hangul-capable PDF font', () => {
        expect(getPdfFontFamilyForTextRun('웹 보안 점검 설명', 'NotoSans', 'NotoSans')).toBe('AegisXReportKR');
        expect(getPdfFontFamilyForTextRun('中文 安全报告', 'NotoSans', 'NotoSans')).toBe('NotoSansSC');
        expect(getPdfFontFamilyForTextRun('AegisX report', 'NotoSans', 'NotoSans')).toBe('NotoSans');
    });

    it('routes vector text to a glyph-capable font family for each script', () => {
        expect(getPdfVectorFontFamilyForCharacter('한')).toBe('korean');
        expect(getPdfVectorFontFamilyForCharacter('中')).toBe('cjk');
        expect(getPdfVectorFontFamilyForCharacter('A', true)).toBe('mono');
    });

    it('uses each font scale when laying out mixed Korean and mono vector text', async () => {
        await ensurePdfVectorFontsLoaded();
        const runs: readonly PdfVectorTextRun[] = [
            { color: '#111827', family: 'korean', text: '한' },
            { color: '#111827', family: 'mono', text: 'A' },
        ];
        const expectedWidth = measurePdfVectorTextRuns(runs, 10);
        const layout = layoutPdfVectorTextLine(runs, 'mixed', {
            fontSize: 10,
            keyPrefix: 'test',
            maxWidth: 200,
        });

        expect(layout.width).toBeCloseTo(expectedWidth, 4);
        expect(layout.paths[0]?.transform).toContain('scale(0.0049 -0.0049)');
        expect(layout.paths[1]?.transform).toContain('scale(0.01 -0.01)');
    });

    it('renders Korean bold text to a Hangul-capable PDF font', async () => {
        const blob = await generatePDFBlobNew('**한글 굵게 표시**');

        expect(blob.size).toBeGreaterThan(0);
    });

    it('renders Korean italic text without missing font variant errors', async () => {
        const blob = await generatePDFBlobNew('*한글 기울임 표시*');

        expect(blob.size).toBeGreaterThan(0);
    });

    it('renders Korean inline code and fenced code without broken glyphs or PDF generation errors', async () => {
        const blob = await generatePDFBlobNew('`한글명령 --옵션`\n\n```bash\n한글명령 --옵션\n```');

        expect(blob.size).toBeGreaterThan(0);
    });

    it('renders non-Hangul CJK text without embedding broken TrueType subsets', async () => {
        const blob = await generatePDFBlobNew('中文 安全报告');
        const pdfBody = await readBlobAsLatin1(blob);

        expect(blob.size).toBeGreaterThan(0);
        expect(pdfBody).not.toContain('/FontFile2');
    });

    it('renders Korean styled text without embedding broken TrueType subsets', async () => {
        const blob = await generatePDFBlobNew(`# AegisX 한글 PDF 점검

한글 **굵게 표시** 와 한글 *기울임 표시*를 확인합니다.

\`\`\`bash
한글명령 --옵션
curl -I https://example.local
\`\`\`
`);
        const pdfBody = await readBlobAsLatin1(blob);

        expect(pdfBody).not.toContain('/FontFile2');
    });

    it('parses markdown tables for PDF rendering instead of dropping report summaries', async () => {
        const parsed = parseMarkdownTokens(`| 위험도 | OWASP Top 10:2025 유형 | 취약점 |
| --- | --- | --- |
| 🔴 HIGH | A02:2025 - Security Misconfiguration | Wildcard CORS(ACAO: *) |
| 🟡 MEDIUM | A02:2025 - Security Misconfiguration | HSTS 누락 |`);

        expect(parsed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rows: expect.arrayContaining([
                        expect.arrayContaining([
                            expect.objectContaining({
                                inlineTokens: expect.arrayContaining([
                                    expect.objectContaining({ text: '[HIGH] HIGH' }),
                                ]),
                            }),
                        ]),
                    ]),
                    type: 'table',
                }),
            ]),
        );

        const blob = await generatePDFBlobNew(`# 핵심 발견 요약

| 위험도 | OWASP Top 10:2025 유형 | 취약점 |
| --- | --- | --- |
| 🔴 HIGH | A02:2025 - Security Misconfiguration | Wildcard CORS(ACAO: *) |`);

        expect(blob.size).toBeGreaterThan(0);
    });
});
