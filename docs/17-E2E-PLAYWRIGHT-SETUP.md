# TASK 17: Playwright E2E 테스트 구축

## 문서 목적

이 문서는 Playwright를 이용한 E2E(End-to-End) 테스트 구축 과정과 7가지 핵심 사용자 흐름 자동화를 기록한다.

## 완료 항목

### 1. Playwright 설치
- `@playwright/test` 설치 완료
- TypeScript 지원 포함

### 2. 프로젝트 구조

```
bookclub/
├── playwright/
│   ├── tests/
│   │   ├── 01-create-bookclub.spec.ts       (독서모임 생성)
│   │   ├── 02-participant-join.spec.ts      (참여자 참여)
│   │   ├── 03-reading-record.spec.ts        (독서 기록 작성)
│   │   ├── 04-start-meeting.spec.ts         (모임 시작)
│   │   ├── 05-steps-progression.spec.ts     (STEP 진행)
│   │   ├── 06-end-meeting.spec.ts           (모임 종료)
│   │   └── 07-new-session.spec.ts           (새 회차 생성)
│   ├── fixtures/
│   │   └── app.ts                           (App 헬퍼 클래스)
│   └── README.md                            (테스트 문서)
├── playwright.config.ts                     (전체 설정)
├── package.json                             (수정됨: E2E 스크립트 추가)
└── docs/
    └── 17-E2E-PLAYWRIGHT-SETUP.md           (이 파일)
```

### 3. 설정 파일: playwright.config.ts

```typescript
{
  testDir: './playwright/tests',
  fullyParallel: false,                       // 순차 실행
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                                 // 단일 워커
  reporter: 'html',                           // HTML 리포트
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
}
```

## E2E 테스트 7가지

### 1. E2E 01: 독서모임 생성 (Create Bookclub)

**테스트 파일**: `playwright/tests/01-create-bookclub.spec.ts`

**사용자 흐름**:
1. 랜딩 페이지 접속 (`/`)
2. "독서모임 시작하기" 클릭
3. 모임명, 별명, 책 제목, 날짜 입력
4. "독서모임 만들기" 클릭
5. 모임방 URL 확인 (`/[bookClubId]`)
6. 모임 정보 표시 확인

**테스트 케이스** (3개):
- `should create a new bookclub and redirect to bookclub room`
- `should display invite link on bookclub page`
- `should display bookclub information correctly`

**주요 검증**:
- 새로운 bookClubId 생성 확인
- 초대 링크 표시 확인
- 모임 정보 정확성 확인

---

### 2. E2E 02: 참여자 참여 (Participant Join)

**테스트 파일**: `playwright/tests/02-participant-join.spec.ts`

**사용자 흐름**:
1. 호스트가 모임 생성
2. 초대 링크 추출
3. 새 브라우저 컨텍스트에서 링크 접속
4. 별명 입력
5. "참여하기" 클릭
6. 모임방 진입 확인
7. 참여자 목록 업데이트 확인

**테스트 케이스** (3개):
- `should allow participant to join bookclub via invite link`
- `should display bookclub info on join page before participation`
- `should update member list when multiple participants join`

**주요 검증**:
- 초대 링크 접속 가능 여부
- 참여자 정보 표시 정확성
- 다중 참여자 관리 기능

---

### 3. E2E 03: 독서 기록 작성 (Reading Record)

**테스트 파일**: `playwright/tests/03-reading-record.spec.ts`

**사용자 흐름**:
1. 모임방에서 "독서 기록 작성하기" 클릭
2. 3개 필드 입력:
   - 인상 깊은 문장
   - 질문
   - 적용점
3. "저장하기" 클릭
4. 모임방 복귀 확인
5. 기록 상태 "작성완료" 표시 확인

**테스트 케이스** (4개):
- `should create reading record and display completion status`
- `should allow editing reading record`
- `should require all fields to save reading record`
- `should display reading record status for all participants`

**주요 검증**:
- 기록 저장 기능
- 기록 수정 기능
- 필수 필드 검증
- 참여자별 상태 관리

---

### 4. E2E 04: 모임 시작 (Start Meeting)

**테스트 파일**: `playwright/tests/04-start-meeting.spec.ts`

**사용자 흐름**:
1. 호스트가 "모임 시작하기" 클릭
2. Session 생성 확인
3. STEP 1 페이지로 리다이렉트
4. URL에 sessionId 포함 확인

**테스트 케이스** (5개):
- `should start meeting and navigate to STEP 1`
- `should display current step information`
- `should only allow host to start meeting`
- `should maintain session state across page reload`
- `should display progress information`

