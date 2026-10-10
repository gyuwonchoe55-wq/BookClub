# BookClub — Claude Project Guide

## 1. Project Overview

BookClub은 독서모임의 준비와 실제 진행을 지원하는 웹 서비스다.

이 서비스의 핵심은 단순히 독서모임을 만들거나 독서기록을 저장하는 것이 아니라,
**모임 참여자 각자가 작성한 짧은 독서기록을 바탕으로 실제 모임에서 사용할 진행 가이드를 구성하고,
이를 통해 독서모임의 진행을 돕는 것**이다.

기본적인 사용자 경험은 다음과 같다.

1. 독서모임을 만든다.
2. 참여자가 모임에 참여한다.
3. 각 참여자가 책을 읽고 짧은 독서기록을 작성한다.
4. 참여자들의 독서기록이 모인다.
5. 모인 기록을 바탕으로 모임 진행에 필요한 가이드가 구성된다.
6. 실제 모임에서는 이 가이드를 따라 이야기를 나누고 모임을 진행한다.

따라서 기능과 UX를 설계하거나 변경할 때는
**"이 변경이 참여자의 기록을 실제 모임의 대화와 진행으로 연결하는 핵심 경험에 어떤 영향을 주는가"**
를 중요한 판단 기준으로 삼는다.

### Tech Stack

- Next.js
- TypeScript
- Supabase
- Vercel
- Playwright

이 파일은 Claude가 BookClub 프로젝트에서 작업할 때 가장 먼저 따라야 하는
**최상위 작업 가이드이자 Source of Truth Router**다.

제품, UX, 기능, 데이터, 보안 등의 상세 기준을 이 파일에 중복해서 작성하지 않는다.
각 영역의 상세 기준은 `docs/`의 해당 Source of Truth를 따른다.

---

## 2. Source of Truth

작업을 시작하기 전에 변경 대상과 관련된 Source of Truth를 확인한다.

| 영역                                     | Source of Truth                      |
| ---------------------------------------- | ------------------------------------ |
| 제품 목적 / 대상 사용자 / 제품 범위      | `docs/1-PRD.md`                      |
| 도메인 개념 / 비즈니스 규칙              | `docs/2-DOMAIN.md`                   |
| DB 구조 / 테이블 관계 / 데이터 설계      | `docs/3-ERD.md`                      |
| 사용자 시나리오 / 화면 흐름 / 네비게이션 | `docs/4-SCREEN-FLOW.md`              |
| 기능 동작 / 입출력 / 비즈니스 로직       | `docs/5-FEATURE-SPEC.md`             |
| 화면 정보구조 / UI 레이아웃              | `docs/6-WIREFRAME.md`                |
| 디자인 / UI 스타일                       | `docs/7-STYLE.md`                    |
| RLS / 데이터 접근 / 보안 정책            | `docs/9-RLS-SECURITY.md`             |
| API / RPC 인가 패턴                      | `docs/10-API-AUTHORIZATION-GUIDE.md` |

### Reading Rules

모든 작업에서 모든 문서를 읽지 않는다.

현재 작업에 영향을 받는 Source of Truth만 선택해서 확인한다.

예:

- 제품 정책 변경 → PRD, DOMAIN, FEATURE-SPEC
- 사용자 흐름 변경 → SCREEN-FLOW, FEATURE-SPEC
- 화면/UI 변경 → SCREEN-FLOW, WIREFRAME, STYLE
- 기능 동작 변경 → FEATURE-SPEC
- DB 구조 변경 → ERD + 관련 migration
- RLS 변경 → RLS-SECURITY + ERD + 관련 migration
- API/RPC 권한 변경 → API-AUTHORIZATION-GUIDE + RLS-SECURITY

작업이 여러 영역에 영향을 주는 경우에만 관련 문서를 함께 확인한다.

---

## 3. Documentation Rules

### 3.1 Current Only

`docs/`에는 **현재 유효한 제품, 설계, 기술 기준만 존재한다.**

과거 버전의 문서를 별도로 보관하지 않는다.
과거 상태와 변경 이력은 Git이 관리한다.

따라서:

- `docs/archive/`를 사용하지 않는다.
- 과거 버전 보존을 위해 문서를 복사하지 않는다.
- `PRD-v1`, `PRD-old`, `PRD-final`과 같은 버전별 복사본을 만들지 않는다.

### 3.2 One Source of Truth

동일한 정책이나 설계를 여러 문서에서 중복 관리하지 않는다.

이미 해당 영역의 Source of Truth가 존재한다면 새로운 문서를 만들지 않고
기존 Source of Truth를 업데이트한다.

요약본을 별도로 만들어 원본과 함께 관리하지 않는다.

문서 간 내용이 충돌하는 경우 Claude가 임의로 어느 하나를 선택하지 않는다.

충돌하는 내용과 영향을 사용자에게 보고하고 판단을 요청한다.

### 3.3 Document Creation

Claude는 분석, 진단, 구현 결과 또는 작업 완료 보고를 위해
프로젝트 내부에 임의로 문서를 생성하지 않는다.

예:

- `TASK_xx_REPORT.md`
- `IMPLEMENTATION_SUMMARY.md`
- `EXECUTIVE_SUMMARY.md`
- `FINDINGS.md`
- `DELIVERY.md`
- `DIAGNOSIS.md`
- 기타 일회성 분석/보고 파일

이러한 결과는 기본적으로 대화에서 보고한다.

사용자가 명시적으로 파일 생성을 요청한 경우에만 새로운 문서를 생성한다.

새로운 독립적인 Source of Truth가 필요하다고 판단되는 경우에도
Claude가 임의로 생성하지 않고 먼저 사용자에게 제안한다.

### 3.4 Updating Documentation

기능이나 정책 변경으로 기존 Source of Truth가 영향을 받는 경우,
관련 문서의 업데이트 필요 여부를 확인한다.

모든 기능 변경마다 모든 문서를 수정하지 않는다.

실제로 영향을 받는 Source of Truth만 수정한다.

문서를 업데이트할 때 기존 문서의 역할과 범위를 유지하고,
다른 Source of Truth의 내용을 불필요하게 복제하지 않는다.

---

## 4. Docs vs Implementation

`docs/`와 구현은 서로 다른 역할을 가진다.

### Docs

`docs/`는 **의도된 현재 제품과 설계의 기준**을 나타낸다.

### Implementation

코드와 Supabase migration은 **현재 실제 구현 상태**를 나타낸다.

따라서 문서와 구현이 다르다고 해서:

- 문서가 자동으로 틀린 것은 아니다.
- 코드가 자동으로 틀린 것은 아니다.
- 코드가 항상 문서보다 우선하지 않는다.
- 문서가 항상 코드보다 우선하지 않는다.

불일치를 발견하면 Claude는 다음을 확인한다.

1. 무엇이 다른지
2. 사용자 경험이나 데이터에 어떤 영향을 주는지
3. 최근 변경으로 인해 발생한 차이인지
4. 어느 쪽을 변경해야 할지 사용자 판단이 필요한지

판단이 필요한 경우 사용자에게 불일치를 보고한다.

사용자의 판단 없이 문서를 코드에 맞추거나,
코드를 문서에 맞추기 위한 대규모 변경을 임의로 수행하지 않는다.

---

## 5. Development Workflow & Rules

### 5.1 Before Changing Code

작업 요청을 받으면 다음 순서로 접근한다.

1. 요청의 목적과 변경 범위를 파악한다.
2. 관련 Source of Truth를 확인한다.
3. 현재 구현을 확인한다.
4. 문서와 구현 사이에 관련 불일치가 있는지 확인한다.
5. 변경이 다른 기능에 미치는 영향을 확인한다.
6. 필요한 범위만 수정한다.
7. 변경 후 적절한 수준의 검증을 수행한다.

### 5.2 Scope Control

요청받은 문제를 해결하는 데 필요한 범위만 수정한다.

작업 중 별개의 문제를 발견한 경우:

- 현재 작업에 반드시 필요한 문제라면 함께 처리할 수 있다.
- 현재 작업과 독립적인 문제라면 사용자에게 보고하고 임의로 수정하지 않는다.

다음 작업은 사용자 승인 없이 수행하지 않는다.

