# AegisX 기여 가이드

이 문서는 AegisX 팀원이 작업할 때 따라야 하는 Git 브랜치 전략, Pull Request 규칙, 커밋 메시지, 라이선스 확인 기준을 정리합니다.

AegisX는 **PentAGI를 기반으로 한 fork 프로젝트**입니다. 기존 PentAGI의 Advanced Mode 구조를 유지하면서, 보안 전문 인력이 없는 팀도 이해하기 쉬운 Simple Mode와 Advanced Mode의 Shannon white-box scan 보조 기능을 실험합니다.

> 핵심 원칙: 작업은 작게 나누고, `develop`에 PR로 합치고, 검증 근거를 남깁니다.

---

## 목차

1. [🌿 브랜치 전략](#1--브랜치-전략)
2. [🔄 작업 흐름](#2--작업-흐름)
3. [✍️ 커밋 메시지 규칙](#3-️-커밋-메시지-규칙)
4. [✅ Pull Request 가이드](#4--pull-request-가이드)
5. [🛡️ 브랜치 보호 규칙](#5-️-브랜치-보호-규칙)
6. [📄 라이선스 준수 가이드](#6--라이선스-준수-가이드)
7. [💬 문의](#7--문의)

---

## 1. 🌿 브랜치 전략

### 기본 구조

```text
main ← develop ← docs/* | feature/* | fix/* | chore/*
```

| 브랜치 | 역할 | 규칙 |
| --- | --- | --- |
| `main` | 최종 안정/default 브랜치 | PR로만 반영 |
| `develop` | 개발 통합 브랜치 | PR로만 반영 |
| `feature/*` | 새 기능 개발 | `develop`에서 생성 |
| `fix/*` | 버그 수정 | `develop`에서 생성 |
| `docs/*` | 문서, GitHub 템플릿 작업 | `develop`에서 생성 |
| `chore/*` | CI, 설정, 빌드, 의존성 작업 | `develop`에서 생성 |

### 브랜치 이름 규칙

- 영어 소문자, 숫자, 하이픈(`-`), 슬래시(`/`)만 사용합니다.
- 한 PR은 하나의 목적만 담습니다.

예시:

```text
feature/simple-mode-risk-cards
fix/shannon-scan-validation
docs/korean-contributing-guide
chore/github-workflow-hygiene
```

---

## 2. 🔄 작업 흐름

### Step 1. 저장소 클론

```bash
git clone https://github.com/2026OpenSourceSW/AegisX.git
cd AegisX
```

### Step 2. 최신 `develop`에서 작업 브랜치 생성

```bash
git checkout develop
git pull origin develop
git checkout -b docs/korean-contributing-guide
```

### Step 3. 작업 중 `develop` 변경사항 반영

다른 팀원의 PR이 먼저 merge되었다면 작업 브랜치에 최신 `develop`을 반영합니다.

```bash
git checkout develop
git pull origin develop
git checkout docs/korean-contributing-guide
git merge develop
```

### Step 4. 커밋

```bash
git add .
git commit -m "docs: update korean contributing guide"
```

### Step 5. Pull Request 생성

GitHub에서 PR을 만듭니다.

- **Base:** `develop`
- **Compare:** 내 작업 브랜치
- **원칙:** 구현/문서/설정 단위로 PR을 나눕니다.

### Step 6. 리뷰 후 merge

- 최소 1명 이상이 확인합니다.
- PR 본문에 검증한 명령이나 화면 확인 결과를 남깁니다.
- merge 후 더 필요 없는 작업 브랜치는 삭제합니다.

### Step 7. `main` 반영

`main`은 최종 안정 브랜치입니다. `develop`에서 충분히 검증한 뒤 별도 PR로 반영합니다.

```text
develop → main
```

---

## 3. ✍️ 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 사용합니다.

```text
<type>(<scope>): <subject>
```

| 타입 | 사용 시점 | 예시 |
| --- | --- | --- |
| `feat` | 새 기능 | `feat(frontend): add simple mode risk cards` |
| `fix` | 버그 수정 | `fix(shannon): require non-production confirmation` |
| `docs` | 문서 수정 | `docs: update korean contributing guide` |
| `style` | 포맷팅만 변경 | `style: format frontend files` |
| `refactor` | 동작 변경 없는 구조 개선 | `refactor(api): simplify flow service` |
| `test` | 테스트 추가/수정 | `test: cover shannon request validation` |
| `chore` | 빌드, 설정, 의존성 | `chore(ci): guard docker publishing` |

작성 팁:

- 제목은 짧고 명확하게 작성합니다.
- 가능하면 명령형으로 씁니다.
- 한글/영어 모두 가능하지만, PR 안에서는 표현을 통일합니다.

---

## 4. ✅ Pull Request 가이드

PR 본문에는 아래 내용을 꼭 남깁니다.

- 무엇을 바꿨는지
- 왜 바꿨는지
- 어떤 파일/기능에 영향이 있는지
- 어떤 명령으로 확인했는지
- 화면, 문서, GitHub 설정처럼 사람이 보는 부분은 어떻게 확인했는지
- 보안/라이선스/외부 도구 영향이 있는지

리뷰 체크리스트:

- [ ] Base branch가 `develop`인지 확인
- [ ] PR 범위가 하나의 목적에 집중되어 있는지 확인
- [ ] 테스트 또는 문서 검증 결과가 있는지 확인
- [ ] 사용자에게 보이는 변경은 실제 화면/문서로 확인했는지 확인
- [ ] PentAGI 원 저작권과 라이선스 고지를 유지했는지 확인
- [ ] Shannon 관련 변경은 외부 CLI/Docker worker 경계를 유지했는지 확인
- [ ] 스캔 기능은 소유/허가된 대상과 non-production 확인을 고려했는지 확인

---

## 5. 🛡️ 브랜치 보호 규칙

### `main`

- ✅ 직접 push 금지
- ✅ PR 필수
- ✅ 리뷰 승인 필요
- ✅ force push 금지
- ✅ 브랜치 삭제 금지

### `develop`

- ✅ 직접 push 금지
- ✅ PR 필수
- ✅ force push 금지
- ✅ 브랜치 삭제 금지

### 작업 브랜치

- 작업은 자유롭게 진행하되, merge는 PR을 통해 진행합니다.
- 오래 열린 PR은 최신 `develop`을 반영합니다.

---

## 6. 📄 라이선스 준수 가이드

### PentAGI가 MIT라면 마음대로 바꿔도 되나요?

대부분의 수정과 재배포가 가능합니다. 하지만 **MIT 라이선스는 "뭐든 마음대로 해도 된다는 뜻은 아닙니다."** 특히 "원 저작권 고지를 지워도 된다"거나 "다른 라이선스 의무가 전혀 없다"는 의미가 아닙니다.

MIT 라이선스의 핵심 조건은 다음과 같습니다.

- 원 저작권 고지와 MIT 허가 고지를 유지해야 합니다.
- 소스 코드나 배포물에 포함된 주요 부분에는 `LICENSE` 내용을 함께 보존해야 합니다.
- 수정한 내용은 우리 프로젝트의 변경사항으로 표시할 수 있습니다.

따라서 AegisX에서는 다음 원칙을 지킵니다.

- PentAGI 원 저작권과 MIT 라이선스 고지를 삭제하지 않습니다.
- AegisX 수정사항은 `NOTICE` 등에서 별도로 표시합니다.
- 코드/이미지/경로 이름이 아직 PentAGI를 사용한다면 문서에서 임의로 AegisX라고 바꾸지 않습니다.

### Shannon 관련 주의사항

Shannon은 AGPL 계열 라이선스입니다. AegisX에서는 Shannon을 내부 코드로 복사하지 않고, **Advanced Mode에서 외부 CLI/Docker worker로 호출하는 보조 엔진**으로 다룹니다.

정리하면:

- ✅ Shannon 실행 결과 markdown report를 AegisX flow/task 결과로 import
- ✅ `SHANNON_ENABLED=true`일 때 별도 설치된 Shannon 명령 실행
- ❌ Shannon 소스 코드를 AegisX 저장소에 복사
- ❌ Shannon을 AegisX 내부 모듈처럼 재라이선싱

### 새 의존성 추가 시 확인

일반적으로 사용 가능한 라이선스:

- MIT
- Apache-2.0
- BSD-2-Clause / BSD-3-Clause
- ISC
- MPL-2.0
- 0BSD

명시적 검토가 필요한 라이선스:

- GPL
- LGPL
- AGPL
- CC-BY-SA
- Proprietary / Commercial

### 확인 명령

```bash
./scripts/generate-licenses.sh
osv-scanner scan --experimental-licenses="MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,MPL-2.0" backend
osv-scanner scan --experimental-licenses="MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,MPL-2.0" frontend
```

---

## 7. 💬 문의

질문이나 제안은 GitHub Issues를 사용합니다.

https://github.com/2026OpenSourceSW/AegisX/issues