**주요 검증**:
- Session ID 생성 및 저장
- STEP 1 내비게이션
- 호스트 권한 확인
- 세션 상태 유지

---

### 5. E2E 05: STEP 진행 (Steps Progression)

**테스트 파일**: `playwright/tests/05-steps-progression.spec.ts`

**사용자 흐름**:
1. STEP 1: 문장 공개 → 작성자 공개
2. "다음 문장" 클릭으로 문장 진행
3. STEP 2 진입: 질문 공개
4. 타이머 동작 확인
5. "다음 질문" 클릭으로 질문 진행
6. STEP 3 진입: 적용점 공개
7. "다음 참여자" 클릭으로 참여자 진행

**테스트 케이스** (5개):
- `should progress from STEP 1 to STEP 2`
- `should display timer on STEP 2`
- `should progress to STEP 3 and display takeaways`
- `should allow navigation back within steps`
- `should track current sentence/question position`

**주요 검증**:
- STEP 간 진행
- 타이머 표시
- 뒤로가기 기능
- 위치 추적

---

### 6. E2E 06: 모임 종료 (End Meeting)

**테스트 파일**: `playwright/tests/06-end-meeting.spec.ts`

**사용자 흐름**:
1. STEP 3 완료
2. "모임 종료" 클릭
3. 모임 종료 화면 표시
4. "독서모임방으로 돌아가기" 클릭
5. 모임방 복귀 확인
6. Meeting 상태 "완료" 표시 확인

**테스트 케이스** (4개):
- `should end meeting and return to bookclub room`
- `should display completion message`
- `should update meeting status to completed`
- `should allow all participants to see meeting completion`

**주요 검증**:
- 모임 종료 화면 표시
- 상태 업데이트
- 다중 참여자 동기화

---

### 7. E2E 07: 새 회차 생성 (New Session)

**테스트 파일**: `playwright/tests/07-new-session.spec.ts`

**사용자 흐름**:
1. 모임방에서 "+ 새 모임 만들기" 클릭
2. 책 제목, 날짜 입력
3. "새 회차 만들기" 클릭
4. 새 회차 모임방 진입
5. 기존 참여자 확인
6. 지난 회차 목록 확인

**테스트 케이스** (4개):
- `should create new session and maintain existing members`
- `should display past sessions list`
- `should only allow host to create new session`
- `should reset reading records for new session`

**주요 검증**:
- 새 회차 생성 기능
- 참여자 유지
- 지난 회차 조회
- 호스트 권한 확인

---

## App 헬퍼 클래스

`playwright/fixtures/app.ts`에 구현된 고수준 메서드들:

```typescript
class App {
  // 페이지 네비게이션
  async gotoHome()
  
  // 독서모임 생성
  async createBookClub(clubName, nickname, bookTitle, meetingDate?)
  
  // 초대 코드 추출
  async getInviteCode(): Promise<string>
  
  // 독서모임 참여
  async joinBookClub(bookClubId, inviteCode, nickname)
  
  // 독서 기록 작성
  async writeReadingRecord(sentence, question, application)
  
  // 모임 시작
  async startMeeting(): Promise<{ sessionId: string }>
  
  // STEP 진행
  async nextSentence()
  async revealAuthor()
  async nextQuestion()
  async nextTakeaway()
  
  // 모임 종료
  async endMeeting()
  async returnToBookClubRoom(bookClubId)
  
  // 새 회차 생성
  async createNewSession(bookTitle, meetingDate?)
  
  // 검증 유틸리티
  async expectToSee(text: string)
  async expectURL(pattern: RegExp | string)
  getCurrentURL(): string
  getPage(): Page
}
```

## NPM Scripts

`package.json`에 추가된 E2E 테스트 스크립트:

```json
{
  "e2e": "playwright test",              // 모든 테스트 실행
  "e2e:ui": "playwright test --ui",      // UI 모드 (대화형)
  "e2e:debug": "playwright test --debug", // 디버그 모드
  "e2e:headed": "playwright test --headed", // 브라우저 보이기
  "e2e:report": "playwright show-report"  // HTML 리포트 보기
}
```

## 테스트 실행 방법

### 모든 E2E 테스트 실행
```bash
npm run e2e
```

### 특정 테스트만 실행
```bash
npx playwright test 01-create-bookclub
npx playwright test 01-create-bookclub -g "should create"
```

### UI 모드 (권장: 개발/디버깅)
```bash
npm run e2e:ui
```

### 디버그 모드
```bash
npm run e2e:debug
```

### 헤드 모드 (브라우저 시각화)
```bash
npm run e2e:headed
```

