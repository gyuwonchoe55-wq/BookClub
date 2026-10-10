# API Authorization Guide

## Overview

This guide describes how BookClub implements data access and authorization using Supabase authentication, direct queries with RLS, and SECURITY DEFINER RPC functions. BookClub uses anonymous authentication (`signInAnonymously()`) to establish authenticated sessions, which then serve as the basis for user identification, membership verification, and authorization checks.

---

## Authentication & Authorization Architecture

### Authentication Flow

```
signInAnonymously()
  ↓
Supabase authenticated user (auth.uid())
  ↓
member.user_id = auth.uid()
  ↓
Book club membership & permissions
```

**Key points:**
- `signInAnonymously()` creates an authenticated Supabase session
- `auth.uid()` uniquely identifies the authenticated user
- `member.user_id` bridges auth identity to book club membership
- RLS policies and RPC functions use `auth.uid()` for authorization

### Authorization Layers

BookClub uses multiple authorization mechanisms working together:

1. **Supabase authenticated session** — Requires `signInAnonymously()`
2. **Table privilege** — Authenticated role has SELECT/INSERT/UPDATE permissions
3. **RLS policies** — Row-level security enforces data isolation
4. **SECURITY DEFINER RPC** — Functions with elevated privileges perform protected operations
5. **RPC internal validation** — `auth.uid()` checks within RPC functions (membership, host status)

---

## Data Access Patterns

### Pattern 1: SECURITY DEFINER RPC (Protected Operations)

Used for operations requiring elevation above user's direct RLS permissions:

```typescript
// Client code
const { data, error } = await supabase.rpc('create_book_club_with_host', {
  p_name: name,
  p_invite_code: inviteCode,
  p_host_nickname: hostNickname,
  p_book_title: bookTitle,
  p_meeting_date: meetingDate,
});
```

**Inside RPC (SECURITY DEFINER):**
```sql
-- RPC runs with elevated privileges
-- Captures current user once
v_current_user_id := auth.uid();

-- Uses auth.uid() for membership creation
INSERT INTO member (book_club_id, user_id, nickname, is_host, joined_at, ...)
VALUES (v_book_club_id, v_current_user_id, p_host_nickname, true, now(), ...);
```

### Pattern 2: Direct Query with RLS

Used for reading or writing data where user's RLS permissions suffice:

```typescript
// Client code - RLS automatically filters to current user
const { data, error } = await supabase
  .from('reading_record')
  .insert({
    meeting_id: meetingId,
    member_id: memberId,
    memorable_quote: quote,
  });
```

**RLS policy enforces:** Only members of the book club can insert reading records

---

## Data Access by Feature

### F01: Create Book Club

**Who can do it:** Any authenticated user (new book club creator)

**Authorization:** 
- User must be authenticated (`signInAnonymously()`)
- New book clubs are created by the authenticated user as host
- No prior membership required

**Implementation:**

Uses `create_book_club_with_host()` SECURITY DEFINER RPC to ensure atomic operation:

```typescript
// lib/book-clubs.ts
export async function createBookClub(
  name: string,
  inviteCode: string,
  hostNickname: string,
  bookTitle: string,
  meetingDate: string | null
): Promise<CreateBookClubResponse> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_book_club_with_host", {
    p_name: name,
    p_invite_code: inviteCode,
    p_host_nickname: hostNickname,
    p_book_title: bookTitle,
    p_meeting_date: meetingDate,
  });

  if (error) {
    throw new Error(`Failed to create book club: ${error.message}`);
  }

  return {
    bookClubId: data[0].book_club_id,
    memberId: data[0].member_id,
    meetingId: data[0].meeting_id,
  };
}
```

**RPC Authorization:**
- Function is SECURITY DEFINER (elevated privileges)
- Captures `auth.uid()` to set `member.user_id`
- Creates `book_club`, `member` (with `is_host=true`), and first `meeting` atomically
- Returns: `(book_club_id, member_id, meeting_id)`

**RLS Interaction:** RPC operates with elevated privileges; RLS policies are not consulted during creation.

