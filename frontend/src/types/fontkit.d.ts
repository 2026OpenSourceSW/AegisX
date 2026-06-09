declare module 'fontkit' {
    export interface Font {
        readonly ascent: number;
        readonly descent: number;
        layout(text: string): GlyphRun;
        readonly unitsPerEm: number;
    }

    export interface Glyph {
        readonly advanceWidth: number;
        readonly codePoints: readonly number[];
        readonly id: number;
        readonly path: GlyphPath;
    }

    export interface GlyphPath {
        toSVG(): string;
    }

    export interface GlyphPosition {
        readonly xAdvance: number;
        readonly xOffset: number;
        readonly yAdvance: number;
        readonly yOffset: number;
    }

    export interface GlyphRun {
        readonly advanceWidth: number;
        readonly glyphs: readonly Glyph[];
        readonly positions: readonly GlyphPosition[];
    }

    export function create(buffer: ArrayBuffer | Uint8Array): Font;
    export function openSync(path: string): Font;
}
