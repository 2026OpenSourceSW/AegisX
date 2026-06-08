import { Path, Svg, View } from '@react-pdf/renderer';
import * as fontkit from 'fontkit';

export interface PdfVectorGlyphPath {
    readonly color: string;
    readonly d: string;
    readonly key: string;
    readonly transform: string;
}
export interface PdfVectorTextLayout {
    readonly paths: readonly PdfVectorGlyphPath[];
    readonly viewHeight: number;
    readonly width: number;
}
export interface PdfVectorTextRun {
    readonly bold?: boolean;
    readonly color: string;
    readonly family?: VectorFontFamily;
    readonly text: string;
}
export type VectorFontFamily = 'cjk' | 'korean' | 'mono';

interface LoadedVectorFonts {
    readonly [family: string]: Record<VectorFontWeight, fontkit.Font>;
}

interface PdfVectorTextLineOptions {
    readonly fontSize: number;
    readonly keyPrefix: string;
    readonly lineHeight?: number;
    readonly maxWidth: number;
}

type VectorFontWeight = 'bold' | 'regular';

const VECTOR_FONT_FILES: Record<VectorFontFamily, Record<VectorFontWeight, string>> = {
    cjk: {
        bold: 'NotoSansSC-Bold.otf',
        regular: 'NotoSansSC-Regular.otf',
    },
    korean: {
        bold: 'AegisXReportKR-Bold.ttf',
        regular: 'AegisXReportKR-Regular.ttf',
    },
    mono: {
        bold: 'NotoSansMono-Bold.ttf',
        regular: 'NotoSansMono-Regular.ttf',
    },
} as const;

let loadedVectorFonts: LoadedVectorFonts | null = null;

export const getPublicFontSource = (fileName: string): string => {
    const maybeProcess = (
        globalThis as typeof globalThis & { process?: { cwd?: () => string; versions?: { node?: string } } }
    ).process;

    if (maybeProcess?.versions?.node) {
        return `${maybeProcess.cwd?.() ?? ''}/public/fonts/${fileName}`;
    }

    return `/fonts/${fileName}`;
};

const isNodeRuntime = (): boolean => {
    const maybeProcess = (globalThis as typeof globalThis & { process?: { versions?: { node?: string } } }).process;

    return !!maybeProcess?.versions?.node;
};

const loadVectorFont = async (family: VectorFontFamily, weight: VectorFontWeight): Promise<fontkit.Font> => {
    const source = getPublicFontSource(VECTOR_FONT_FILES[family][weight]);

    if (isNodeRuntime()) {
        const nodeFontkit = fontkit as Record<string, unknown> & typeof fontkit;
        const openSyncKey = ['open', 'Sync'].join('');
        const openSync = nodeFontkit[openSyncKey];

        if (typeof openSync !== 'function') {
            throw new Error('fontkit.openSync is required for Node PDF vector font loading');
        }

        return (openSync as (path: string) => fontkit.Font)(source);
    }

    const response = await fetch(source);

    if (!response.ok) {
        throw new Error(`Failed to fetch PDF vector font ${source}: ${response.status} ${response.statusText}`);
    }

    return fontkit.create(await response.arrayBuffer());
};

export const ensurePdfVectorFontsLoaded = async (): Promise<void> => {
    if (loadedVectorFonts) {
        return;
    }

    const [cjkRegular, cjkBold, koreanRegular, koreanBold, monoRegular, monoBold] = await Promise.all([
        loadVectorFont('cjk', 'regular'),
        loadVectorFont('cjk', 'bold'),
        loadVectorFont('korean', 'regular'),
        loadVectorFont('korean', 'bold'),
        loadVectorFont('mono', 'regular'),
        loadVectorFont('mono', 'bold'),
    ]);

    loadedVectorFonts = {
        cjk: { bold: cjkBold, regular: cjkRegular },
        korean: { bold: koreanBold, regular: koreanRegular },
        mono: { bold: monoBold, regular: monoRegular },
    };
};

const getLoadedVectorFont = (bold = false, family: VectorFontFamily = 'korean'): fontkit.Font => {
    if (!loadedVectorFonts) {
        throw new Error('PDF vector fonts must be loaded before rendering CJK text');
    }

    return loadedVectorFonts[family][bold ? 'bold' : 'regular'];
};

const appendRunText = (runs: PdfVectorTextRun[], run: PdfVectorTextRun): PdfVectorTextRun[] => {
    const previous = runs.at(-1);

    if (previous && previous.bold === run.bold && previous.color === run.color && previous.family === run.family) {
        return [...runs.slice(0, -1), { ...previous, text: `${previous.text}${run.text}` }];
    }

    return [...runs, run];
};

const measureVectorText = (run: PdfVectorTextRun, fontSize: number): number => {
    const font = getLoadedVectorFont(run.bold, run.family);
    const scale = fontSize / font.unitsPerEm;

    return font.layout(run.text).advanceWidth * scale;
};