### 리포트 보기
```bash
npm run e2e:report
```

## 테스트 통계

### 총 테스트 수: 28개

| E2E 번호 | 테스트명 | 테스트 수 |
|---------|--------|---------|
| 01 | Create Bookclub | 3 |
| 02 | Participant Join | 3 |
| 03 | Reading Record | 4 |
| 04 | Start Meeting | 5 |
| 05 | Steps Progression | 5 |
| 06 | End Meeting | 4 |
| 07 | New Session | 4 |
| **합계** | | **28** |

## 예상 실행 시간

- **개별 테스트**: 30-60초
- **전체 스위트 (7개 E2E)**: 4-7분
- **UI 모드**: 사용자 상호작용에 따라 가변

## 주요 설정 사항

### 순차 실행 (Sequential)
```typescript
fullyParallel: false  // 테스트 간 데이터 의존성 제거
```

### 환경별 설정
```typescript
// 로컬 개발
retries: 0
workers: 1

// CI/CD
CI=true npm run e2e
retries: 2
workers: 1
```

### 자동 서버 시작
```typescript
webServer: {
  command: 'npm run dev',
  port: 3000,
  reuseExistingServer: !process.env.CI
}
```

## 테스트 설계 원칙

### 1. 사용자 중심 (User-Centric)
- 실제 사용자 흐름을 따름
- 내부 구현이 아닌 사용자 행동 테스트

### 2. 안정성 (Stability)
- 명확한 대기 (waitForLoadState, waitForURL)
- 안정적인 셀렉터 (텍스트 기반)
- 재시도 로직 포함

### 3. 유지보수성 (Maintainability)
- App 헬퍼 클래스로 추상화
- 명확한 테스트 이름
- 코드 재사용

### 4. 독립성 (Independence)
- 각 테스트는 독립적으로 실행
- 이전 테스트 결과에 의존하지 않음

## 브라우저 지원

- **Chrome (Chromium)**: ✅ (기본)
- Firefox, Safari: 필요시 추가 가능

## 디버깅 팁

### 1. 화면 캡처
```typescript
await page.screenshot({ path: 'debug.png' });
```

### 2. 페이지 멈추기
```typescript
await page.pause();
```

### 3. 요소 수 확인
```typescript
const count = await page.locator('selector').count();
```

### 4. 콘솔 로그
```typescript
await page.evaluate(() => console.log(document.body.innerHTML));
```

## 트러블슈팅

| 문제 | 해결방법 |
|------|--------|
| 테스트 타임아웃 | `page.waitForLoadState('networkidle')` 추가 |
| 요소를 찾지 못함 | `--headed` 모드로 실제 페이지 확인 |
| 플레이키 테스트 | 명확한 대기 조건 추가 |
| 네비게이션 실패 | URL 패턴 검증, 리다이렉트 확인 |

## 다음 단계

1. **로컬 테스트**: `npm run e2e:ui`로 테스트 실행 및 디버깅
2. **CI/CD 통합**: GitHub Actions 등에 추가
3. **커버리지 확장**: 추가 E2E 테스트 작성
4. **성능 최적화**: 병렬 실행 고려 (데이터 격리 후)
5. **문서 유지**: 새 기능 추가 시 테스트 함께 추가

## 참고 자료

- [Playwright 공식 문서](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-test)

## 변경 사항 요약

### 생성된 파일
- `/playwright/playwright.config.ts`
- `/playwright/fixtures/app.ts`
- `/playwright/tests/01-create-bookclub.spec.ts`
- `/playwright/tests/02-participant-join.spec.ts`
- `/playwright/tests/03-reading-record.spec.ts`
- `/playwright/tests/04-start-meeting.spec.ts`
- `/playwright/tests/05-steps-progression.spec.ts`
- `/playwright/tests/06-end-meeting.spec.ts`
- `/playwright/tests/07-new-session.spec.ts`
- `/playwright/README.md`
- `/docs/17-E2E-PLAYWRIGHT-SETUP.md` (이 파일)

### 수정된 파일
- `/package.json` - E2E 테스트 스크립트 추가

## 완료 체크리스트

- [x] Playwright 설치
- [x] 프로젝트 구조 설정
- [x] playwright.config.ts 설정
- [x] App 헬퍼 클래스 구현
- [x] 7개 E2E 테스트 구현 (28개 테스트 케이스)
- [x] npm scripts 추가
- [x] 테스트 리스트 확인 (28개 인식됨)
- [x] 문서 작성 (playwright/README.md, docs/17-E2E-PLAYWRIGHT-SETUP.md)
