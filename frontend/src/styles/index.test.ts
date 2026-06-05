import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(join(process.cwd(), 'src/styles/index.css'), 'utf8');
const forbiddenExternalAssetMarkers = [
    ['cdn', 'tailwindcss', 'com'].join('.'),
    ['fonts', 'googleapis', 'com'].join('.'),
    ['Material', 'Symbols'].join(' '),
] as const;

describe('AegisX shell design tokens', () => {
    it('uses Stitch safe-blue shell tokens without external font or icon CDNs', () => {
        expect(styles).toContain('--background: #f7f9fb;');
        expect(styles).toContain('--primary: #2563eb;');
        expect(styles).toContain('--sidebar: #1a2b4b;');

        for (const marker of forbiddenExternalAssetMarkers) {
            expect(styles).not.toContain(marker);
        }
    });
});
