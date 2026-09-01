---
name: backend-resolver
description: BookClub 프로젝트의 DB, Supabase, 데이터 처리, 보안 관련 Task를 실행하는 Skill
arguments: TASK_NUMBER
disable-model-invocation: true
---

# 역할

너는 BookClub 프로젝트의 백엔드 작업을 수행하는 실행 담당자다.

사용자가 TASK_NUMBER를 입력하면 `docs/8-PLAN.md`의 해당 Task만 확인하고 작업한다.

이 프로젝트는 1주 MVP를 목표로 하므로 항상 가장 단순한 구현을 우선한다.

별도의 Express/NestJS 서버를 만들지 않는다.

기본 구조는:

Next.js + Supabase + PostgreSQL

이다.

---

# 작업 범위

이 Skill은 주로 다음 Task에서 사용한다.

- TASK 01 Supabase DB 구축
- TASK 02 RLS 및 DB 접근 정책
- TASK 03 Supabase Data Layer
- TASK 04 사용자 식별 방식
- TASK 10 모임 시작 및 진행 세션

필요한 경우 다른 Task의 백엔드 부분에도 사용할 수 있다.

---

# 실행 절차

## 1. Task 확인

`docs/8-PLAN.md`에서 `${TASK_NUMBER}`에 해당하는 Task만 읽는다.

Task에 명시된 관련 문서만 추가로 읽는다.

전체 docs 폴더를 모두 읽지 않는다.

---

## 2. 기존 코드 확인

해당 Task와 관련된 파일만 확인한다.

예:

- `utils/supabase/`
- `lib/`
- 관련 app route 또는 server action
- 관련 타입
- 관련 Supabase schema

전체 코드베이스를 반복해서 분석하지 않는다.

---

## 3. 구현 계획 작성

구현 전에 짧게 계획을 작성한다.

최대 5개 항목으로 제한한다.

예:

1. 관련 schema 확인
2. 필요한 query 함수 추가
3. 타입 정의
4. 최소 검증
5. 완료 조건 확인

장황한 분석은 하지 않는다.

---

## 4. Agent 사용

필요한 Agent만 사용한다.

우선순위:

### DB / Schema / Query

`database-optimizer`

### Supabase 데이터 처리

`backend-developer`

### RLS / 접근 정책

`security-auditor`

### 오류 발생

`debugger`

정상 작업에서는 여러 Agent를 중복 호출하지 않는다.

---

## 5. 구현

Task 완료에 필요한 코드만 수정한다.

원칙:

- 과도한 추상화 금지
- Repository / Service 계층을 불필요하게 추가하지 않는다.
- 새 라이브러리는 꼭 필요한 경우에만 설치한다.
- 기존 구조를 최대한 유지한다.
- 관련 없는 리팩토링 금지

---

## 6. 검증

Task에 필요한 범위만 검증한다.

기본 확인:

- TypeScript 오류
- lint
- 관련 기능 또는 query 동작

DB 작업의 경우:

- 테이블 생성 여부
- FK / Constraint
- INSERT / SELECT 가능 여부
- RLS 정책 동작

매 Task마다 전체 E2E는 실행하지 않는다.

---

## 7. 실패 처리

테스트 또는 검증이 실패하면:

1. 원인을 확인한다.
2. 필요한 경우 `debugger`를 호출한다.
3. 최소 수정으로 해결한다.
4. 해당 검증만 다시 수행한다.

---

## 8. 완료 처리

Task의 완료 조건을 모두 확인한 뒤에만 완료 처리한다.

완료 시 `docs/8-PLAN.md`의 해당 체크박스를 업데이트한다.

다음 Task로 자동 진행하지 않는다.

---

# 응답 형식

작업 완료 후 아래 형식으로만 간결하게 보고한다.

```text
TASK ${TASK_NUMBER} 완료

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

변경하지 않은 코드나 문서를 다시 출력하지 않는다.

---

# 절대 규칙

- 전체 docs를 매번 읽지 않는다.
- 전체 코드베이스를 매번 분석하지 않는다.
- 필요 없는 Agent를 호출하지 않는다.
- 사용자가 요청하지 않은 다음 Task를 실행하지 않는다.
- MVP 범위를 넘는 기능을 추가하지 않는다.
- 별도 백엔드 서버를 만들지 않는다.
  Task 수행에 꼭 필요한 산출물 외 추가 문서 생성 금지

# Supabase 실제 적용 원칙

DB, RLS, RPC, migration 관련 Task는
SQL 파일을 생성하는 것만으로 완료 처리하지 않는다.

반드시 다음 순서를 따른다.

1. 해당 Task의 선행조건이 실제 Supabase 프로젝트에 반영되어 있는지 확인한다.
2. 필요한 migration SQL을 작성한다.
3. Supabase MCP를 사용해 실제 Supabase DB에 migration을 적용한다.
4. 적용 후 실제 DB 상태를 확인한다.
5. 다음 항목을 검증한다.
   - Table 존재 여부
   - Column 존재 여부
   - Primary Key / Foreign Key / Unique Constraint
   - RLS 활성화 여부
   - Policy 존재 여부
   - RPC / Function 존재 여부
6. 적용 중 오류가 발생하면 원인을 분석한다.
7. 필요한 코드 또는 migration을 수정한다.
8. 수정된 migration을 다시 적용한다.
9. 실제 Supabase 반영과 검증이 완료된 후에만 Task를 완료 처리한다.

사용자에게 Supabase SQL Editor에서 직접 SQL을 복사·실행하도록 요청하지 않는다.

Supabase MCP가 사용 불가능한 경우에는
Task를 완료 처리하지 않고 사용자에게 연결 문제만 보고한다.

Task의 완료 조건을 코드상으로만 확인하지 않는다.

DB 관련 Task의 경우
실제 Supabase 프로젝트에 반영된 결과를 확인한 뒤에만 완료 처리한다.

migration 파일 생성만으로는 완료가 아니다.
