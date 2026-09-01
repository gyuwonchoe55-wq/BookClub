---
name: frontend-resolver
description: BookClub 프로젝트의 화면, 사용자 흐름, 반응형 UI 관련 Task를 실행하는 Skill
arguments: TASK_NUMBER
disable-model-invocation: true
---

# 역할

너는 BookClub 프로젝트의 프론트엔드 작업을 수행하는 실행 담당자다.

사용자가 TASK_NUMBER를 입력하면 `docs/8-PLAN.md`의 해당 Task만 확인하고 작업한다.

이 프로젝트는 1주 MVP를 목표로 한다.

항상 가장 단순하고 명확한 UI 구현을 우선한다.

---

# 작업 범위

이 Skill은 주로 다음 Task에서 사용한다.

- TASK 05 공통 UI 기반
- TASK 06 독서모임 생성
- TASK 07 독서모임 참여
- TASK 08 독서모임방
- TASK 09 독서 기록
- TASK 11 STEP 1
- TASK 12 STEP 2
- TASK 13 STEP 3 / 종료
- TASK 14 새 회차 / 지난 회차
- TASK 15 반응형 / UI 점검

---

# 실행 절차

## 1. Task 확인

`docs/8-PLAN.md`에서 `${TASK_NUMBER}`에 해당하는 Task만 읽는다.

Task에 명시된 관련 문서만 추가로 읽는다.

예:

화면 구현:

- `4-SCREEN-FLOW.md`
- `5-FEATURE-SPEC.md`
- `6-WIREFRAME.md`
- `7-STYLE.md`

필요 없는 문서는 읽지 않는다.

---

## 2. 기존 UI 확인

관련 화면과 컴포넌트만 확인한다.

예:

- 관련 `app/` route
- 관련 `components/`
- 관련 `lib/`
- 관련 타입

전체 프로젝트를 반복해서 읽지 않는다.

---

## 3. 구현 계획 작성

구현 전에 최대 5개 항목으로 짧게 계획을 작성한다.

예:

1. 화면 구조 확인
2. 기존 컴포넌트 재사용
3. 모바일 기준 구현
4. PC 반응형 적용
5. 완료 조건 검증

---

## 4. Agent 사용

기본적으로:

`frontend-developer`

를 사용한다.

다음 경우에만 추가 Agent를 사용한다.

### UI 구조 검토

`ui-designer`

### 데이터 연결 이슈

`backend-developer`

### 실제 오류

`debugger`

### 최종 QA 단계

`qa-expert`

같은 문제를 여러 Agent에게 중복 검토시키지 않는다.

---

## 5. UI 구현 원칙

반드시 `CLAUDE.md`와 `docs/7-STYLE.md` 규칙을 따른다.

절대 금지:

- 컬러 사용
- border-radius
- rounded 계열 Tailwind class
- 그림자
- gradient
- pill UI
- 장식 목적의 요소

정보 위계는 다음으로 표현한다.

- 여백
- 타이포그래피
- 선
- 굵기
- 크기

---

## 6. 반응형 원칙

모바일과 PC 모두 지원한다.

### Mobile

- 1열 우선
- 핵심 행동 우선
- 터치 가능한 버튼 크기

### PC

- 콘텐츠 최대 너비 제한
- 넓은 화면을 억지로 채우지 않는다.
- 필요한 경우만 2열 구성

모바일과 PC에 별도 기능을 만들지 않는다.

---

## 7. 구현

Task 완료에 필요한 UI만 수정한다.

원칙:

- 기존 컴포넌트 재사용
- 불필요한 상태 추가 금지
- 불필요한 라이브러리 설치 금지
- 관련 없는 리팩토링 금지
- 새로운 화면을 임의로 추가하지 않는다.

---

## 8. 검증

Task 단위로 다음만 확인한다.

- TypeScript 오류
- lint
- 해당 화면 렌더링
- 핵심 버튼 동작
- 모바일 / PC 기본 반응형

전체 E2E는 마지막 단계에서만 수행한다.

---

## 9. 실패 처리

문제가 발생하면:

1. 관련 파일만 확인
2. 최소 수정
3. 필요한 경우 `debugger` 호출
4. 해당 기능만 재검증

---

## 10. 완료 처리

Task의 완료 조건을 모두 확인한 뒤에만 완료 처리한다.

완료 후 `docs/8-PLAN.md`의 해당 체크박스를 업데이트한다.

다음 Task로 자동 이동하지 않는다.

---

# 응답 형식

```text
TASK ${TASK_NUMBER} 완료

변경:
- ...
- ...

검증:
- TypeScript PASS
- lint PASS
- 화면 동작 PASS

남은 문제:
- 없음

다음 Task:
TASK XX
```

변경되지 않은 코드나 문서를 다시 출력하지 않는다.

---

# 절대 규칙

- 전체 docs를 매번 읽지 않는다.
- 전체 코드베이스를 매번 읽지 않는다.
- 필요한 Agent만 호출한다.
- 다음 Task로 자동 진행하지 않는다.
- MVP 범위를 넘는 기능을 추가하지 않는다.
- `7-STYLE.md`를 위반하지 않는다.
  Task 수행에 꼭 필요한 산출물 외 추가 문서 생성 금지
