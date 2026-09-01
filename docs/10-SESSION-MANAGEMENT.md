# Session Management Implementation (TASK 10)

## Overview

This document describes the implementation of meeting start and session management functions for the BookClub application.

## Components Implemented

### 1. Database Layer (SQL Migration)

**File:** `supabase/migrations/20260901_add_session_functions.sql`

#### Functions Created

##### `update_session_step(p_session_id UUID, p_step VARCHAR)`
- **Purpose:** Progress session through meeting stages
- **Authorization:** Host only (checked via `is_book_club_host()`)
- **Valid Steps:** 'icebreaker' → 'discussion' → 'takeaway' → 'completed'
- **Returns:** void
- **Error Handling:** Raises exception if not host, session not found, or invalid step

**Usage Example:**
```sql
SELECT update_session_step('session-id-here', 'discussion');
```

##### `advance_question(p_session_id UUID)`
- **Purpose:** Increment question index for multi-item stages
- **Authorization:** Host only (checked via `is_book_club_host()`)
- **Returns:** void
- **Behavior:** Increments `current_question_index` by 1

**Usage Example:**
```sql
SELECT advance_question('session-id-here');
```

#### Existing RLS Policy Verification

**Policy:** `reading_record_update_own_before_start`
- Already prevents reading_record updates when meeting.status ≠ 'scheduled'
- When `start_meeting()` changes status to 'in_progress', this policy automatically blocks further edits
- No changes needed - existing policy is sufficient

### 2. TypeScript Data Layer

**File:** `lib/sessions.ts`

#### Interfaces

```typescript
export interface Session {
  id: string;
  meetingId: string;
  currentStep: "icebreaker" | "discussion" | "takeaway" | "completed";
  currentQuestionIndex: number;
  remainingSeconds?: number;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Functions

##### `startMeeting(meetingId: string): Promise<string>`
- Calls `start_meeting()` RPC function
- Returns session ID
- Throws if not host or meeting not found

##### `updateSessionStep(sessionId: string, step: StepType): Promise<void>`
- Calls `update_session_step()` RPC function
- Validates step value at TypeScript level
- Throws if authorization fails or session not found

##### `advanceQuestion(sessionId: string): Promise<void>`
- Calls `advance_question()` RPC function
- Throws if authorization fails or session not found

##### `getSession(meetingId: string): Promise<Session | null>`
- Fetches session data by meeting ID
- Returns null if no session exists (meeting not started)

##### `getSessionById(sessionId: string): Promise<Session | null>`
- Fetches session data by session ID
- Returns null if not found

## Meeting Lifecycle

### State Transitions

```
scheduled
    ↓
[host calls startMeeting()]
    ↓
in_progress
    ├─ current_step: icebreaker
    ├─ reading_records: LOCKED (updates blocked)
    └─ [host progresses through steps]
    ↓
completed
```

### Recording Behavior

**Before Meeting Starts (status='scheduled')**
- Users can create reading records
- Users can update own reading records
- Policy: `reading_record_insert_own` + `reading_record_update_own_before_start`

**During Meeting (status='in_progress')**
- Users cannot modify reading records
- Policy: `reading_record_update_own_before_start` blocks updates
- Session progresses through steps: icebreaker → discussion → takeaway → completed

**After Meeting (status='completed')**
- Users cannot modify reading records
- Session finalized with end timestamp

## Session Steps

The session progresses through these steps in order:

1. **icebreaker** - Ice breaker with memorable quotes
   - Display memorable_quote from each participant
   - Use current_question_index to track which quote
   - Call `advanceQuestion()` to move to next quote

2. **discussion** - Topic discussion with questions
   - Display discussion_question from each participant
   - Use current_question_index to track which question
   - Call `advanceQuestion()` to move to next question
   - Optional: Use remaining_seconds for timer

3. **takeaway** - Share learning takeaways
   - Display takeaway from each participant
   - Use current_question_index to track position
   - Call `advanceQuestion()` to move to next participant

4. **completed** - Meeting finished
   - Session ended, recorded in ended_at timestamp
   - Meeting status changed to 'completed'

## Implementation Flow

### Step 1: Start Meeting
```typescript
const sessionId = await startMeeting(meetingId);
// meeting.status = 'in_progress'
// session.current_step = 'icebreaker'
// session.started_at = now()
```

### Step 2: Progress to Discussion
```typescript
await updateSessionStep(sessionId, 'discussion');
```

### Step 3: Advance Between Items
```typescript
await advanceQuestion(sessionId);
// Increments current_question_index
```

### Step 4: Move to Takeaway
```typescript
await updateSessionStep(sessionId, 'takeaway');
```

### Step 5: Complete Meeting
```typescript
await updateSessionStep(sessionId, 'completed');
// session.ended_at = now()
// meeting.status = 'completed' (via end_meeting RPC)
```

## Security

### Authorization Checks

All session functions use `is_book_club_host()` helper to verify:
1. Current user is authenticated (auth.uid() exists)
2. User is a member of the book club
3. User's member record has is_host=true

### RLS Protection

**Reading Records:**
- INSERT: Allowed only to own member record in the same book club
- SELECT: Allowed to see all records in the same book club
- UPDATE: Allowed only to own records when meeting.status='scheduled'
- DELETE: Completely blocked

**Sessions:**
- INSERT: Allowed only via start_meeting RPC
- SELECT: Allowed to members of the same book club
- UPDATE: Allowed only via update_session_step and advance_question RPCs
- DELETE: Completely blocked

## Migration Application

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Authentication token: `supabase login` or `SUPABASE_ACCESS_TOKEN` env var
- Project linked: `supabase link --project-ref <ref>`

### Apply Migration
```bash
supabase db push
```

### Verify Migration
Run the verification queries in `docs/10-SESSION-MANAGEMENT.md` (Verification Section) in Supabase SQL Editor:

```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines
WHERE routine_name IN ('update_session_step', 'advance_question', 'start_meeting')
AND routine_schema = 'public';
```

### Rollback (if needed)
```bash
supabase db reset
# Reapply only the first two migrations
```

## Testing

### Unit Tests (TypeScript)
```typescript
import { startMeeting, updateSessionStep, advanceQuestion, getSession } from '@/lib/sessions';

