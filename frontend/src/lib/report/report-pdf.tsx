import { Document, Font, Page, pdf, StyleSheet, Text, View } from '@react-pdf/renderer';
import { marked } from 'marked';

import { Log } from '@/lib/log';

import {
    ensurePdfVectorFontsLoaded,
    getPublicFontSource,
    type PdfVectorTextRun,
    renderPdfVectorTextRuns,
    type VectorFontFamily,
} from './report-pdf-vector-text';

// Register Noto Sans (covers Latin + Cyrillic + Greek + many other scripts)
Font.register({
    family: 'NotoSans',
    fonts: [
        { fontStyle: 'normal', fontWeight: 'normal', src: getPublicFontSource('NotoSans-Regular.ttf') },
        { fontStyle: 'normal', fontWeight: 'bold', src: getPublicFontSource('NotoSans-Bold.ttf') },
        { fontStyle: 'italic', fontWeight: 'normal', src: getPublicFontSource('NotoSans-Italic.ttf') },
        { fontStyle: 'italic', fontWeight: 'bold', src: getPublicFontSource('NotoSans-BoldItalic.ttf') },
    ],
});

// Register Noto Sans Mono (covers Latin + Cyrillic for code blocks)
Font.register({
    family: 'NotoSansMono',
    fonts: [
        { fontStyle: 'normal', fontWeight: 'normal', src: getPublicFontSource('NotoSansMono-Regular.ttf') },
        { fontStyle: 'normal', fontWeight: 'bold', src: getPublicFontSource('NotoSansMono-Bold.ttf') },
    ],
});

Font.register({
    family: 'NotoSansSC',
    fonts: [
        { fontStyle: 'normal', fontWeight: 'normal', src: getPublicFontSource('NotoSansSC-Regular.otf') },
        { fontStyle: 'normal', fontWeight: 'bold', src: getPublicFontSource('NotoSansSC-Bold.otf') },
    ],
});

Font.register({
    family: 'AegisXReportKR',
    fonts: [
        { fontStyle: 'normal', fontWeight: 'normal', src: getPublicFontSource('AegisXReportKR-Regular.ttf') },
        { fontStyle: 'normal', fontWeight: 'bold', src: getPublicFontSource('AegisXReportKR-Bold.ttf') },
    ],
});

// Disable word hyphenation (breaks CJK and Cyrillic incorrectly)
Font.registerHyphenationCallback((word) => [word]);

const HANGUL_RE = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/u;
const CJK_RE =
    /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF\u3040-\u30FF\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3000-\u303F\uFF01-\uFF60\uFFE0-\uFFE6]/u;

const hasCJKText = (text: string): boolean => CJK_RE.test(text);
const PDF_CONTENT_WIDTH = 515;
const PDF_CODE_BLOCK_WIDTH = 495;
const PDF_LIST_CONTENT_WIDTH = 455;

const hasCJKInlineTokens = (tokens: readonly InlineToken[]): boolean => {
    return tokens.some((token) => hasCJKText(token.text));
};

export const getPdfVectorFontFamilyForCharacter = (character: string, preferMono = false): VectorFontFamily => {
    if (preferMono && !hasCJKText(character)) {
        return 'mono';
    }

    if (HANGUL_RE.test(character)) {
        return 'korean';
    }

    if (CJK_RE.test(character)) {
        return 'cjk';
    }

    return preferMono ? 'mono' : 'korean';
};

const appendVectorRun = (runs: PdfVectorTextRun[], run: PdfVectorTextRun): PdfVectorTextRun[] => {
    const previous = runs.at(-1);

    if (previous && previous.bold === run.bold && previous.color === run.color && previous.family === run.family) {
        return [...runs.slice(0, -1), { ...previous, text: `${previous.text}${run.text}` }];
    }

    return [...runs, run];
};

const textToVectorRuns = (text: string, color: string, bold: boolean, preferMono = false): PdfVectorTextRun[] => {
    return Array.from(text).reduce<PdfVectorTextRun[]>((runs, character) => {
        return appendVectorRun(runs, {
            bold,
            color,
            family: getPdfVectorFontFamilyForCharacter(character, preferMono),
            text: character,
        });
    }, []);
};

