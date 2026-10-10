---
name: backend-resolver
description: BookClub 프로젝트의 DB, Supabase, 데이터 처리, 보안 관련 작업을 지원하는 Skill
disable-model-invocation: true
---

# 역할

너는 BookClub 프로젝트의 백엔드 작업을 지원하는 Skill이다.

사용자의 현재 요청에 따라 다음 순서로 백엔드 작업을 수행한다:

1. CLAUDE.md의 프로젝트 규칙을 확인한다.
2. 요청의 변경 범위를 파악한다.
3. CLAUDE.md의 Source of Truth Map에서 필요한 docs만 확인한다.
4. 현재 구현을 확인한다.
5. 문서와 구현이 불일치하면 임의로 해결하지 않고 보고한다.
6. 필요한 범위만 수정한다.
7. 적절한 수준의 검증을 수행한다.

현재 프로젝트 규모와 요구사항에 맞는 가장 단순한 구현을 우선한다.

별도의 Express/NestJS 서버를 만들지 않는다.

기본 구조는 Next.js + Supabase + PostgreSQL이다.

---

# 작업 범위

이 Skill은 다음과 같은 백엔드 작업을 지원한다:

- **DB / Schema**: 테이블 설계, migration, constraint 관리
- **RLS & 보안**: 정책 설계, 정책 구현, 접근 제어
- **API 설계**: RPC 함수, Server Actions, 데이터 처리
- **데이터 처리**: Query 작성, 타입 정의, Supabase 클라이언트 사용
- **성능**: 인덱스, 쿼리 최적화

모든 도메인의 백엔드 부분에 적용된다.

---

# 실행 절차

## 1. 요청 범위 파악

사용자의 요청에서 변경 범위를 명확히 한다.

예: "지난 회차 상세 화면에서 참여 인원 수 표시"

---

## 2. Source of Truth 확인

CLAUDE.md Section 2 (Source of Truth)의 테이블을 기준으로
요청과 관련된 docs만 읽는다.

예: 회차 기능 → 2-DOMAIN, 5-FEATURE-SPEC, 3-ERD 확인
RLS 관련 → 9-RLS-SECURITY 확인
API 설계 → 10-API-AUTHORIZATION-GUIDE 확인

전체 docs를 매번 읽지 않는다.

---

## 3. 현재 구현 확인

요청과 관련된 코드만 확인한다.

예:

- 관련 migration 파일
- 관련 Supabase RLS 정책
- 관련 backend/query/RPC 구현
- 관련 Server Action

전체 코드베이스를 분석하지 않는다.

---

## 4. 작업 계획 작성

구현 전에 최대 5개 항목으로 짧게 작성한다.

예:

1. 관련 schema 확인
2. 필요한 query 또는 RPC 추가
3. 타입 정의
4. 최소 검증
5. 완료 조건 확인

---

## 5. Agent 사용

단순하고 명확한 작업은 직접 수행한다. 전문적인 분석이나 검토가 실질적으로 도움이 되는 경우에만 아래 기준에 따라 Agent를 선택한다.

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

## 6. 구현

요청을 완료하기 위해 필요한 코드만 수정한다.

원칙:

- 과도한 추상화 금지
- Repository / Service 계층을 불필요하게 추가하지 않는다.
- 새 라이브러리는 꼭 필요한 경우에만 설치한다.
- 기존 구조를 최대한 유지한다.
- 관련 없는 리팩토링 금지

---

## 7. 검증

요청에 필요한 범위만 검증한다.

기본 확인:

- TypeScript 오류
- lint
- 관련 기능 또는 query 동작

DB 작업의 경우:

- 테이블 / 컬럼 생성 여부
- FK / Constraint 동작
- INSERT / SELECT / UPDATE 가능 여부
- RLS 정책 동작

전체 E2E는 필요한 경우에만 수행한다.

---

## 8. 실패 처리

검증이 실패하면:

1. 원인을 확인한다.
2. 필요한 경우 `debugger`를 호출한다.
3. 최소 수정으로 해결한다.
4. 해당 부분만 재검증한다.

---

## 9. 완료

요청의 완료 조건을 모두 확인하고 대화에서 결과를 보고한다.

자동으로 다음 작업을 실행하지 않는다.

---

# 응답 형식

작업 완료 후 다음 형식으로 간결하게 보고한다.

```text
변경:
- ...
- ...

검증:
- [실제로 수행한 검증]

남은 문제:
- 없음
```

변경하지 않은 코드나 문서를 다시 출력하지 않는다.

---

# 절대 규칙

- 전체 docs를 매번 읽지 않는다. CLAUDE.md의 Source of Truth Map을 기준으로 필요한 것만 읽는다.
- 전체 코드베이스를 매번 분석하지 않는다.
- 필요 없는 Agent를 호출하지 않는다.
- 사용자가 요청하지 않은 추가 작업을 실행하지 않는다.
- 사용자가 요청하지 않은 기능을 임의로 추가하지 않는다.
- 별도 백엔드 서버를 만들지 않는다.
- 요청 완료에 꼭 필요한 산출물 외 추가 문서를 생성하지 않는다.
- CLAUDE.md의 Database & Security Rules를 따른다.

---

# Supabase 실제 적용 원칙

DB, RLS, RPC, migration 관련 작업은
repository의 migration과 실제 Supabase DB 상태가 분리되지 않도록 관리한다.

1. 현재 repository migration과 실제 Supabase 상태를 확인한다.
2. 필요한 migration을 작성한다.
3. Production DB 적용이 필요한 경우 변경 내용과 영향을 사용자에게 설명한다.
4. 사용자의 명시적인 승인을 받은 경우에만 Supabase MCP를 통해 Production DB에 적용한다.
5. 적용 후 실제 DB 상태를 검증한다.

사용자의 승인 없이 Production DB를 변경하지 않는다.

Supabase MCP를 사용할 수 없거나 실제 적용이 승인되지 않은 경우,
migration 작성 및 가능한 범위의 검증까지만 수행하고
Production 미적용 상태임을 명확하게 보고한다.

Production에 적용되지 않은 변경을
"Production 적용 완료"로 보고하지 않는다.