export const measurePdfVectorTextRuns = (runs: readonly PdfVectorTextRun[], fontSize: number): number => {
    return runs.reduce((width, run) => width + measureVectorText(run, fontSize), 0);
};

const wrapVectorTextRuns = (
    runs: readonly PdfVectorTextRun[],
    fontSize: number,
    maxWidth: number,
): PdfVectorTextRun[][] => {
    const lines: PdfVectorTextRun[][] = [];
    let currentLine: PdfVectorTextRun[] = [];
    let currentWidth = 0;

    for (const run of runs) {
        for (const character of Array.from(run.text)) {
            if (character === '\n') {
                lines.push(currentLine);
                currentLine = [];
                currentWidth = 0;
                continue;
            }

            const characterRun = { ...run, text: character };
            const characterWidth = measureVectorText(characterRun, fontSize);

            if (currentLine.length > 0 && currentWidth + characterWidth > maxWidth) {
                lines.push(currentLine);
                currentLine = [];
                currentWidth = 0;
            }

            currentLine = appendRunText(currentLine, characterRun);
            currentWidth += characterWidth;
        }
    }

    lines.push(currentLine);

    return lines.length > 0 ? lines : [[{ color: '#334155', text: ' ' }]];
};

const formatPdfNumber = (value: number): number => {
    return Number.isFinite(value) ? Number(value.toFixed(4)) : 0;
};

export const layoutPdfVectorTextLine = (
    runs: readonly PdfVectorTextRun[],
    lineKey: string,
    options: PdfVectorTextLineOptions,
): PdfVectorTextLayout => {
    const lineHeight = options.lineHeight ?? 1.35;
    const fonts = runs.map((run) => getLoadedVectorFont(run.bold, run.family));
    const viewHeight = options.fontSize * lineHeight;
    const maxAscent = Math.max(...fonts.map((font) => font.ascent * (options.fontSize / font.unitsPerEm)));
    const minDescent = Math.min(...fonts.map((font) => font.descent * (options.fontSize / font.unitsPerEm)));
    const naturalHeight = maxAscent - minDescent;
    const baseline = Math.max((viewHeight - naturalHeight) / 2, 0) + maxAscent;
    let cursor = 0;
    const paths = runs.flatMap((run, runIndex) => {
        const font = getLoadedVectorFont(run.bold, run.family);
        const scale = options.fontSize / font.unitsPerEm;
        const layout = font.layout(run.text);
        const runPaths: PdfVectorGlyphPath[] = [];

        for (let glyphPosition = 0; glyphPosition < layout.glyphs.length; glyphPosition += 1) {
            const glyph = layout.glyphs[glyphPosition];
            const position = layout.positions[glyphPosition];

            if (!glyph) {
                continue;
            }

            const x = cursor + (position?.xOffset ?? 0) * scale;
            const y = baseline - (position?.yOffset ?? 0) * scale;
            const pathKey = `${options.keyPrefix}-${lineKey}-${runIndex}-${glyphPosition}-${glyph.id}`;

            runPaths.push({
                color: run.color,
                d: glyph.path.toSVG(),
                key: pathKey,
                transform: `translate(${formatPdfNumber(x)} ${formatPdfNumber(y)}) scale(${formatPdfNumber(scale)} -${formatPdfNumber(scale)})`,
            });

            cursor += (position?.xAdvance ?? glyph.advanceWidth) * scale;
        }

        return runPaths;
    });

    return {
        paths,
        viewHeight,
        width: Math.max(formatPdfNumber(cursor), 1),
    };
};

const renderVectorTextLine = (
    runs: readonly PdfVectorTextRun[],
    lineKey: string,
    options: PdfVectorTextLineOptions,
) => {
    const renderableRuns = runs.length > 0 ? runs : [{ color: '#334155', text: ' ' }];
    const layout = layoutPdfVectorTextLine(renderableRuns, lineKey, options);

    return (
        <View
            key={`${options.keyPrefix}-line-${lineKey}`}
            style={{ height: layout.viewHeight, width: options.maxWidth }}
        >
            <Svg
                height={layout.viewHeight}
                viewBox={`0 0 ${Math.max(layout.width, 1)} ${layout.viewHeight}`}
                width={layout.width}
            >
                {layout.paths.map((path) => (
                    <Path
                        d={path.d}
                        fill={path.color}
                        key={path.key}
                        transform={path.transform}
                    />
                ))}
            </Svg>
        </View>
    );
};

export const renderPdfVectorTextRuns = (runs: readonly PdfVectorTextRun[], options: PdfVectorTextLineOptions) => {
    const wrappedLines = wrapVectorTextRuns(runs, options.fontSize, options.maxWidth);
    const lineOccurrences = new Map<string, number>();

    return wrappedLines.map((line) => {
        const lineText = line.map((run) => run.text).join('');
        const occurrence = (lineOccurrences.get(lineText) ?? 0) + 1;

        lineOccurrences.set(lineText, occurrence);

        return renderVectorTextLine(line, `${lineText}-${occurrence}`, options);
    });
};
