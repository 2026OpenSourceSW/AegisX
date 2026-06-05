import { describe, expect, it } from 'vitest';

import { createPdfNodeKey, splitTextForPdfFonts } from './report-pdf';

describe('report PDF font segmentation', () => {
    it('routes Hangul text to the CJK PDF font so Korean report exports keep readable glyphs', () => {
        const segments = splitTextForPdfFonts('AegisX 점검 보고서');

        expect(segments).toContainEqual({ isCJK: true, text: '점검 보고서' });
        expect(segments).toContainEqual({ isCJK: false, text: 'AegisX ' });
    });

    it('keeps repeated PDF node keys unique', () => {
        const occurrences = new Map<string, number>();

        expect(createPdfNodeKey('paragraph-repeat', occurrences)).toBe('paragraph-repeat-1');
        expect(createPdfNodeKey('paragraph-repeat', occurrences)).toBe('paragraph-repeat-2');
    });
});