- 대규모 리팩터링
- 대규모 폴더 이동
- 파일 구조 전면 변경
- 광범위한 파일명 변경
- 새로운 아키텍처 도입
- 주요 라이브러리 또는 프레임워크 도입
- 기존 기술 스택 교체

### 5.3 Reuse and Abstraction

미래에 사용할 가능성만을 이유로 새로운 추상화를 만들지 않는다.

다음과 같은 요소도 실제 반복이나 명확한 필요가 확인된 경우에만 추출한다.

- 공통 Component
- Hook
- Utility
- Service Layer
- Wrapper
- 공통 Form
- 공통 Modal
- 공통 Loading/Error abstraction

"구조적으로 더 좋아 보인다"는 이유만으로 현재 동작하는 구조를 복잡하게 만들지 않는다.

현재 프로젝트 규모와 실제 요구에 맞는 가장 단순한 구조를 우선한다.

### 5.4 Product Intent

구현 편의를 위해 제품 의도나 UX 요구사항을 임의로 변경하지 않는다.

특히 BookClub의 핵심 경험인

**독서기록 작성 → 기록 축적 → 진행 가이드 구성 → 실제 모임 진행**

의 연결에 영향을 주는 변경은 단순한 화면 또는 코드 수정으로 간주하지 않는다.

이 흐름에 영향을 주는 경우 관련 Source of Truth를 확인하고
제품 동작의 변경 여부를 명확히 판단한다.

---

## 6. Agents & Skills

`.claude/agents/`와 `.claude/skills/`는 Claude의 작업을 지원하기 위한
전문 역할과 반복 작업 지침을 정의한다.

Agent와 Skill은 Source of Truth가 아니다.

제품, UX, 기능, 데이터, 보안에 대한 기준은
이 문서와 `docs/`의 해당 Source of Truth를 따른다.

Agent 또는 Skill의 지침이 `CLAUDE.md`나 Source of Truth와 충돌하는 경우
상위 프로젝트 규칙과 Source of Truth를 우선하고 충돌 내용을 사용자에게 보고한다.

### 6.1 Agents

`.claude/agents/`의 Agent는 특정 영역에서 전문적인 분석이나 검토가 필요한 경우
선택적으로 사용한다.

현재 프로젝트에는 다음과 같은 전문 Agent가 존재할 수 있다.

- API Design
- Architecture
- Backend
- Database
- Debugging
- Frontend
- Full-stack
- Performance
- QA
- Security
- UI Design

Agent가 존재한다는 이유만으로 모든 작업에서 호출하지 않는다.

작업의 성격과 위험도에 따라 필요한 Agent만 선택한다.

예:

- UI/화면 개선 → UI 또는 Frontend 관련 Agent
- 복잡한 오류 분석 → Debugger
- DB 구조/쿼리 문제 → Database 관련 Agent
- RLS/인가 변경 → Security 관련 Agent
- 테스트 전략/회귀 검증 → QA 관련 Agent
- API/RPC 구조 변경 → API/Backend 관련 Agent
- 여러 계층에 걸친 구조적 변경 → 필요한 경우 Architecture/Full-stack 관련 Agent

단순한 텍스트 수정, 작은 스타일 수정, 명확한 단일 파일 변경 등은
불필요하게 Agent를 호출하지 않고 직접 처리할 수 있다.

### 6.2 Agent Scope

Agent에게 작업을 위임하더라도 프로젝트의 기본 규칙은 동일하게 적용된다.

Agent는:

- 관련 Source of Truth를 확인한다.
- 요청받은 범위를 넘어 임의로 확장하지 않는다.
- 제품 정책을 임의로 결정하지 않는다.
- 관련 없는 리팩터링을 수행하지 않는다.
- 새로운 문서나 보고서를 임의로 생성하지 않는다.
- Production 변경은 사용자 승인 없이 수행하지 않는다.
- commit / push / tag / release는 사용자 요청 없이 수행하지 않는다.

여러 Agent의 의견이 서로 다를 경우
다수결이나 임의 판단으로 결정하지 않는다.

제품/UX 판단은 Source of Truth와 사용자 의도를 기준으로 한다.

기술적으로 중요한 선택지가 남는 경우
각 선택지와 영향을 사용자에게 보고한다.

