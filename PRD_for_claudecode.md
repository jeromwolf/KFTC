# 공정거래위원회 바이브코딩 교육 — 앱 제작 PRD
> Claude Code에게 전달하는 전체 작업 명세서

---

## 📁 폴더 구조

```
complaint-app/
├── sample_민원목록_200건.xlsx   ← 이미 완성
├── step1/index.html             ← 제작 필요
├── step2/index.html             ← 제작 필요
├── step3/index.html             ← 제작 필요 (완성본)
└── templates/
    ├── 출장결과보고서.html        ← 제작 필요
    ├── 민원답변공문.html          ← 제작 필요
    ├── 회의록자동구조화.html       ← 제작 필요
    └── 공문안내문생성기.html       ← 제작 필요
```

---

## 🎨 공통 디자인 규칙 (전 파일 공통 적용)

```css
/* 색상 */
--primary: #1a3a6b;       /* 공공기관 파란색 */
--primary-light: #2a5298;
--bg: #eef2f7;
--white: #ffffff;
--border: #d0d9e8;
--text: #2c3e50;
--text-muted: #666;

/* 폰트 */
font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;

/* 헤더 */
header { background: #1a3a6b; color: white; padding: 16px 28px; }
header에 기관 로고 느낌 (🏛️) + 앱 제목
```

---

## 📦 외부 라이브러리 (CDN — 인터넷 필요)

```html
<!-- 엑셀 파싱/생성 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

<!-- 차트 (step3만) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
```

---

## ① step1/index.html — 엑셀 업로드 + 기본 테이블

### 목적
참석자가 PRD를 입력하고 Antigravity로 처음 생성하는 결과물.
심플하게 "동작한다"는 것만 보여주면 됨.

### 기능
- 엑셀(.xlsx/.csv) 파일 업로드 버튼
- 업로드 시 테이블로 내용 표시
- 상단에 총 건수 표시
- 디자인: 최소한의 스타일 (흰 배경, 기본 테이블)

### 표시 컬럼
번호 | 제목 | 민원내용 | 접수일

### 주의
- SheetJS 사용
- AI 기능 없음
- 단순하게 — 이게 Step 1의 의도

---

## ② step2/index.html — 파란 테마 + Claude AI 분류

### 목적
Step 1에서 "디자인 바꿔줘" + "AI 연결해줘" 를 추가한 버전.

### 기능 추가 (Step 1 대비)
1. **공공기관 파란 테마** 전면 적용
2. **상단 통계 카드 4개**: 전체 / 긴급 / 보통 / 낮음
3. **Claude API 키 입력창** + 모드 표시 뱃지
4. **AI 분류 버튼** → 전체 민원 일괄 분류
5. **분류 결과 테이블** (추가 컬럼 표시)

### 표시 컬럼
번호 | 제목 | 민원내용 | 접수일 | **유형** | **담당부서** | **우선순위** | **요약** | **관련법령**

### AI 분류 로직

**Claude API 모드** (API 키 입력 시):
```
각 민원을 Claude API로 전송
시스템 프롬프트:
"당신은 공정거래위원회 민원 분류 전문가입니다.
민원 내용을 분석하여 아래 JSON 형식으로만 응답하세요:
{
  "유형": "가격 담합|불공정 거래행위|허위·과장 광고|시장지배적 지위 남용|하도급 위반|소비자 피해|기타",
  "담당부서": "카르텔조사국|시장감시국|소비자정책국|기업거래정책국|민원상담실",
  "우선순위": "긴급|보통|낮음",
  "요약": "20자 이내 핵심 요약",
  "관련법령": "공정거래법 제OO조|표시광고법 제OO조|하도급법 제OO조|소비자기본법 제OO조"
}"
```

