# 개발 실행 계획서 (8-PLAN.md)

## 1. 문서 목적

이 문서는 독서모임 진행 서비스 MVP를 실제로 구축하기 위한 작업 순서와 완료 조건을 정의한다.

Claude Code는 각 Task를 순서대로 수행하며,
각 Task의 완료 조건을 충족한 경우에만 다음 Task로 이동한다.

프로젝트는 1주 내 MVP 완성을 목표로 하므로
불필요한 아키텍처, 패키지, 추상화, 테스트를 추가하지 않는다.

---

# 2. 기본 기술 구성

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- npm
- Vercel
- Playwright (E2E 단계에서만 설치)

별도의 Express/NestJS 백엔드는 만들지 않는다.

---

# 3. 기준 문서

전체 기준 문서:

- `1-PRD.md`
- `2-DOMAIN.md`
- `3-ERD.md`
- `4-SCREEN-FLOW.md`
- `5-FEATURE-SPEC.md`
- `6-WIREFRAME.md`
- `7-STYLE.md`
- `CLAUDE.md`

단, 모든 Task에서 위 문서를 전부 읽지 않는다.

각 Task에 명시된 문서만 읽는다.

---

# 4. Claude Code 토큰 절약 원칙

## 4.1 필요한 문서만 읽기

Task 수행 시 관련 문서만 읽는다.

예:

DB 작업

→ `2-DOMAIN.md`
→ `3-ERD.md`

UI 작업

→ `4-SCREEN-FLOW.md`
→ `6-WIREFRAME.md`
→ `7-STYLE.md`

모든 문서를 반복해서 읽지 않는다.

---

## 4.2 Agent 최소 호출

하나의 Task에 필요한 Agent만 호출한다.

같은 문제를 여러 Agent에게 중복 검토시키지 않는다.

예:

DB 설계
→ database-optimizer

화면 구현
→ frontend-developer

버그 발생
→ debugger

정상 작업에 debugger를 미리 호출하지 않는다.

---

## 4.3 전체 코드베이스 반복 분석 금지

Task 시작 시 전체 프로젝트를 매번 다시 분석하지 않는다.

우선 다음만 확인한다.

- 관련 파일
- 관련 git diff
- 관련 문서

필요할 때만 범위를 확장한다.

---

## 4.4 작은 Task 단위로 작업

한 번에 여러 화면이나 여러 도메인을 구현하지 않는다.

하나의 사용자 행동이 완성되는 단위로 구현한다.

---

## 4.5 테스트도 단계적으로 수행

개별 Task:

- 관련 기능 테스트
- TypeScript
- lint

주요 Milestone:

- 전체 build

마지막:

- E2E 전체 수행

매 Task마다 전체 E2E를 실행하지 않는다.

---

## 4.6 구현 완료 후 문서 재작성 금지

기능 변경이 없다면 기존 설계문서를 다시 작성하지 않는다.

실제 설계가 변경된 경우에만 관련 문서를 수정한다.

---

# 5. Agent 사용 기준

| Agent                | 사용 시점                               |
| -------------------- | --------------------------------------- |
| architect            | 초기 구조 또는 큰 구조 변경             |
| database-optimizer   | DB Schema / Query / RLS                 |
| backend-developer    | Supabase 데이터 처리 및 서버 로직       |
| frontend-developer   | 화면 및 사용자 인터랙션 구현            |
| ui-designer          | 공통 UI 구조 및 최종 UI 검토            |
| security-auditor     | RLS 및 데이터 접근 보안 검토            |
| qa-expert            | 주요 기능 및 E2E 테스트                 |
| debugger             | 실제 오류 발생 시                       |
| performance-engineer | MVP에서는 기본적으로 사용하지 않음      |
| api-designer         | 별도 REST API가 필요해질 경우에만 사용  |
| fullstack-developer  | 여러 영역이 강하게 얽힌 문제에서만 사용 |

---

# 6. 개발 Task

---

# TASK 00. 프로젝트 기본 상태 확인

## 목적

실제 개발 전에 현재 환경이 정상인지 확인한다.

## 참고 문서

- `CLAUDE.md`
- `7-STYLE.md`