### 6.3 Skills

`.claude/skills/`의 Skill은 특정 종류의 작업을 수행할 때 따라야 하는
재사용 가능한 절차와 작업 지침이다.

관련 Skill이 존재하는 작업에서는 해당 Skill의 `SKILL.md`를 확인하고
그 절차를 따른다.

Skill은 "무엇을 만들어야 하는가"를 정의하는 Source of Truth가 아니라
**"해당 작업을 어떻게 수행할 것인가"를 지원하는 실행 지침**이다.

따라서 Agent나 Skill이 제품 요구사항을 새롭게 정의하거나
Source of Truth를 임의로 변경해서는 안 된다.

### 6.4 Instruction Priority

작업 중 여러 지침이 관련되는 경우 다음 순서로 판단한다.

1. 사용자의 현재 요청과 명시적인 결정
2. `CLAUDE.md`의 프로젝트 작업 규칙
3. `docs/`의 관련 Source of Truth
4. 관련 Agent / Skill의 실행 지침

단, 제품의 현재 정의나 설계 사실을 판단할 때는
해당 영역의 Source of Truth를 기준으로 한다.

Agent 또는 Skill의 내용이 현재 프로젝트 구조와 맞지 않거나 오래된 경우
그 지침을 기계적으로 따르지 않고 불일치를 보고한다.

### 6.5 Choosing Agents and Skills

작업을 시작할 때 다음을 판단한다.

1. 어떤 Source of Truth가 관련되는가?
2. 현재 Claude가 직접 처리할 수 있는 범위인가?
3. 전문 Agent의 분석이나 검토가 실질적인 도움이 되는가?
4. 해당 작업을 위한 Skill이 존재하는가?

필요한 경우에만 Agent 또는 Skill을 사용한다.

여러 Agent를 동시에 사용하는 것은
서로 다른 전문 영역의 검토가 실제로 필요한 경우로 제한한다.

Agent와 Skill 사용 자체를 작업의 목표로 삼지 않는다.

BookClub의 기능을 정확하고 단순하게 구현하는 것이 우선이다.

### 6.6 Maintaining Agents and Skills

Agent와 Skill도 프로젝트와 함께 관리한다.

현재 프로젝트에서 더 이상 사용하지 않거나
현재 기술 구조와 맞지 않는 Agent/Skill을 관성적으로 유지하지 않는다.

새로운 Agent 또는 Skill이 필요하다고 판단되더라도
일회성 작업을 이유로 즉시 생성하지 않는다.

다음 조건을 기준으로 검토한다.

- 반복적으로 발생하는 전문 작업인가?
- 일반 Claude 작업과 명확히 다른 역할이 있는가?
- 별도의 실행 절차를 유지할 가치가 있는가?

필요성이 명확한 경우 사용자에게 생성 또는 변경을 제안한다.

사용자의 명시적인 요청 없이
Agent 또는 Skill 파일을 새로 만들거나 대규모로 재구성하지 않는다.

---

## 7. Database & Security Rules

DB 또는 보안 관련 변경을 수행하기 전에 필요한 범위에 따라 다음을 확인한다.

- `docs/3-ERD.md`
- `docs/9-RLS-SECURITY.md`
- `docs/10-API-AUTHORIZATION-GUIDE.md`
- 관련 Supabase migration
- 관련 query / RPC 구현

### 7.1 Database Changes

DB 구조 변경은 repository의 migration으로 남긴다.

Production에서 직접 DB 변경이 이루어진 경우에도
동일한 변경을 repository migration에 반영하여

**Production DB와 repository migration이 서로 다른 상태로 유지되지 않도록 한다.**

기존 migration을 단순히 현재 구현과 다르다는 이유로 임의 수정하지 않는다.

필요한 경우 새로운 migration을 추가한다.

### 7.2 RLS / Authorization

다음 변경은 보안 영향이 있는 변경으로 취급한다.

- RLS policy
- RPC authorization
- `SECURITY DEFINER`
- role privilege
- authenticated / anon 접근 범위
- 사용자 소유권 검증
- API authorization

이러한 변경을 수행할 때 Claude는
변경 이유와 예상 영향을 명확히 설명한다.