// Test 1: Start meeting
const sessionId = await startMeeting(meetingId);
expect(sessionId).toBeDefined();

// Test 2: Check session created with icebreaker step
const session = await getSession(meetingId);
expect(session?.currentStep).toBe('icebreaker');
expect(session?.currentQuestionIndex).toBe(0);

// Test 3: Advance question
await advanceQuestion(sessionId);
const updated = await getSessionById(sessionId);
expect(updated?.currentQuestionIndex).toBe(1);

// Test 4: Progress to discussion
await updateSessionStep(sessionId, 'discussion');
const advanced = await getSessionById(sessionId);
expect(advanced?.currentStep).toBe('discussion');
```

### Integration Tests (End-to-End)
```typescript
// 1. Create book club and meeting
const { bookClubId, meetingId } = await setupTestBookClub();

// 2. Start meeting
const sessionId = await startMeeting(meetingId);

// 3. Verify reading records cannot be updated
const recordId = await getExistingRecord(meetingId);
try {
  await updateReadingRecord(recordId, { memorableQuote: 'new value' });
  expect.fail('Should have thrown');
} catch (e) {
  expect(e.message).toContain('policy');
}

// 4. Progress session
await updateSessionStep(sessionId, 'discussion');
await advanceQuestion(sessionId);
await updateSessionStep(sessionId, 'takeaway');

// 5. Verify session state
const finalSession = await getSessionById(sessionId);
expect(finalSession?.currentStep).toBe('takeaway');
expect(finalSession?.currentQuestionIndex).toBeGreaterThan(0);
```

## Related Tasks

- **TASK 02**: Initial schema creation and existing RPCs (create_book_club, join_book_club, create_meeting, start_meeting, end_meeting)
- **TASK 05**: Reading record creation (createReadingRecord RPC)
- **TASK 10**: This task - session management functions
- **TASK 11-13**: Frontend UI for session progression

## Files Modified/Created

- **Created:** `supabase/migrations/20260901_add_session_functions.sql`
- **Created:** `lib/sessions.ts`
- **Created:** `docs/10-SESSION-MANAGEMENT.md` (this file)

## Notes

### Design Decisions

1. **Step Values:** Using 'discussion' instead of 'question' to match feature spec terminology and database schema documentation.

2. **Question Index:** Using single `current_question_index` for all steps instead of separate tracking, allowing flexible progression through different types of content.

3. **RLS Policy:** Leveraging existing policy that checks meeting.status instead of adding new policy, reducing maintenance burden.

4. **No Backend Server:** All authorization and data validation happens via PostgreSQL RLS and SECURITY DEFINER functions, no Express/NestJS needed.

### Future Enhancements

1. Add `remaining_seconds` updates for timer functionality (TASK 11-13)
2. Add discussion_duration parameter to track question timing
3. Add session_state details (e.g., current_speaker, round_robin_position)
4. Add reading_record metadata for progress tracking