const inlineTokensToVectorRuns = (
    tokens: readonly InlineToken[],
    defaultColor: string,
    defaultBold = false,
): PdfVectorTextRun[] => {
    return tokens.flatMap((token) =>
        textToVectorRuns(
            token.text,
            token.code ? '#dc2626' : token.link ? '#2563eb' : defaultColor,
            defaultBold || !!token.bold || !!token.code,
            !!token.code,
        ),
    );
};

const renderInlineTokensAsVectorText = (
    tokens: readonly InlineToken[],
    keyPrefix: string,
    fontSize: number,
    defaultColor: string,
    maxWidth = PDF_CONTENT_WIDTH,
    lineHeight = 1.5,
    defaultBold = false,
) => {
    return renderPdfVectorTextRuns(inlineTokensToVectorRuns(tokens, defaultColor, defaultBold), {
        fontSize,
        keyPrefix,
        lineHeight,
        maxWidth,
    });
};

interface TextSegment {
    isCJK: boolean;
    text: string;
}

export const splitTextForPdfFonts = (text: string): TextSegment[] => {
    return [{ isCJK: CJK_RE.test(text), text }];
};

export const getPdfFontFamilyForTextRun = (
    text: string,
    baseFamily: string,
    boldFamily: string,
    bold = false,
): string => {
    if (HANGUL_RE.test(text)) {
        return 'AegisXReportKR';
    }

    if (CJK_RE.test(text)) {
        return 'NotoSansSC';
    }

    return bold ? boldFamily : baseFamily;
};

export const createPdfNodeKey = (base: string, occurrences: Map<string, number>): string => {
    const occurrence = (occurrences.get(base) ?? 0) + 1;

    occurrences.set(base, occurrence);

    return `${base}-${occurrence}`;
};

const pdfStyles = StyleSheet.create({
    bold: {
        fontWeight: 'bold',
    },
    code: {
        color: '#dc2626',
        fontFamily: 'NotoSansMono',
        fontSize: 9,
        fontWeight: 'bold',
    },
    codeBlock: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderRadius: 4,
        borderWidth: 1,
        color: '#e2e8f0',
        fontFamily: 'NotoSansMono',
        fontSize: 8.5,
        lineHeight: 1.4,
        marginBottom: 8,
        marginTop: 4,
        padding: 8,
    },
    h1: {
        color: '#0f172a',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 0,
    },
    h2: {
        borderBottomColor: '#e2e8f0',
        borderBottomWidth: 1,
        color: '#1e293b',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 12,
        paddingBottom: 4,
    },
    h3: {
        color: '#334155',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 6,
        marginTop: 10,
    },
    h4: {
        color: '#475569',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        marginTop: 8,
    },
    h5: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 4,
        marginTop: 6,
    },
    h6: {
        color: '#94a3b8',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
        marginTop: 6,
    },
    hr: {
        borderBottomColor: '#cbd5e1',
        borderBottomWidth: 1,
        marginBottom: 12,
        marginTop: 12,
    },
    italic: {
        fontStyle: 'italic',
    },
    link: {
        color: '#2563eb',
        fontWeight: 'semibold',
        textDecoration: 'underline',
    },
    list: {
        marginBottom: 8,
        marginLeft: 0,
        marginTop: 6,
    },
    listBullet: {
        color: '#64748b',
        fontSize: 9,
        marginRight: 8,
        minWidth: 20,
    },
    listContent: {
        color: '#334155',
        flex: 1,
        fontSize: 10,
        lineHeight: 1.5,
    },
    listItem: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        marginBottom: 4,
        marginLeft: 16,
    },
    page: {
        backgroundColor: '#ffffff',
        color: '#334155',
        fontFamily: 'NotoSans',
        fontSize: 10,
        lineHeight: 1.5,
        padding: 40,
    },
    paragraph: {
        color: '#475569',
        lineHeight: 1.6,
        marginBottom: 8,
        textAlign: 'left',
    },
    table: {
        borderColor: '#cbd5e1',
        borderLeftWidth: 1,
        borderTopWidth: 1,
        marginBottom: 10,
        marginTop: 6,
        width: '100%',
    },
    tableCell: {
        borderBottomWidth: 1,
        borderColor: '#cbd5e1',
        borderRightWidth: 1,
        flex: 1,
        paddingBottom: 5,
        paddingHorizontal: 6,
        paddingTop: 5,
    },
    tableCellText: {
        color: '#334155',
        fontSize: 8.5,
        lineHeight: 1.35,
    },
    tableHeaderCell: {
        backgroundColor: '#f1f5f9',
        borderBottomWidth: 1,
        borderColor: '#cbd5e1',
        borderRightWidth: 1,
        flex: 1,
        paddingBottom: 5,
        paddingHorizontal: 6,
        paddingTop: 5,
    },
    tableHeaderText: {
        color: '#0f172a',
        fontSize: 8.5,
        fontWeight: 'bold',
        lineHeight: 1.35,
    },
    tableRow: {
        alignItems: 'stretch',
        flexDirection: 'row',
        width: '100%',
    },
});

