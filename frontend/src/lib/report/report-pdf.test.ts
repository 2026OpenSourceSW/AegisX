import { describe, expect, it } from 'vitest';

import { createPdfNodeKey, getPdfFontFamilyForTextRun, splitTextForPdfFonts } from './report-pdf';

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
});