Claude가 RLS 또는 보안 코드를 수정하는 것 자체를 금지하지 않는다.

단, 사용자의 명시적 승인 없이 Production DB에 직접 변경을 적용하지 않는다.

---

## 8. Testing & Verification Rules

변경 후 해당 변경에 적합한 수준의 검증을 수행한다.

모든 작업에서 전체 E2E 테스트를 실행할 필요는 없다.

가능하면 작은 범위부터 검증한다.

1. TypeScript / build / lint 등 정적 검증
2. 변경된 기능 단위의 검증
3. 관련 기능 간 통합 확인
4. 필요한 경우 Playwright E2E

테스트 실패가 발생한 경우 원인을 먼저 확인한다.

테스트를 통과시키기 위해 다음을 임의로 수행하지 않는다.

- 제품 요구사항 변경
- 정상 기능 제거
- 보안 규칙 완화
- assertion 무력화
- 의미 없는 timeout 증가
- 테스트 자체 삭제

테스트가 현재 제품 요구사항과 맞지 않는 경우
테스트와 Source of Truth의 불일치를 보고하고 필요한 쪽을 판단한다.

Playwright 실행으로 생성되는 다음 결과물은 Git 버전 관리 대상이 아니다.

- `playwright-report/`
- `test-results/`

---

## 9. Git & Version Management

Git은 BookClub 프로젝트의 변경 이력과 과거 버전을 관리한다.

과거 버전을 보존하기 위해 프로젝트 내부에
별도의 archive 문서나 복사본을 만들지 않는다.

### 9.1 Commit

Commit은 실제 작업 변경 이력을 기록한다.

Claude는 사용자의 명시적인 요청 없이 commit하지 않는다.

### 9.2 Push

Claude는 사용자의 명시적인 요청 없이
remote repository에 push하지 않는다.

### 9.3 Version

의미 있는 제품 상태는 Git tag로 관리한다.

예:

- `v0.1`
- `v0.2`
- `v1.0`

Claude는 사용자의 명시적인 요청 없이
tag 또는 release를 생성하지 않는다.

Git 작업을 수행하기 전에는 현재 working tree를 확인하여
의도하지 않은 변경사항이 함께 포함되지 않는지 확인한다.

---

## 10. Communication & Decision Making

Claude는 구현자이지만 제품 의사결정자는 아니다.

명확한 요구사항과 Source of Truth가 존재하는 경우
불필요하게 사용자에게 반복 확인하지 않고 작업을 진행한다.

반면 다음과 같은 경우에는 임의로 결정하지 않는다.

- 제품 정책이 바뀌는 경우
- 핵심 사용자 흐름이 바뀌는 경우
- 서로 다른 Source of Truth가 충돌하는 경우
- 문서와 구현 중 어느 쪽이 의도된 상태인지 판단할 수 없는 경우
- 데이터 손실 가능성이 있는 경우
- 보안 정책이 변경되는 경우
- Production 환경에 영향을 주는 경우
- 여러 선택지 사이에 명확한 제품적 판단이 필요한 경우

이 경우 Claude는:

1. 발견한 문제
2. 선택 가능한 방향
3. 각 방향의 영향

을 간결하게 설명하고 사용자의 결정을 따른다.

작업 완료 후에는 불필요한 보고서 파일을 생성하지 않고
대화에서 다음 내용을 간결하게 보고한다.

- 무엇을 변경했는지
- 무엇을 검증했는지
- 남아 있는 문제 또는 사용자 판단이 필요한 사항

---

## 11. Core Principle

BookClub 개발의 목적은 코드나 문서 자체를 완벽하게 만드는 것이 아니다.

**사용자가 책을 읽으며 남긴 작은 기록들이
실제 독서모임의 대화로 자연스럽게 이어지고,
그 기록을 바탕으로 사람들이 더 쉽게 모임을 진행할 수 있도록 만드는 것이 핵심이다.**

기술적 구조, UI, 데이터 모델, Agent, Skill, 자동화는
이 경험을 지원하기 위한 수단이다.

구조적 완성도나 기술적 복잡성을 위해
제품 경험을 불필요하게 복잡하게 만들지 않는다.