// @react-pdf/renderer has spotty emoji glyph support — substitute readable text tags instead.
const emojiMap: Record<string, string> = {
    '⏳': '[WAIT]',
    '⚠️': '[WARN]',
    '⚡': '[RUN]',
    '✅': '[OK]',
    '✨': '[NEW]',
    '❌': '[FAIL]',
    '🎯': '[TARGET]',
    '🐛': '[BUG]',
    '💡': '[IDEA]',
    '📊': '[DATA]',
    '📝': '[NOTE]',
    '🔍': '[SEARCH]',
    '🔐': '[SEC]',
    '🔧': '[TOOL]',
    '🔴': '[HIGH]',
    '🚀': '[START]',
    '🟡': '[MEDIUM]',
    '🟢': '[LOW]',
    ℹ️: '[INFO]',
    ℹ: '[INFO]',
};

const replaceEmojis = (text: string): string => {
    let result = text;

    for (const [emoji, replacement] of Object.entries(emojiMap)) {
        result = result.replaceAll(emoji, replacement);
    }

    return result;
};

interface InlineToken {
    bold?: boolean;
    code?: boolean;
    italic?: boolean;
    link?: string;
    text: string;
    type: 'text';
}

interface ParsedContent {
    align?: Array<'center' | 'left' | 'right' | null>;
    content?: string;
    header?: ParsedTableCell[];
    inlineTokens?: InlineToken[];
    items?: Array<{ inlineTokens: InlineToken[]; raw: string }>;
    level?: number;
    ordered?: boolean;
    rows?: ParsedTableCell[][];
    type: string;
}

interface ParsedTableCell {
    inlineTokens: InlineToken[];
    raw: string;
}

const parseInlineTokens = (text: string): InlineToken[] => {
    const tokens: InlineToken[] = [];
    const inlineTokens = marked.lexer(text, { breaks: false });

    const firstToken = inlineTokens[0];

    if (firstToken && firstToken.type === 'paragraph' && 'tokens' in firstToken) {
        const paragraphTokens =
            (firstToken as { tokens?: unknown[] }).tokens?.filter((t): t is Record<string, unknown> => {
                return typeof t === 'object' && t !== null;
            }) || [];

        paragraphTokens.forEach((token) => {
            switch (token.type) {
                case 'codespan': {
                    tokens.push({
                        code: true,
                        text: replaceEmojis(String(token.text || '')),
                        type: 'text',
                    });
                    break;
                }

                case 'em': {
                    tokens.push({
                        italic: true,
                        text: replaceEmojis(String(token.text || '')),
                        type: 'text',
                    });
                    break;
                }

                case 'link': {
                    tokens.push({
                        link: String(token.href || ''),
                        text: replaceEmojis(String(token.text || '')),
                        type: 'text',
                    });
                    break;
                }

                case 'strong': {
                    tokens.push({
                        bold: true,
                        text: replaceEmojis(String(token.text || '')),
                        type: 'text',
                    });
                    break;
                }

                case 'text': {
                    tokens.push({
                        text: replaceEmojis(String(token.text || '')),
                        type: 'text',
                    });
                    break;
                }

                default: {
                    if ('text' in token) {
                        tokens.push({
                            text: replaceEmojis(String(token.text || '')),
                            type: 'text',
                        });
                    }
                }
            }
        });
    } else {
        tokens.push({
            text: replaceEmojis(text),
            type: 'text',
        });
    }

    return tokens;
};

