# Fonts

This directory contains fonts used by the AegisX frontend application inherited from PentAGI, including web UI and PDF report generation.

## Inter

- **Files**: `inter-*.woff2` (8 files)
- **License**: SIL Open Font License 1.1
- **License File**: [OFL.txt](./OFL.txt)
- **Source**: https://github.com/rsms/inter
- **Copyright**: Copyright (c) 2016 The Inter Project Authors
- **Usage**: Main UI font for the web application.

## Pretendard

- **Files**: `PretendardVariable.woff2`, `AegisXReportKR-Regular.ttf`, `AegisXReportKR-Bold.ttf`
- **License**: SIL Open Font License 1.1
- **License File**: [LICENSE-Pretendard.txt](./LICENSE-Pretendard.txt)
- **Source**: https://github.com/orioncactus/pretendard
- **Copyright**: Copyright (c) 2021, Kil Hyung-jin
- **Usage**: Korean UI fallback font for AegisX web screens and Hangul-capable PDF report text. `AegisXReportKR-*` files are static PDF font builds generated from Pretendard and renamed for report embedding.

## Roboto Mono

- **Files**: `roboto-mono-*.woff2` (8 files)
- **License**: Apache License 2.0
- **License File**: [LICENSE-Apache-2.0.txt](./LICENSE-Apache-2.0.txt)
- **Source**: https://github.com/google/roboto
- **Copyright**: Google Inc.
- **Usage**: Monospace font for code display in the web UI.

## Noto Sans

- **Files**: `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf`, `NotoSans-Italic.ttf`, `NotoSans-BoldItalic.ttf`
- **License**: SIL Open Font License 1.1
- **License File**: [OFL.txt](./OFL.txt)
- **Source**: https://github.com/googlefonts/noto-fonts
- **Copyright**: Copyright 2022 The Noto Project Authors
- **Usage**: Main body font in PDF reports. Covers Latin, Cyrillic, Greek, Devanagari, Vietnamese, and many other scripts.

## Noto Sans Mono

- **Files**: `NotoSansMono-Regular.ttf`, `NotoSansMono-Bold.ttf`
- **License**: SIL Open Font License 1.1
- **License File**: [OFL.txt](./OFL.txt)
- **Source**: https://github.com/googlefonts/noto-fonts
- **Copyright**: Copyright 2022 The Noto Project Authors
- **Usage**: Monospace font for code blocks in PDF reports. Covers Latin and Cyrillic.

## Noto Sans SC (Simplified Chinese)

- **Files**: `NotoSansSC-Regular.otf`, `NotoSansSC-Bold.otf`
- **License**: SIL Open Font License 1.1
- **License File**: [OFL.txt](./OFL.txt)
- **Source**: https://github.com/notofonts/noto-cjk
- **Copyright**: Copyright 2014-2021 Adobe Systems Incorporated
- **Usage**: Simplified Chinese fallback in PDF reports. Do not rely on this font for Korean UI text.

## Notes

All fonts are open source and freely redistributable under their respective licenses (SIL OFL 1.1 and
Apache 2.0), both compatible with the MIT license used by the upstream PentAGI project and AegisX fork. Fonts are served from the
same origin as the application and never loaded from external servers.