## Agent

- architect 필요 시 1회만 사용

## 작업

- [x] Next.js 정상 실행 확인
- [x] TypeScript 확인
- [x] Tailwind CSS 확인
- [x] Supabase 패키지 설치 확인
- [x] `.env.local` 존재 확인
- [x] `utils/supabase/client.ts` 확인
- [x] `.gitignore`에서 `.env*` 제외 확인
- [x] 현재 Git 상태 확인

## 완료 조건

- [x] `npm run dev` 정상 실행
- [x] 현재 환경에 치명적인 설정 오류 없음

## 종료 지점

환경만 확인한다.

기능 구현은 하지 않는다.

---

# TASK 01. Supabase DB 구축

## 목적

ERD를 실제 Supabase PostgreSQL Schema로 구현한다.

## 참고 문서

- `2-DOMAIN.md`
- `3-ERD.md`

## Agent

- database-optimizer

## 작업

ERD를 기준으로 필요한 테이블을 생성한다.

예상 핵심 테이블:

- book_clubs
- meetings
- members
- reading_records
- sessions

필요한 항목:

- [x] Primary Key
- [x] Foreign Key
- [x] NOT NULL
- [x] Unique Constraint
- [x] 생성일시
- [x] 상태값
- [x] 관계 설정

특히 다음 규칙을 DB에서 보장한다.

- [x] 하나의 독서모임은 여러 회차를 가진다.
- [x] 하나의 독서모임은 여러 참여자를 가진다.
- [x] 한 참여자는 하나의 회차에 독서 기록 하나만 가진다.
- [x] 하나의 회차는 진행 세션 하나만 가진다.

## 산출물

가능하면 SQL migration 형태로 보관한다.

예:

`supabase/schema.sql`

또는

`supabase/migrations/`

## 완료 조건

- [ ] Schema migration 파일 생성
- [ ] Supabase MCP를 통해 실제 프로젝트 DB에 migration 적용
- [ ] book_club 테이블 존재 확인
- [ ] member 테이블 존재 확인
- [ ] meeting 테이블 존재 확인
- [ ] reading_record 테이블 존재 확인
- [ ] session 테이블 존재 확인
- [ ] Primary Key / Foreign Key / Unique Constraint 정상 적용 확인
- [ ] 실제 Supabase DB 반영 검증 완료

SQL 파일 생성만으로는 완료 처리하지 않는다.

---

# TASK 02. RLS 및 DB 접근 정책 설정

## 목적

브라우저에서 필요한 데이터만 안전하게 읽고 쓸 수 있도록 한다.

## 참고 문서

- `2-DOMAIN.md`
- `3-ERD.md`
- `5-FEATURE-SPEC.md`

## Agent

- security-auditor
- database-optimizer는 필요한 경우만

## 선행 조건

- TASK 01이 파일 기준이 아니라 실제 Supabase DB 기준으로 완료되어 있어야 한다.

## 작업

- [x] 각 테이블 RLS 활성화
- [x] MVP에 필요한 SELECT 정책 작성
- [x] INSERT 정책 작성
- [x] UPDATE 정책 작성
- [x] 불필요한 DELETE 허용 금지

회원가입/로그인이 없는 MVP 구조임을 고려해
가장 단순한 정책을 사용한다.

과도하게 복잡한 인증 체계를 만들지 않는다.

## 완료 조건

- [ ] RLS migration 파일 생성
- [ ] TASK 01 Schema가 실제 Supabase DB에 적용되어 있는지 선행 확인
- [ ] Supabase MCP를 통해 RLS migration 실제 적용
- [ ] 모든 대상 테이블의 RLS 활성화 확인
- [ ] RLS Policy 존재 여부 확인
- [ ] SECURITY DEFINER Helper Function 존재 확인
- [ ] RPC Function 존재 확인
- [ ] authenticated 사용자 권한 정상 확인
- [ ] Anonymous Auth 기반 auth.uid() 접근 구조 정상 확인
- [ ] Reading Record의 소유권 및 Meeting 관계 검증 정상
- [ ] DELETE 제한 정상 확인
- [ ] 실제 Supabase DB 반영 검증 완료