const parseTableCell = (cell: unknown): ParsedTableCell => {
    const text =
        typeof cell === 'object' && cell !== null && 'text' in cell
            ? String((cell as { readonly text?: unknown }).text || '')
            : String(cell || '');

    return {
        inlineTokens: parseInlineTokens(text),
        raw: text,
    };
};

export const parseMarkdownTokens = (markdown: string): ParsedContent[] => {
    const tokens = marked.lexer(markdown);
    const result: ParsedContent[] = [];

    const processToken = (token: Record<string, unknown>): void => {
        switch (token.type) {
            case 'code': {
                result.push({
                    content: replaceEmojis(String(token.text || '')),
                    type: 'code',
                });
                break;
            }

            case 'heading': {
                result.push({
                    inlineTokens: parseInlineTokens(String(token.text || '')),
                    level: Number(token.depth || 1),
                    type: 'heading',
                });
                break;
            }

            case 'hr': {
                result.push({ type: 'hr' });
                break;
            }

            case 'list': {
                const tokenItems = (Array.isArray(token.items) ? token.items : []) as Array<Record<string, unknown>>;
                const items = tokenItems.map((item) => ({
                    inlineTokens: parseInlineTokens(String(item.text || '')),
                    raw: String(item.text || ''),
                }));
                result.push({
                    items,
                    ordered: Boolean(token.ordered),
                    type: 'list',
                });
                break;
            }

            case 'paragraph': {
                result.push({
                    inlineTokens: parseInlineTokens(String(token.text || '')),
                    type: 'paragraph',
                });
                break;
            }

            case 'space': {
                break;
            }

            case 'table': {
                const header = (Array.isArray(token.header) ? token.header : []).map(parseTableCell);
                const rows = (Array.isArray(token.rows) ? token.rows : [])
                    .map((row) => (Array.isArray(row) ? row.map(parseTableCell) : []))
                    .filter((row) => row.length > 0);
                const align = (Array.isArray(token.align) ? token.align : []).map((value) => {
                    return value === 'center' || value === 'left' || value === 'right' ? value : null;
                });

                if (header.length > 0 || rows.length > 0) {
                    result.push({
                        align,
                        header,
                        rows,
                        type: 'table',
                    });
                }

                break;
            }

            default: {
                if ('text' in token && typeof token.text === 'string') {
                    result.push({
                        inlineTokens: parseInlineTokens(token.text),
                        type: 'paragraph',
                    });
                }
            }
        }
    };

    tokens.forEach((token) => {
        processToken(token as Record<string, unknown>);
    });

    return result;
};

const renderTextWithCJK = (
    text: string,
    baseFamily: string,
    boldFamily: string,
    keyPrefix: string,
    bold = false,
    italic = false,
) => {
    const segments = splitTextForPdfFonts(text);

    if (segments.length === 1 && !segments[0]?.isCJK) {
        return text;
    }

    const segmentOccurrences = new Map<string, number>();

    return segments.map((seg) => {
        const segmentKey = createPdfNodeKey(
            `${keyPrefix}-cjk-${seg.isCJK ? 'cjk' : 'base'}-${seg.text}`,
            segmentOccurrences,
        );
        const family = getPdfFontFamilyForTextRun(seg.text, baseFamily, boldFamily, bold);
        const style: Record<string, string> = { fontFamily: family };

        if (bold) {
            style.fontWeight = 'bold';
        }

        if (italic && !seg.isCJK) {
            style.fontStyle = 'italic';
        }

        return (
            <Text
                key={segmentKey}
                style={style}
            >
                {seg.text}
            </Text>
        );
    });
};