**키워드 모드** (API 키 없을 때 자동 전환):
```javascript
const KW_RULES = [
  { type:'가격 담합', dept:'카르텔조사국', law:'공정거래법 제40조',
    keywords:['담합','카르텔','입찰 담합','가격 합의','공동 가격'] },
  { type:'불공정 거래행위', dept:'시장감시국', law:'공정거래법 제45조',
    keywords:['불공정','끼워팔기','거래 거절','구속 조건','지위 남용'] },
  { type:'허위·과장 광고', dept:'소비자정책국', law:'표시광고법 제3조',
    keywords:['허위','과장','광고','거짓','오인'] },
  { type:'시장지배적 지위 남용', dept:'시장감시국', law:'공정거래법 제5조',
    keywords:['독점','시장지배','남용','배제','플랫폼'] },
  { type:'하도급 위반', dept:'기업거래정책국', law:'하도급법 제4조',
    keywords:['하도급','대금 미지급','기술자료','부당 감액','납품'] },
  { type:'소비자 피해', dept:'소비자정책국', law:'소비자기본법 제19조',
    keywords:['소비자','환불','청약 철회','약관','구독'] },
];
// 매칭 없으면: 기타 / 민원상담실 / 낮음
```

### API 호출 방식
- 200건을 한꺼번에 보내지 말 것 (토큰 초과)
- 1건씩 순차 처리 또는 5건씩 배치
- 진행률 표시: "분류 중... 45/200"
- API 오류 시 자동으로 키워드 모드 fallback