---

### F04: Join Book Club

**Who can do it:** Any authenticated user with valid invite code

**Authorization:**
- User must be authenticated (`signInAnonymously()`)
- User identity is `auth.uid()`
- Duplicate membership check: User cannot join same club twice (checked by `user_id`)

**Implementation:**

Uses `join_book_club()` SECURITY DEFINER RPC:

```typescript
// lib/members.ts
export async function joinBookClub(
  inviteCode: string,
  nickname: string
): Promise<JoinBookClubResponse> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("join_book_club", {
    p_invite_code: inviteCode,
    p_nickname: nickname,
  });

  if (error) {
    throw new Error(`Failed to join book club: ${error.message}`);
  }

  return {
    bookClubId: data[0].book_club_id,
    memberId: data[0].member_id,
  };
}
```

**RPC Authorization:**
- Function is SECURITY DEFINER
- Captures `auth.uid()` once at start: `v_current_user_id := auth.uid()`
- Validates invite code exists
- Checks duplicate membership: `WHERE user_id = v_current_user_id AND book_club_id = ...`
- Creates `member` record with `user_id = v_current_user_id` and `is_host = false`
- Returns: `(book_club_id, member_id)`

**RLS Interaction:** RPC operates with elevated privileges; user cannot directly insert into member table without RPC.

---

### F05: Create/Update Reading Record

**Who can do it:** Any book club member

**Authorization:**
- User must be authenticated
- User must be member of the book club (verified via RLS)
- User owns the reading record (member_id must match the member they created in book club)
- Can only create/update before meeting starts (status='scheduled')

**Implementation:**

Uses direct queries with RLS policies. Client-side application logic handles UI workflow:

```typescript
// lib/reading-records.ts
export async function createReadingRecord(
  meetingId: string,
  memberId: string,
  data: CreateReadingRecordData
): Promise<string> {
  const supabase = createClient();

  const { data: result, error } = await supabase
    .from('reading_record')
    .insert({
      meeting_id: meetingId,
      member_id: memberId,
      memorable_quote: data.memorableQuote || null,
      discussion_question: data.discussionQuestion || null,
      takeaway: data.takeaway || null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create reading record: ${error.message}`);
  }

  return result.id;
}