migration 파일 생성만으로는 완료 처리하지 않는다.

---

# TASK 03. Supabase Data Layer 구축

## 목적

컴포넌트에서 Supabase를 직접 제각각 호출하지 않도록 최소한의 데이터 접근 구조를 만든다.

## 참고 문서

- `3-ERD.md`
- `5-FEATURE-SPEC.md`

## Agent

- backend-developer

## 작업

예상 구조:

```text
utils/
└── supabase/
    └── client.ts

lib/
├── book-clubs.ts
├── meetings.ts
├── members.ts
└── reading-records.ts
```

필요 기능:

- [ ] 독서모임 생성
- [ ] 독서모임 조회
- [ ] 참여자 생성
- [ ] 참여자 조회
- [ ] 회차 생성
- [ ] 회차 조회
- [ ] 독서 기록 저장
- [ ] 독서 기록 수정
- [ ] 진행 상태 저장

## 원칙

과도한 Repository / Service 구조를 만들지 않는다.

## 완료 조건

- [x] Supabase에서 실제 데이터 INSERT/SELECT 성공
- [x] TypeScript 오류 없음

---

# TASK 04. 사용자 식별 방식 구현

## 목적

회원가입/로그인 UI 없이도 사용자를 안전하게 식별하고,
각 사용자가 자신의 Member 및 독서 기록에 접근할 수 있도록 한다.

## 참고 문서

- `5-FEATURE-SPEC.md`
- `2-DOMAIN.md`
- `3-ERD.md`

## Agent

- backend-developer

필요한 경우:

- security-auditor

## MVP 방식

사용자에게 별도의 회원가입/로그인 절차를 제공하지 않는다.

대신 사용자가 처음 서비스를 이용할 때
Supabase Anonymous Auth를 사용해 익명 사용자를 자동 생성한다.

Supabase가 발급한 `auth.uid()`를
`member.user_id`와 연결하여 사용자를 식별한다.

사용자 경험은 다음과 같다.

````text
서비스 접속
↓
내부적으로 Anonymous Auth 생성
↓
사용자는 별명만 입력
↓
Member 생성
↓
member.user_id = auth.uid()

## 완료 조건

- [x] TypeScript 오류 없음
- [x] useAuth hook에서 auth.uid() 획득 가능
- [x] localStorage 연동 정상
- [x] createClient()로 현재 사용자 확인 가능

---

# TASK 05. 공통 UI 기반 구축

## 목적

화면 개발 전에 최소한의 공통 스타일과 레이아웃을 구현한다.

## 참고 문서

- `6-WIREFRAME.md`
- `7-STYLE.md`

## Agent

- ui-designer
- frontend-developer

ui-designer는 전체 방향 검토 1회만 수행한다.

## 작업

- [x] 공통 Layout
- [x] 콘텐츠 최대 너비
- [x] 모바일/PC 반응형 구조
- [x] Button
- [x] Input
- [x] Textarea

## 절대 규칙

- [x] 컬러 사용 금지
- [x] border-radius 사용 금지
- [x] 그림자 금지
- [x] Gradient 금지
- [x] Pill UI 금지
- [x] 장식용 UI 금지

## 완료 조건

- [x] 공통 UI가 모바일/PC에서 정상 표시
- [x] `7-STYLE.md` 규칙 준수

---

# TASK 06. 독서모임 생성

## 기능

F01

## 관련 화면

S01 / S02

## 참고 문서

- `4-SCREEN-FLOW.md`
- `5-FEATURE-SPEC.md`
- `6-WIREFRAME.md`
- `7-STYLE.md`

## Agent

- frontend-developer
- backend-developer는 데이터 처리 문제가 있을 때만

## 작업

- [x] 랜딩 화면
- [x] 독서모임 생성 화면
- [x] 모임명 입력
- [x] 모임장 별명 입력
- [x] 첫 책 제목 입력
- [x] 모임 날짜 입력
- [x] Book Club 생성
- [x] Host Member 생성
- [x] 첫 Meeting 생성
- [x] memberId 저장
- [x] 생성 성공 후 독서모임방 이동

## 완료 조건

사용자가