const renderInlineTokens = (tokens: InlineToken[], keyPrefix: string) => {
    const tokenOccurrences = new Map<string, number>();

    return tokens.map((token) => {
        const textContent = token.text;
        const tokenKey = createPdfNodeKey(
            `${keyPrefix}-inline-${token.type}-${token.text}-${token.bold ? 'bold' : 'regular'}-${token.italic ? 'italic' : 'upright'}-${token.code ? 'code' : 'text'}-${token.link ?? 'plain'}`,
            tokenOccurrences,
        );

        const appliedStyles = [];

        if (token.code) {
            appliedStyles.push(pdfStyles.code);
        }

        if (token.bold) {
            appliedStyles.push(pdfStyles.bold);
        }

        if (token.italic && !hasCJKText(textContent)) {
            appliedStyles.push(pdfStyles.italic);
        }

        if (token.link) {
            appliedStyles.push(pdfStyles.link);
        }

        if (appliedStyles.length > 0) {
            const isBold = !!token.bold;
            const isItalic = !!token.italic;
            const isCode = !!token.code;
            const rendered = isCode
                ? renderTextWithCJK(textContent, 'NotoSansMono', 'NotoSansMono', tokenKey, true)
                : renderTextWithCJK(textContent, 'NotoSans', 'NotoSans', tokenKey, isBold, isItalic);

            return (
                <Text
                    key={tokenKey}
                    style={appliedStyles}
                >
                    {rendered}
                </Text>
            );
        }

        const rendered = renderTextWithCJK(textContent, 'NotoSans', 'NotoSans', tokenKey);

        if (typeof rendered === 'string') {
            return rendered;
        }

        return <Text key={tokenKey}>{rendered}</Text>;
    });
};

const getContentKey = (item: ParsedContent, fallback: string): string => {
    if (item.content) {
        return `${item.type}-${item.content}`;
    }

    if (item.inlineTokens && item.inlineTokens.length > 0) {
        return `${item.type}-${item.inlineTokens.map((token) => token.text).join('-')}`;
    }

    if (item.items && item.items.length > 0) {
        return `${item.type}-${item.items.map((listItem) => listItem.raw).join('-')}`;
    }

    if ((item.header && item.header.length > 0) || (item.rows && item.rows.length > 0)) {
        return `${item.type}-${item.header?.map((cell) => cell.raw).join('-') ?? ''}-${item.rows?.map((row) => row.map((cell) => cell.raw).join('-')).join('-') ?? ''}`;
    }

    return fallback;
};

const emptyTableCell: ParsedTableCell = {
    inlineTokens: [{ text: ' ', type: 'text' }],
    raw: '',
};

const getTableColumnCount = (item: ParsedContent): number => {
    return Math.max(item.header?.length ?? 0, ...(item.rows ?? []).map((row) => row.length), 1);
};

const normalizeTableRow = (row: readonly ParsedTableCell[], columnCount: number): ParsedTableCell[] => {
    return Array.from({ length: columnCount }, (_, index) => row[index] ?? emptyTableCell);
};

const renderTableCell = (
    cell: ParsedTableCell,
    contentKey: string,
    columnCount: number,
    isHeader: boolean,
    align: 'center' | 'left' | 'right' | null,
) => {
    const maxWidth = Math.max(42, PDF_CONTENT_WIDTH / columnCount - 14);
    const color = isHeader ? '#0f172a' : '#334155';
    const cellStyle = isHeader ? pdfStyles.tableHeaderCell : pdfStyles.tableCell;

    if (hasCJKInlineTokens(cell.inlineTokens)) {
        return (
            <View
                key={contentKey}
                style={cellStyle}
            >
                {renderInlineTokensAsVectorText(
                    cell.inlineTokens,
                    `${contentKey}-table-vector`,
                    8.5,
                    color,
                    maxWidth,
                    1.35,
                    isHeader,
                )}
            </View>
        );
    }

    return (
        <View
            key={contentKey}
            style={cellStyle}
        >
            <Text
                style={[isHeader ? pdfStyles.tableHeaderText : pdfStyles.tableCellText, { textAlign: align ?? 'left' }]}
            >
                {renderInlineTokens(cell.inlineTokens, contentKey)}
            </Text>
        </View>
    );
};