export async function updateReadingRecord(
  recordId: string,
  data: UpdateReadingRecordData
): Promise<void> {
  const supabase = createClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.memorableQuote !== undefined) {
    updatePayload.memorable_quote = data.memorableQuote || null;
  }
  if (data.discussionQuestion !== undefined) {
    updatePayload.discussion_question = data.discussionQuestion || null;
  }
  if (data.takeaway !== undefined) {
    updatePayload.takeaway = data.takeaway || null;
  }

  const { error } = await supabase
    .from('reading_record')
    .update(updatePayload)
    .eq('id', recordId);

  if (error) {
    throw new Error(`Failed to update reading record: ${error.message}`);
  }
}
```

**RLS Policies (enforce authorization):**
- INSERT: User must be member of the book club (RLS checks `auth.uid()`)
- SELECT: User can read reading records from meetings in clubs they belong to
- UPDATE: User can update only their own records (RLS checks `member_id` and `auth.uid()`)

**Application-level checks:**
- Meeting hasn't started (check `meeting.status !== 'scheduled'`)
- Application prevents editing after meeting starts by disabling UI, but RLS provides backup enforcement

---

### F06: Start Meeting (Host-only)

**Who can do it:** Book club host only

**Authorization:**
- User must be authenticated
- User must be host of the book club (checked by RPC via `is_book_club_host()` helper)
- Meeting must exist and have status='scheduled'

**Implementation:**

Uses `start_meeting()` SECURITY DEFINER RPC:

```typescript
// lib/sessions.ts
export async function startMeeting(meetingId: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("start_meeting", {
    p_meeting_id: meetingId,
  });

  if (error) {
    throw new Error(`Failed to start meeting: ${error.message}`);
  }

  if (!data) {
    throw new Error("Starting meeting returned no session id");
  }

  return data;
}
```

**RPC Authorization:**
- Function is SECURITY DEFINER
- Calls helper `is_book_club_host(p_book_club_id)` which checks:
  - User (`auth.uid()`) is a member of the book club
  - User's member record has `is_host = true`
- Updates `meeting.status` to 'in_progress'
- Creates `session` record with `current_step='icebreaker'`
- Returns: session ID

**RLS Interaction:** RPC performs updates with elevated privileges. Direct updates to `meeting` and `session` tables require RPC authorization.

---

### F11: Create New Meeting Round (Host-only)

**Who can do it:** Book club host only

**Authorization:**
- User must be authenticated
- User must be host of the book club (checked by RPC via `is_book_club_host()` helper)

**Implementation:**

Uses `create_meeting()` SECURITY DEFINER RPC:

```typescript
// This feature uses the RPC create_meeting function
// which is called internally or through lib/meetings.ts
const { data: meetingId, error } = await supabase.rpc('create_meeting', {
  p_book_club_id: bookClubId,
  p_book_title: bookTitle,
  p_meeting_date: meetingDate,
});
```

**RPC Authorization:**
- Function is SECURITY DEFINER
- Calls helper `is_book_club_host(p_book_club_id)` which checks:
  - User (`auth.uid()`) is a member of the book club
  - User's member record has `is_host = true`
- Creates new `meeting` record with status='scheduled'
- Returns: meeting ID

---

## Common Authorization Patterns in BookClub

### Pattern 1: RPC-Based Protected Operations

Operations that need elevated privileges use SECURITY DEFINER RPC:

```typescript
// create_book_club_with_host(p_name, p_invite_code, p_host_nickname, ...)
const { data, error } = await supabase.rpc('create_book_club_with_host', {
  p_name: clubName,
  p_invite_code: inviteCode,
  p_host_nickname: hostNickname,
  p_book_title: bookTitle,
  p_meeting_date: meetingDate,
});