```text
랜딩
→ 모임 생성
→ 독서모임방
````

까지 정상 이동한다. ✅

---

# TASK 07. 독서모임 참여

## 기능

F03 / F04

## 관련 화면

S03 / S04

## 참고 문서

- `4-SCREEN-FLOW.md`
- `5-FEATURE-SPEC.md`
- `6-WIREFRAME.md`

## Agent

- frontend-developer

## 작업

- [x] 독서모임 참여 URL 구현
- [x] 참여 화면
- [x] 모임 기본정보 표시
- [x] 별명 입력
- [x] Member 생성
- [x] memberId 저장
- [x] 참여 완료 후 독서모임방 이동

## 완료 조건

새 브라우저에서 초대 링크를 열어 독서모임에 정상 참여할 수 있다. ✅

---

# TASK 08. 독서모임방 구축

## 기능

F02 / F03

## 관련 화면

S03

## 중요도

최우선 핵심 화면

## 참고 문서

- `4-SCREEN-FLOW.md`
- `5-FEATURE-SPEC.md`
- `6-WIREFRAME.md`
- `7-STYLE.md`

## Agent

- frontend-developer

## 작업

- [x] 모임명 표시
- [x] 현재 회차 표시
- [x] 참여자 목록
- [x] 모임장 표시
- [x] 독서 기록 작성 여부
- [x] 참여 링크 복사
- [x] 독서 기록 작성 진입
- [x] 모임장 전용 모임 시작 버튼
- [x] 새 회차 생성 진입

## 완료 조건

사용자가 독서모임방만 보고

- 현재 회차
- 참여자
- 자신의 기록 상태
- 다음 행동

을 이해할 수 있다. ✅

---

# TASK 09. 독서 기록 작성/수정

## 기능

F05

## 관련 화면

S05

## 참고 문서

- `5-FEATURE-SPEC.md`
- `6-WIREFRAME.md`
- `7-STYLE.md`

## Agent

- frontend-developer

## 작업

- [x] 인상 깊은 문장
- [x] 이야기하고 싶은 질문
- [x] 적용점 또는 기억할 한 가지
- [x] 저장
- [x] 기존 기록 조회
- [x] 수정
- [x] 모임방의 작성 상태 반영

## 완료 조건

- [x] 회차별 기록 저장 성공
- [x] 새로고침 후 유지
- [x] 수정 성공

---

# TASK 10. 모임 시작 및 진행 세션

## 기능

F06

## 참고 문서

- `2-DOMAIN.md`
- `5-FEATURE-SPEC.md`

## Agent

- backend-developer
- frontend-developer

## 작업

- [x] 모임장만 시작 가능 (TASK 02 migration: start_meeting RPC)
- [x] Session 생성 (TASK 02 migration: start_meeting RPC)
- [x] Meeting 상태를 진행 중으로 변경 (TASK 02 migration: start_meeting RPC)
- [x] 기록 수정 차단 (TASK 02 migration: RLS 정책 status='scheduled')
- [x] STEP 1 진입 (TASK 02 migration: session.current_step='icebreaker')
- [x] Session 진행 상태 업데이트 함수 (TASK 10~13: update_session_step, advance_question 등)

## DB 지원

TASK 02 migration에서 start_meeting(meeting_id) RPC 제공:

- [x] 호스트만 호출 가능
- [x] meeting status → 'in_progress'
- [x] session 생성 (current_step = 'icebreaker')
- [x] reading_record 수정 자동 차단

TASK 10~13에서 구현:

- [x] update_session_step() - 현재 STEP 변경
- [x] advance_question() - 다음 질문으로 이동
- [x] update_remaining_time() - 남은 시간 업데이트 등

## 완료 조건

모임 시작 버튼 클릭 후 모든 참여자가 진행 상태를 확인할 수 있다. ✅

---

# TASK 11. STEP 1 아이스브레이킹

## 기능

F07

## 관련 화면

S06-1

## 참고 문서

- `5-FEATURE-SPEC.md`
- `6-WIREFRAME.md`
- `7-STYLE.md`

## Agent

- frontend-developer

## 작업

- [x] 인상 깊은 문장 순서 구성
- [x] 작성자 숨김
- [x] 작성자 공개
- [x] 다음 문장
- [x] 현재 번호 / 전체 개수
- [x] 진행률
- [x] 완료 후 STEP 2 이동

## 완료 조건

모든 독서 기록의 문장을 순차적으로 진행할 수 있다. ✅

---

# TASK 12. STEP 2 발제문 토론

## 기능

F08

## 관련 화면

S06-2

## Agent

- frontend-developer

## 작업

- [x] 질문 순차 표시
- [x] 질문 작성자 표시
- [x] 질문 번호
- [x] 타이머
- [x] 다음 질문
- [x] STEP 진행 상태 저장
- [x] 완료 후 STEP 3 이동

## 완료 조건

모든 질문을 순차적으로 진행할 수 있다. ✅

---

# TASK 13. STEP 3 마무리 및 모임 종료

## 기능

F09 / F10

## 관련 화면

S06-3 / S07

## Agent

- frontend-developer

## 작업

- [x] 참여자별 마무리 기록 표시
- [x] 다음 참여자 이동
- [x] 모든 참여자 완료 처리
- [x] Meeting 완료 상태 변경
- [x] Session 종료
- [x] 종료 화면
- [x] 독서모임방 복귀

## 완료 조건

전체 모임 흐름이 처음부터 끝까지 정상 완료된다. ✅

---

# TASK 14. 새 회차 및 지난 회차

## 기능

F11 / F12

## 관련 화면

S03 / S08

## Agent

- frontend-developer

## 작업

- [x] 새 회차 생성
- [x] 책 제목 입력
- [x] 모임 날짜
- [x] 새 회차를 현재 회차로 표시
- [x] 기존 Member 유지
- [x] 지난 회차 목록 표시

## 완료 조건

같은 독서모임에서 두 번째 회차를 생성할 수 있다. ✅

---

# TASK 15. 반응형 및 UI 최종 점검

## 목적

모바일과 PC에서 실제 사용 가능한지 확인한다.

## 참고 문서

- `6-WIREFRAME.md`
- `7-STYLE.md`

## Agent

- ui-designer
- frontend-developer

## 작업

Mobile:

- [x] 주요 화면 1열
- [x] 버튼 터치 영역
- [x] 긴 텍스트 처리
- [x] 진행 화면 가독성

PC:

- [x] 콘텐츠 최대 너비
- [x] 불필요하게 화면을 채우지 않음
- [x] 필요한 경우 2열 구성

Style:

- [x] 컬러 없음
- [x] 라운드 없음
- [x] 그림자 없음
- [x] 과도한 UI 없음

## 완료 조건

모바일 / PC 핵심 흐름 정상 사용 가능 ✅

---

# TASK 16. 핵심 기능 통합 테스트

## Agent

- qa-expert

## 테스트 시나리오

### Scenario A

```text
모임장
→ 독서모임 생성
→ 첫 회차 생성
→ 독서모임방
→ 링크 복사
```

### Scenario B

```text
참여자
→ 링크 접속
→ 별명 입력
→ 참여
→ 독서 기록 작성
```

### Scenario C

```text
모임장
→ 기록 작성
→ 모임 시작
→ STEP1
→ STEP2
→ STEP3
→ 종료
```

### Scenario D

```text
종료
→ 새 회차 생성
→ 기존 참여자 유지
→ 새 기록 작성
```

## 완료 조건

- [x] 주요 기능 오류 없음
- [x] TypeScript 오류 없음
- [x] lint 통과
- [x] `npm run build` 성공

---

# TASK 17. Playwright E2E 구축

## 목적

실제 사용자 행동 기준으로 핵심 흐름을 자동 검증한다.

## Agent

- qa-expert

## 작업

이 단계에서만 Playwright를 설치한다.

필수 E2E:

- [x] 독서모임 생성
- [x] 참여자 참여
- [x] 독서 기록 작성
- [x] 모임 시작
- [x] STEP 1 → STEP 2 → STEP 3
- [x] 모임 종료
- [x] 새 회차 생성

모든 세부 UI를 테스트하지 않는다.

서비스 핵심 사용자 흐름만 자동화한다.

## 완료 조건

핵심 E2E Scenario 전체 PASS ✅

---

# TASK 18. 최종 오류 수정

## Agent

오류가 있는 경우에만:

- debugger

## 작업

- [ ] E2E 실패 수정
- [ ] Console 오류 확인
- [ ] Supabase 오류 확인
- [ ] 반응형 주요 오류 수정

새 기능을 추가하지 않는다.

## 완료 조건

- [ ] 모든 핵심 E2E PASS
- [ ] Build PASS
- [ ] 주요 Console Error 없음

---

# TASK 19. 배포 준비 및 Vercel 배포

## 작업

- [ ] Git 상태 확인
- [ ] GitHub Push
- [ ] Vercel 연결
- [ ] Supabase 환경변수 등록
- [ ] Production Build
- [ ] 실제 배포 URL 확인

## 배포 후 Smoke Test

- [ ] 랜딩
- [ ] 모임 생성
- [ ] 참여
- [ ] 기록
- [ ] 진행
- [ ] 종료

## 완료 조건

실제 외부 URL에서 핵심 시나리오 정상 작동

---

# 7. 개발 Milestone

## Milestone 1 — 데이터 기반

TASK 00 ~ 04

완료 기준:

- Supabase 연결
- DB 구축
- 기본 데이터 처리
- 사용자 식별 가능

---

## Milestone 2 — 핵심 모임 준비 경험

TASK 05 ~ 09

완료 기준:

```text
독서모임 생성
→ 참여
→ 독서모임방
→ 독서 기록
```

완성

---

## Milestone 3 — 핵심 가치 구현

TASK 10 ~ 13

완료 기준:

```text
모임 시작
→ STEP 1
→ STEP 2
→ STEP 3
→ 종료
```

완성

이 Milestone이 MVP에서 가장 중요하다.

---

## Milestone 4 — 반복 사용

TASK 14

완료 기준:

```text
첫 회차 종료
→ 다음 회차 생성
```

가능

---

## Milestone 5 — 품질 및 배포

TASK 15 ~ 19

완료 기준:

- 모바일/PC
- Build
- E2E
- Production 배포

완료

---

# 8. Claude 실행 규칙

각 Task를 시작할 때 다음 순서를 따른다.

1. `8-PLAN.md`에서 해당 Task만 읽는다.
2. Task에 명시된 관련 문서만 읽는다.
3. 관련 코드만 확인한다.
4. 구현 계획을 짧게 작성한다.
5. 필요한 Agent만 호출한다.
6. 구현한다.
7. 해당 Task에 필요한 테스트만 수행한다.
8. 완료 조건을 확인한다.
9. `8-PLAN.md`의 완료 체크박스를 업데이트한다.
10. 다음 Task로 자동 이동하지 않는다.

사용자의 요청 없이 여러 Task를 한 번에 진행하지 않는다.

---

# 9. Task 완료 보고 형식

Claude는 Task 완료 후 길게 설명하지 않는다.

다음 형식으로 보고한다.

```text
TASK XX 완료

변경:
- ...
- ...

검증:
- TypeScript PASS
- lint PASS
- 관련 기능 PASS

남은 문제:
- 없음

다음 Task:
TASK XX
```

토큰 절약을 위해 변경되지 않은 코드나 문서를 다시 출력하지 않는다.

---

# 10. 최종 MVP 완료 조건

다음 사용자 흐름이 실제 배포 환경에서 동작하면 MVP를 완료한 것으로 본다.

```text
모임장이 독서모임 생성
↓
첫 회차 생성
↓
독서모임방 진입
↓
초대 링크 공유
↓
참여자 참여
↓
모든 참여자 독서 기록 작성
↓
모임 시작
↓
STEP 1 아이스브레이킹
↓
STEP 2 발제문 토론
↓
STEP 3 마무리
↓
모임 종료
↓
독서모임방 복귀
↓
새 회차 생성
```

다음은 MVP 완료 조건에 포함하지 않는다.

- AI
- 추천
- 통계
- 프로필
- 커뮤니티
- 알림
- 랭킹
- 복잡한 인증
- 고급 애니메이션
- 고도화된 성능 최적화
