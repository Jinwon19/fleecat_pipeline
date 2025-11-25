# PDF 변환 가이드 📄

> PORTFOLIO.md를 PDF로 변환하는 3가지 방법

**원본 파일**: `PORTFOLIO.md`
**목표**: 입사지원용 PDF 포트폴리오 생성

---

## 🎯 추천 순서

1. **방법 1: Typora** (가장 깔끔, 추천)
2. 방법 2: VS Code + Markdown PDF
3. 방법 3: 온라인 변환

---

## 방법 1: Typora (가장 깔끔, 추천 ⭐)

### 장점
- ✅ 가장 깔끔한 PDF 출력
- ✅ 한글 폰트 지원 완벽
- ✅ 페이지 나누기 지원
- ✅ 목차 자동 생성

### 단계

1. **Typora 다운로드**
   - https://typora.io/ 접속
   - Windows / Mac / Linux 버전 다운로드
   - 무료 평가판 사용 (충분함)

2. **PORTFOLIO.md 열기**
   - Typora로 `PORTFOLIO.md` 파일 열기
   - 실시간 미리보기로 확인

3. **테마 선택 (선택사항)**
   - File → Preferences → Appearance → Get Themes
   - "GitHub", "Newsprint", "Pixyll" 추천

4. **PDF 내보내기**
   - File → Export → PDF
   - 저장 위치: `FleeCat_Portfolio_Jinwon19.pdf`
   - ✅ 완료!

### 권장 설정
- 여백: 보통 (default)
- 용지 크기: A4
- 페이지 번호: 하단 중앙

---

## 방법 2: VS Code + Markdown PDF 확장

### 장점
- ✅ VS Code에서 바로 변환
- ✅ 개발자 친화적
- ✅ 커스터마이징 가능

### 단계

1. **VS Code 확장 설치**
   - VS Code 열기
   - Extensions (Ctrl+Shift+X)
   - "Markdown PDF" 검색 및 설치
   - 제작자: yzane

2. **PORTFOLIO.md 열기**
   - VS Code에서 `PORTFOLIO.md` 열기

3. **PDF 변환**
   - 우클릭 → "Markdown PDF: Export (pdf)"
   - 또는 Ctrl+Shift+P → "Markdown PDF: Export (pdf)"
   - 같은 폴더에 `PORTFOLIO.pdf` 생성

4. **설정 조정 (선택사항)**
   - File → Preferences → Settings
   - "markdown-pdf" 검색
   - 여백, 폰트 크기 조정

### 권장 설정 (settings.json)
```json
{
  "markdown-pdf.format": "A4",
  "markdown-pdf.displayHeaderFooter": true,
  "markdown-pdf.headerTemplate": "<div style='font-size:9px; width:100%; text-align:center;'>FleeCat Portfolio</div>",
  "markdown-pdf.footerTemplate": "<div style='font-size:9px; width:100%; text-align:center;'><span class='pageNumber'></span> / <span class='totalPages'></span></div>"
}
```

---

## 방법 3: 온라인 변환

### 장점
- ✅ 설치 불필요
- ✅ 빠르고 간단
- ❌ 한글 폰트 깨질 수 있음

### 추천 사이트

#### 1. md2pdf.netlify.app
- https://md2pdf.netlify.app/
- Markdown 복사 → 붙여넣기 → Download PDF

#### 2. CloudConvert
- https://cloudconvert.com/md-to-pdf
- 파일 업로드 → Convert → 다운로드

#### 3. Dillinger
- https://dillinger.io/
- Markdown 작성 → Export as → PDF

### 주의사항
- 한글 폰트가 깨질 수 있음
- 페이지 나누기가 제대로 안 될 수 있음
- **입사지원용이라면 방법 1 또는 2 추천**

---

## 🎨 PDF 퀄리티 향상 팁

### 1. 폰트 설정
- **한글**: 나눔고딕, 맑은 고딕
- **영문**: Roboto, Open Sans
- **코드**: Fira Code, JetBrains Mono

### 2. 여백 및 레이아웃
- 여백: 상하좌우 2cm
- 줄 간격: 1.5배
- 용지: A4

### 3. 색상
- 제목: 진한 남색 (#2c3e50)
- 본문: 검정 (#333333)
- 코드 블록: 회색 배경 (#f5f5f5)

### 4. 이미지
- 해상도: 최소 300 DPI
- 크기: 적절한 비율 유지
- 위치: 중앙 정렬

---

## ✅ 최종 체크리스트

변환 전 확인사항:

- [ ] **연락처 입력**: 9페이지 "연락처 및 참고" 섹션
- [ ] **GitHub 링크 확인**: https://github.com/Jinwon19/fleecat_pipeline
- [ ] **오타 검사**: Markdown 미리보기로 확인
- [ ] **코드 블록 정리**: 들여쓰기 및 syntax highlighting 확인
- [ ] **페이지 나누기**: `<div style="page-break-after: always;"></div>` 위치 확인

변환 후 확인사항:

- [ ] **파일명**: `FleeCat_Portfolio_Jinwon19.pdf`
- [ ] **페이지 수**: 9-10페이지
- [ ] **폰트 깨짐**: 한글 및 코드 블록 확인
- [ ] **링크 작동**: GitHub 링크 클릭 가능한지 확인
- [ ] **파일 크기**: 10MB 이하 (이메일 첨부 가능)

---

## 📧 입사지원 시 활용

### 파일 제출

1. **파일명**:
   ```
   FleeCat_Portfolio_Jinwon19.pdf
   ```

2. **이메일 본문 예시**:
   ```
   안녕하세요.

   풀스택 개발자 포지션에 지원하는 Jinwon19입니다.

   첨부한 포트폴리오는 제가 3개월간 개발한 "FleeCat" 프로젝트로,
   웹크롤링→AI 데이터 정제→DB 연동→지도 시각화까지
   전체 데이터 파이프라인을 구축한 풀스택 프로젝트입니다.

   GitHub: https://github.com/Jinwon19/fleecat_pipeline

   감사합니다.
   ```

### 면접 대비

포트폴리오의 다음 섹션을 중점적으로 준비:

1. **7페이지: 기술적 도전과 해결**
   - STAR 방식으로 설명 준비
   - 구체적인 수치와 결과 강조

2. **3-6페이지: 핵심 기능**
   - 각 기능의 코드를 깊이 이해
   - "왜 그렇게 구현했는지" 설명 준비

3. **8페이지: 성과 및 배운 점**
   - 정량적 성과 암기
   - 개인적 성장 스토리 준비

---

## 🆘 문제 해결

### 한글이 깨져요
- Typora 사용 (한글 지원 완벽)
- 또는 폰트 직접 지정:
  ```css
  body { font-family: "Nanum Gothic", sans-serif; }
  ```

### 코드 블록이 이상해요
- Syntax highlighting 확인
- ` ```python ` 형식 사용

### 페이지가 너무 많아요
- 불필요한 섹션 제거
- 코드 블록 축약
- 여백 줄이기

### 파일 크기가 너무 커요
- 이미지 압축 (있다면)
- 폰트 임베드 해제
- PDF 압축: https://www.ilovepdf.com/compress_pdf

---

## 📚 추가 자료

- **Markdown 문법**: https://www.markdownguide.org/
- **Typora 가이드**: https://support.typora.io/
- **PDF 최적화**: https://www.ilovepdf.com/

---

**작성일**: 2025-01-25
**파일**: `PDF_CONVERSION_GUIDE.md`
**목적**: PORTFOLIO.md → PDF 변환 가이드