const renderPDFContent = (parsed: ParsedContent[]) => {
    const contentOccurrences = new Map<string, number>();

    const elements = parsed
        .map((item) => {
            const contentKey = createPdfNodeKey(getContentKey(item, item.type), contentOccurrences);

            switch (item.type) {
                case 'code': {
                    if (!item.content) {
                        return null;
                    }

                    if (hasCJKText(item.content)) {
                        const codeLines = item.content.split('\n');
                        const codeLineOccurrences = new Map<string, number>();

                        return (
                            <View
                                key={contentKey}
                                style={pdfStyles.codeBlock}
                            >
                                {codeLines.map((line) => {
                                    const lineKey = createPdfNodeKey(`${contentKey}-code-${line}`, codeLineOccurrences);

                                    return renderPdfVectorTextRuns(
                                        textToVectorRuns(line || ' ', '#e2e8f0', false, true),
                                        {
                                            fontSize: 8.5,
                                            keyPrefix: lineKey,
                                            lineHeight: 1.4,
                                            maxWidth: PDF_CODE_BLOCK_WIDTH,
                                        },
                                    );
                                })}
                            </View>
                        );
                    }

                    return (
                        <Text
                            key={contentKey}
                            style={pdfStyles.codeBlock}
                        >
                            {renderTextWithCJK(item.content, 'NotoSansMono', 'NotoSansMono', contentKey)}
                        </Text>
                    );
                }

                case 'heading': {
                    if (!item.inlineTokens || item.inlineTokens.length === 0) {
                        return null;
                    }

                    const style =
                        item.level === 1
                            ? pdfStyles.h1
                            : item.level === 2
                              ? pdfStyles.h2
                              : item.level === 3
                                ? pdfStyles.h3
                                : item.level === 4
                                  ? pdfStyles.h4
                                  : item.level === 5
                                    ? pdfStyles.h5
                                    : pdfStyles.h6;

                    if (hasCJKInlineTokens(item.inlineTokens)) {
                        const fontSize =
                            item.level === 1
                                ? 16
                                : item.level === 2
                                  ? 14
                                  : item.level === 3
                                    ? 13
                                    : item.level === 4
                                      ? 12
                                      : item.level === 5
                                        ? 11
                                        : 10;
                        const color =
                            item.level === 1
                                ? '#0f172a'
                                : item.level === 2
                                  ? '#1e293b'
                                  : item.level === 3
                                    ? '#334155'
                                    : item.level === 4
                                      ? '#475569'
                                      : item.level === 5
                                        ? '#64748b'
                                        : '#94a3b8';

                        return (
                            <View
                                key={contentKey}
                                style={style}
                            >
                                {renderInlineTokensAsVectorText(
                                    item.inlineTokens,
                                    `${contentKey}-heading-vector`,
                                    fontSize,
                                    color,
                                    PDF_CONTENT_WIDTH,
                                    1.35,
                                    true,
                                )}
                            </View>
                        );
                    }

                    return (
                        <Text
                            key={contentKey}
                            style={style}
                        >
                            {renderInlineTokens(item.inlineTokens, contentKey)}
                        </Text>
                    );
                }

                case 'hr': {
                    return (
                        <View
                            key={contentKey}
                            style={pdfStyles.hr}
                        />
                    );
                }

                case 'list': {
                    if (!item.items || item.items.length === 0) {
                        return null;
                    }

                    const listItemOccurrences = new Map<string, number>();

                    return (
                        <View
                            key={contentKey}
                            style={pdfStyles.list}
                        >
                            {item.items.map((listItem, li) => {
                                const listItemKey = createPdfNodeKey(
                                    `${contentKey}-li-${listItem.raw}`,
                                    listItemOccurrences,
                                );

                                return (
                                    <View
                                        key={listItemKey}
                                        style={pdfStyles.listItem}
                                    >
                                        <Text style={pdfStyles.listBullet}>{item.ordered ? `${li + 1}.` : '•'}</Text>
                                        {hasCJKInlineTokens(listItem.inlineTokens) ? (
                                            <View style={pdfStyles.listContent}>
                                                {renderInlineTokensAsVectorText(
                                                    listItem.inlineTokens,
                                                    `${listItemKey}-list-vector`,
                                                    10,
                                                    '#334155',
                                                    PDF_LIST_CONTENT_WIDTH,
                                                )}
                                            </View>
                                        ) : (
                                            <Text style={pdfStyles.listContent}>
                                                {renderInlineTokens(listItem.inlineTokens, listItemKey)}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    );
                }

                case 'paragraph': {
                    if (!item.inlineTokens || item.inlineTokens.length === 0) {
                        return null;
                    }

                    if (hasCJKInlineTokens(item.inlineTokens)) {
                        return (
                            <View
                                key={contentKey}
                                style={pdfStyles.paragraph}
                            >
                                {renderInlineTokensAsVectorText(
                                    item.inlineTokens,
                                    `${contentKey}-paragraph-vector`,
                                    10,
                                    '#475569',
                                )}
                            </View>
                        );
                    }

                    return (
                        <Text
                            key={contentKey}
                            style={pdfStyles.paragraph}
                        >
                            {renderInlineTokens(item.inlineTokens, contentKey)}
                        </Text>
                    );
                }

                case 'table': {
                    const columnCount = getTableColumnCount(item);
                    const header = normalizeTableRow(item.header ?? [], columnCount);
                    const rows = (item.rows ?? []).map((row) => normalizeTableRow(row, columnCount));
                    const tableRowOccurrences = new Map<string, number>();

                    return (
                        <View
                            key={contentKey}
                            style={pdfStyles.table}
                        >
                            {header.length > 0 && (
                                <View
                                    key={`${contentKey}-header`}
                                    style={pdfStyles.tableRow}
                                >
                                    {header.map((cell, cellIndex) => {
                                        const cellKey = createPdfNodeKey(
                                            `${contentKey}-header-${cellIndex}-${cell.raw}`,
                                            tableRowOccurrences,
                                        );

                                        return renderTableCell(
                                            cell,
                                            cellKey,
                                            columnCount,
                                            true,
                                            item.align?.[cellIndex] ?? null,
                                        );
                                    })}
                                </View>
                            )}
                            {rows.map((row, rowIndex) => {
                                const rowKey = createPdfNodeKey(`${contentKey}-row-${rowIndex}`, tableRowOccurrences);

                                return (
                                    <View
                                        key={rowKey}
                                        style={pdfStyles.tableRow}
                                    >
                                        {row.map((cell, cellIndex) => {
                                            const cellKey = createPdfNodeKey(
                                                `${rowKey}-cell-${cellIndex}-${cell.raw}`,
                                                tableRowOccurrences,
                                            );

                                            return renderTableCell(
                                                cell,
                                                cellKey,
                                                columnCount,
                                                false,
                                                item.align?.[cellIndex] ?? null,
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </View>
                    );
                }

                default: {
                    return null;
                }
            }
        })
        .filter((el) => el !== null);

    return elements;
};

function PDFReportDocument({ content }: { content: string }) {
    const parsed = parseMarkdownTokens(content);
    const elements = renderPDFContent(parsed);

    return (
        <Document>
            <Page
                size="A4"
                style={pdfStyles.page}
            >
                {elements}
            </Page>
        </Document>
    );
}

export const generatePDFFromMarkdownNew = async (content: string, fileName: string): Promise<void> => {
    try {
        await ensurePdfVectorFontsLoaded();

        const doc = <PDFReportDocument content={content} />;
        const blob = await pdf(doc).toBlob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
        Log.error('Failed to generate PDF:', error);
        throw error;
    }
};

export const generatePDFBlobNew = async (content: string): Promise<Blob> => {
    try {
        await ensurePdfVectorFontsLoaded();

        const doc = <PDFReportDocument content={content} />;

        return await pdf(doc).toBlob();
    } catch (error) {
        Log.error('Failed to generate PDF blob:', error);
        throw error;
    }
};