// Returns: (book_club_id, member_id, meeting_id)
// Authorization: Captures auth.uid() inside RPC
```

### Pattern 2: User Lookup via auth.uid()

Finding the current user's member record in a book club:

```typescript
// lib/members.ts
export async function getMemberByUserId(
  bookClubId: string,
  userId: string
): Promise<Member | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('member')
    .select('id, book_club_id, nickname, is_host, joined_at, user_id')
    .eq('book_club_id', bookClubId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch member by user ID: ${error.message}`);
  }

  return { /* member data */ };
}

// Usage: Find current user's member record to check is_host
const member = await getMemberByUserId(bookClubId, auth.uid());
```

### Pattern 3: RLS-Protected Queries

Reading data where RLS policies provide authorization:

```typescript
// Reading records - RLS filters to records user can access
const { data: records } = await supabase
  .from('reading_record')
  .select('id, meeting_id, member_id, memorable_quote, ...')
  .eq('meeting_id', meetingId);

// RLS policy: User must be member of the book club
// If user is not a member, RLS returns error or empty result
```

### Pattern 4: Direct Query with Explicit ID Checks

For operations not covered by RLS, application performs explicit checks:

```typescript
// Before allowing an update, verify user owns the record
const existingRecord = await getReadingRecord(meetingId, memberId);
if (!existingRecord) {
  throw new Error('Record not found');
}

// Then proceed with update
await updateReadingRecord(recordId, data);
```

---

## Error Handling

### Error Sources and Responses

Errors can come from RPC functions or RLS policies:

**RPC Function Errors (SECURITY DEFINER):**
```sql
-- Examples from create_book_club_with_host, join_book_club
RAISE EXCEPTION 'Book club name cannot be empty';
RAISE EXCEPTION 'Invite code cannot be empty';
RAISE EXCEPTION 'Invalid invite code';
RAISE EXCEPTION 'You are already a member of this book club';
RAISE EXCEPTION 'Only the host can create new meetings';
```

**RLS Policy Errors:**
```
Code: PGRST201 (RLS policy violation)
Message: "You do not have permission for this action"
→ Typically: User not member of club, or record access denied
```

**Unique Constraint Errors:**
```
Code: 23505 (Unique violation)
→ Examples: Duplicate member (user_id + book_club_id), 
  duplicate reading record (meeting_id + member_id)
```

### Client-Side Error Handling

Application catches errors from Supabase calls and handles them:

```typescript
try {
  const response = await joinBookClub(inviteCode, nickname);
  // Success
} catch (error) {
  if (error.message.includes('Invalid invite code')) {
    // Show user-friendly message
    setError('Book club not found with this invite code');
  } else if (error.message.includes('already a member')) {
    setError('You are already a member of this club');
  } else {
    setError('Failed to join club. Please try again.');
  }
}
```

---

## Testing Authorization

### Testing Strategy

Authorization is tested at multiple levels:

1. **RPC function level** — Validate authorization checks inside SECURITY DEFINER functions
2. **RLS policy level** — Verify RLS policies enforce row-level access
3. **Application level** — Playwright E2E tests verify user flows

### Example: Join Book Club Authorization

```typescript
// Test: Non-authenticated user cannot join
it('should fail if user not authenticated', async () => {
  // signInAnonymously() not called
  expect(() => joinBookClub(inviteCode, nickname))
    .toThrow('Failed to join book club');
});

// Test: User cannot join with invalid invite code
it('should fail with invalid invite code', async () => {
  await signInAnonymously();
  expect(() => joinBookClub('INVALID', nickname))
    .toThrow('Invalid invite code');
});

// Test: User cannot join same club twice (auth.uid() check)
it('should fail if already a member', async () => {
  await signInAnonymously();
  const response1 = await joinBookClub(validInviteCode, 'Alice');
  expect(response1.memberId).toBeDefined();

  // Same user tries to join again
  const response2 = await joinBookClub(validInviteCode, 'Alice2');
  expect(() => response2).toThrow('You are already a member');
});
```

### Example: Host-Only Operation Authorization

```typescript
// Test: Only host can start meeting
it('should deny non-host from starting meeting', async () => {
  // Setup: User1 is host, User2 is regular member
  const user1 = await signInAnonymously();
  const { meetingId } = await createBookClub(clubName, inviteCode, 'User1', bookTitle, date);

  // User2 joins as regular member
  await signInAnonymously(); // Different auth.uid()
  await joinBookClub(inviteCode, 'User2');

  // Try to start meeting as User2
  expect(() => startMeeting(meetingId))
    .toThrow('Only the host can create new meetings');
});
```

---

## Security Checklist

- [x] User authenticated via `signInAnonymously()`
- [x] User identity stored in `auth.uid()`
- [x] Member records link to `auth.uid()` via `user_id`
- [x] SECURITY DEFINER RPC functions validate authorization
- [x] `is_book_club_host()` helper checks host status
- [x] Host-only operations protected by RPC
- [x] RLS policies enforce row-level access
- [x] Duplicate membership prevented (`UNIQUE(user_id, book_club_id)`)
- [x] Error messages don't leak sensitive info
- [x] No direct INSERT into protected tables (use RPC)

---

## References

**Data Access Implementation:**
- `lib/auth.ts` — Authentication via `signInAnonymously()` and `getCurrentUser()`
- `lib/book-clubs.ts` — Book club creation and lookup (RPC `create_book_club_with_host`)
- `lib/members.ts` — Membership operations (RPC `join_book_club`)
- `lib/reading-records.ts` — Reading record CRUD (direct queries with RLS)
- `lib/sessions.ts` — Meeting sessions (RPC `start_meeting`, `update_session_step`, `advanceQuestion`)

**Security & RLS:**
- [RLS Policies Design (9-RLS-SECURITY.md)](./9-RLS-SECURITY.md) — Table policies and helper functions
- `supabase/migrations/20260901_enable_rls_and_policies.sql` — RPC function definitions

**Product Context:**
- [Feature Specification (5-FEATURE-SPEC.md)](./5-FEATURE-SPEC.md) — Feature requirements and workflows