### 우선순위 뱃지 색상
- 긴급: 빨간 배경 (#fde8e8, 글자 #c0392b)
- 보통: 노란 배경 (#fef9e7, 글자 #d68910)
- 낮음: 초록 배경 (#e8f8f0, 글자 #1e8449)

---

## ③ step3/index.html — 완성본 (차트 + 다운로드)

### 목적
강사 시연용 + 따라하기 최종 완성본.
"와, 이게 다 자동으로!" 가 느껴지는 임팩트 있는 UI.

### Step 2 대비 추가 기능
1. **도넛 차트**: 유형별 민원 비율
2. **바 차트**: 담당부서별 건수
3. **엑셀 다운로드**: 분류 결과 포함한 xlsx 저장
4. **인쇄 버튼**
5. **필터**: 유형별 / 부서별 / 우선순위별 필터링
6. **월별 추이 카드** (선택): 최근 3개월 건수 변화

### 레이아웃
```
[헤더: 공정거래위원회 민원 AI 분류 대시보드]
[API 키 입력창]                    [모드 뱃지]
[업로드 버튼]
[통계 카드: 전체 | 긴급 | 보통 | 낮음]
[도넛 차트 (유형별)]  |  [바 차트 (부서별)]
[필터 바]
[AI 분류 버튼]  [엑셀 다운로드]  [인쇄]
[진행률 바]
[결과 테이블]
```

### 차트 상세
- 도넛: Chart.js, 6개 유형, 범례 포함, 가운데 총 건수 표시
- 바: 가로 바 차트, 부서별 건수, 색상은 primary 계열

### 엑셀 다운로드
- 파일명: `민원분류결과_YYYYMMDD.xlsx`
- 헤더 파란색 스타일 적용
- 분류 완료된 데이터 전체 포함

---

## ④ templates/출장결과보고서.html

### 목적
출장 정보를 입력하면 Claude AI가 공식 보고서 형식으로 작성해주는 도구

### 입력 폼
| 항목 | 입력 타입 |
|---|---|
| 출장자 성명 | text |
| 소속 / 직급 | text |
| 출장 기간 | date range |
| 출장지 | text |
| 출장 목적 | textarea |
| 주요 활동 내용 | textarea (줄바꿈으로 구분) |
| 협의 결과 / 주요 성과 | textarea |
| 향후 조치 계획 | textarea |

### AI 프롬프트
```
공정거래위원회 공문 양식에 맞는 출장 결과 보고서를 작성해주세요.
형식: 제목, 1.출장 개요, 2.주요 활동, 3.협의 결과, 4.향후 조치사항
격식체(합니다 체) 사용, 행정문서 스타일
```

### 출력
- 생성된 보고서를 텍스트 박스에 표시
- 복사 버튼
- (선택) Word 다운로드 버튼 — 어려우면 텍스트 다운로드로

---

## ⑤ templates/민원답변공문.html

### 목적
민원 내용과 유형을 입력하면 공식 답변 공문 초안을 생성

### 입력 폼
| 항목 | 입력 타입 |
|---|---|
| 민원 제목 | text |
| 민원 내용 | textarea |
| 민원 유형 | select (6종 + 기타) |
| 담당자명 | text |
| 처리 결과 | select (조사 착수 / 검토 후 회신 / 관할 아님 / 이미 처리됨) |
| 추가 안내 사항 | textarea (선택) |

### AI 프롬프트
```
공정거래위원회 민원 답변 공문을 작성해주세요.
- 수신: 민원인
- 발신: 공정거래위원회
- 격식체, 공문 양식
- 민원 내용을 검토하였음을 명시
- 처리 결과와 향후 안내를 포함
```

### 출력
- 공문 형식으로 표시 (수신/발신/제목/본문/문서번호)
- 복사 버튼

---

## ⑥ templates/회의록자동구조화.html

### 목적
자유롭게 입력한 회의 내용을 AI가 안건/논의/결정/후속조치 형식으로 정리

### 입력 폼
| 항목 | 입력 타입 |
|---|---|
| 회의명 | text |
| 일시 / 장소 | text |
| 참석자 | text |
| 회의 내용 (자유 입력) | textarea (크게, 메모 형식으로) |

### AI 프롬프트
```
아래 회의 내용을 공식 회의록 형식으로 구조화해주세요.
형식:
1. 회의 개요 (일시, 장소, 참석자)
2. 안건별 논의 내용
3. 결정 사항
4. 후속 조치 및 담당자
격식체 사용
```

### 출력
- 구조화된 회의록 텍스트 표시
- 복사 버튼

---

## ⑦ templates/공문안내문생성기.html

### 목적
업무 협조 요청, 행사 안내, 기관 공지 등 다양한 공문/안내문을 AI로 생성

### 입력 폼
| 항목 | 입력 타입 |
|---|---|
| 문서 유형 | select (업무 협조 요청 / 행사 안내 / 기관 공지 / 감사 인사 / 기타) |
| 수신 기관/부서 | text |
| 제목 | text |
| 핵심 내용 (요점만) | textarea |
| 요청 사항 또는 안내 사항 | textarea |
| 제출/회신 기한 | date (선택) |
| 담당자 | text |

### AI 프롬프트
```
공정거래위원회 [문서유형]을 작성해주세요.
- 수신: [수신기관]
- 발신: 공정거래위원회 [담당부서]
- 공문 형식 (수신/참조/제목/내용/붙임)
- 격식체, 간결하고 명확하게
```

### 출력
- 공문 형식으로 표시
- 복사 버튼

---

## ⚙️ 공통 구현 사항

### Claude API 호출 방식 (templates 4종 공통)
```javascript
async function callClaude(systemPrompt, userContent, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }]
    })
  });
  const data = await response.json();
  return data.content[0].text;
}
```

### API 키 처리
- 모든 파일에 API 키 입력창 포함
- localStorage에 저장하여 파일 간 공유
  ```javascript
  // 저장
  localStorage.setItem('ftc_api_key', apiKey);
  // 불러오기
  const savedKey = localStorage.getItem('ftc_api_key') || '';
  ```

### 로딩 상태
- 버튼 비활성화 + "생성 중..." 텍스트
- 스피너 또는 진행률 표시

### 에러 처리
- API 오류 시 사용자에게 명확한 메시지
- step1~3: 키워드 모드 자동 fallback

---

## ✅ 작업 우선순위

1. `step3/index.html` (완성본 — 가장 중요)
2. `step1/index.html`
3. `step2/index.html`
4. `templates/출장결과보고서.html`
5. `templates/민원답변공문.html`
6. `templates/회의록자동구조화.html`
7. `templates/공문안내문생성기.html`

step3 먼저 만들고 → 브라우저에서 테스트 → OK면 나머지 진행
