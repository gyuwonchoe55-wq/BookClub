# API Authorization Guide

## Overview

This guide explains how the Next.js API layer implements authorization checks that work alongside RLS policies. While RLS enforces database-level security, the API layer implements business logic and user-friendly error messages.

---

## Authorization Layers

```
Request to API Route
  ↓
1. User Identification (localStorage memberId)
  ↓
2. API Authorization Check (business logic)
  ↓
3. Database Operation (RLS policies enforce)
  ↓
4. Response with error handling
```

---

## Core Authorization Pattern

### 1. Extract User Identity

```typescript
// API route handler
export async function POST(req: Request) {
  const memberId = req.headers.get('x-member-id');
  
  if (!memberId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  return handleRequest(memberId);
}
```

### 2. Verify User Ownership

```typescript
// Helper: Get current user's member record
async function getCurrentMember(memberId: string, bookClubId: string) {
  const { data: member, error } = await supabase
    .from('member')
    .select()
    .eq('id', memberId)
    .eq('book_club_id', bookClubId)
    .single();
  
  if (error || !member) {
    throw new Error('Member not found');
  }
  
  return member;
}
```

### 3. Verify Permission for Operation

```typescript
// Helper: Check if user is host of book club
async function isHost(memberId: string, bookClubId: string): Promise<boolean> {
  const member = await getCurrentMember(memberId, bookClubId);
  return member.is_host;
}

// Usage in API route
const isHost = await isHost(memberId, bookClubId);
if (!isHost) {
  return res.status(403).json({ 
    message: 'Only host can perform this action' 
  });
}
```

---

## Authorization by Feature

### F01: Create Book Club

**Who can do it:** Any user (new book club creator)

**Authorization check:** None (new user, no membership yet)

**API responsibility:**
```typescript
export async function POST(req: Request) {
  const { name, nickname, bookTitle, meetingDate } = await req.json();
  
  // 1. Validate input
  if (!name || !nickname || !bookTitle) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  
  // 2. Create book club
  const { data: bookClub, error: clubError } = await supabase
    .from('book_club')
    .insert([{
      name,
      invite_code: generateInviteCode()
    }])
    .select()
    .single();
  
  if (clubError) {
    return res.status(500).json({ message: 'Failed to create club' });
  }
  
  // 3. Create host member record
  const { data: member, error: memberError } = await supabase
    .from('member')
    .insert([{
      book_club_id: bookClub.id,
      nickname,
      is_host: true
    }])
    .select()
    .single();
  
  if (memberError) {
    return res.status(500).json({ message: 'Failed to create member' });
  }
  
  // 4. Create first meeting
  const { data: meeting } = await supabase
    .from('meeting')
    .insert([{
      book_club_id: bookClub.id,
      book_title: bookTitle,
      meeting_date: meetingDate || new Date().toISOString().split('T')[0],
      status: 'scheduled'
    }])
    .select()
    .single();
  
  // 5. Return new member ID and book club ID
  return res.status(201).json({
    bookClubId: bookClub.id,
    memberId: member.id,
    meetingId: meeting.id
  });
}
```

**RLS Interaction:** No RLS needed (API creates records via service role).

---

### F04: Join Book Club

**Who can do it:** Any authenticated user

**Authorization check:** None (new member)

**API responsibility:**
```typescript
export async function POST(req: Request) {
  const { inviteCode, nickname } = await req.json();
  
  // 1. Find book club by invite code
  const { data: bookClub, error: clubError } = await supabase
    .from('book_club')
    .select()
    .eq('invite_code', inviteCode)
    .single();
  
  if (clubError || !bookClub) {
    return res.status(404).json({ 
      message: 'Book club not found' 
    });
  }
  
  // 2. Check if already a member
  const { data: existing } = await supabase
    .from('member')
    .select('id')
    .eq('book_club_id', bookClub.id)
    // After TASK 04: .eq('user_id', auth.uid())
    .eq('nickname', nickname); // Current MVP workaround
  
  if (existing && existing.length > 0) {
    return res.status(400).json({ 
      message: 'Already a member of this club' 
    });
  }
  
  // 3. Create member record
  const { data: member, error: memberError } = await supabase
    .from('member')
    .insert([{
      book_club_id: bookClub.id,
      nickname,
      is_host: false
    }])
    .select()
    .single();
  
  if (memberError) {
    return res.status(500).json({ 
      message: 'Failed to join club' 
    });
  }
  
  // 4. Return member ID for localStorage
  return res.status(201).json({
    bookClubId: bookClub.id,
    memberId: member.id
  });
}
```

**RLS Interaction:** INSERT on member table via RLS (after TASK 04).

---

### F05: Create/Update Reading Record

**Who can do it:** Any club member

**Authorization checks:**
- User is member of the book club
- User owns the reading record (for updates)
- Meeting hasn't started (for updates)

**API responsibility:**

```typescript
export async function POST(req: Request) {
  const memberId = req.headers.get('x-member-id');
  const { bookClubId, meetingId, data: recordData } = await req.json();
  
  // 1. Verify user is member of this club
  const member = await getCurrentMember(memberId, bookClubId);
  if (!member) {
    return res.status(403).json({ 
      message: 'Not a member of this club' 
    });
  }
  
  // 2. Verify meeting exists and belongs to this club
  const { data: meeting, error: meetingError } = await supabase
    .from('meeting')
    .select('status')
    .eq('id', meetingId)
    .eq('book_club_id', bookClubId)
    .single();
  
  if (meetingError || !meeting) {
    return res.status(404).json({ 
      message: 'Meeting not found' 
    });
  }
  
  // 3. Check if already has record for this meeting
  const { data: existing } = await supabase
    .from('reading_record')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('member_id', memberId);
  
  if (existing && existing.length > 0) {
    // User has record - treat as update
    return updateReadingRecord(memberId, meetingId, recordData, meeting);
  } else {
    // New record
    return createReadingRecord(memberId, meetingId, recordData);
  }
}

async function createReadingRecord(memberId: string, meetingId: string, data: any) {
  const { data: record, error } = await supabase
    .from('reading_record')
    .insert([{
      meeting_id: meetingId,
      member_id: memberId,
      memorable_quote: data.memQuote || '',
      discussion_question: data.question || '',
      takeaway: data.takeaway || ''
    }])
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ 
      message: 'Failed to create record' 
    });
  }
  
  return res.status(201).json({ recordId: record.id });
}

async function updateReadingRecord(
  memberId: string,
  meetingId: string,
  data: any,
  meeting: any
) {
  // 4. Check if meeting started (can't edit after start)
  if (meeting.status === 'in_progress' || meeting.status === 'completed') {
    return res.status(403).json({ 
      message: 'Cannot edit record after meeting starts' 
    });
  }
  
  // 5. Update record
  const { data: record, error } = await supabase
    .from('reading_record')
    .update({
      memorable_quote: data.memQuote || '',
      discussion_question: data.question || '',
      takeaway: data.takeaway || ''
    })
    .eq('meeting_id', meetingId)
    .eq('member_id', memberId)
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ 
      message: 'Failed to update record' 
    });
  }
  
  return res.status(200).json({ recordId: record.id });
}
```

**RLS Interaction:**
- INSERT on reading_record via RLS (after TASK 04)
- UPDATE on reading_record via RLS (checks meeting status)

**Error Messages:**
- Not a member → 403 Forbidden
- Meeting not found → 404 Not Found
- Meeting started → 403 Forbidden
- DB error → 500 Internal Server Error

---

### F06: Start Meeting (Host-only)

**Who can do it:** Meeting host only

**Authorization check:** User must be host of the book club

**API responsibility:**

```typescript
export async function POST(req: Request) {
  const memberId = req.headers.get('x-member-id');
  const { bookClubId, meetingId } = await req.json();
  
  // 1. Verify user is member of this club
  const member = await getCurrentMember(memberId, bookClubId);
  if (!member) {
    return res.status(403).json({ message: 'Not a member' });
  }
  
  // 2. Verify user is host
  if (!member.is_host) {
    return res.status(403).json({ 
      message: 'Only host can start meeting' 
    });
  }
  
  // 3. Verify meeting exists and belongs to this club
  const { data: meeting } = await supabase
    .from('meeting')
    .select('status')
    .eq('id', meetingId)
    .eq('book_club_id', bookClubId)
    .single();
  
  if (!meeting) {
    return res.status(404).json({ message: 'Meeting not found' });
  }
  
  // 4. Check if already started
  if (meeting.status !== 'scheduled') {
    return res.status(400).json({ 
      message: `Cannot start meeting with status: ${meeting.status}` 
    });
  }
  
  // 5. Update meeting status
  const { data: updatedMeeting, error: updateError } = await supabase
    .from('meeting')
    .update({ status: 'in_progress' })
    .eq('id', meetingId)
    .select()
    .single();
  
  if (updateError) {
    return res.status(500).json({ message: 'Failed to start meeting' });
  }
  
  // 6. Create session record
  const { data: session, error: sessionError } = await supabase
    .from('session')
    .insert([{
      meeting_id: meetingId,
      current_step: 'icebreaker',
      current_question_index: 0,
      remaining_seconds: 300, // 5 minutes for icebreaker
      started_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (sessionError) {
    return res.status(500).json({ message: 'Failed to create session' });
  }
  
  return res.status(200).json({
    meetingId: updatedMeeting.id,
    sessionId: session.id,
    status: 'in_progress'
  });
}
```

**RLS Interaction:**
- No RLS used (API handles via service role)
- RLS prevents direct updates to meeting status
- Session creation via API with proper authorization

**Authorization Verification:**
1. User is authenticated (has memberId)
2. User is member of book club
3. User is host (`is_host = true`)
4. Meeting status is valid for start

---

### F11: Create New Meeting Round (Host-only)

**Who can do it:** Meeting host only

**Authorization check:** User must be host

**API responsibility:**

```typescript
export async function POST(req: Request) {
  const memberId = req.headers.get('x-member-id');
  const { bookClubId, bookTitle, meetingDate } = await req.json();
  
  // 1-3. Verify member and host (same as F06)
  const member = await getCurrentMember(memberId, bookClubId);
  if (!member) return res.status(403).json({ message: 'Not a member' });
  if (!member.is_host) return res.status(403).json({ message: 'Host only' });
  
  // 4. Create new meeting
  const { data: meeting, error } = await supabase
    .from('meeting')
    .insert([{
      book_club_id: bookClubId,
      book_title: bookTitle,
      meeting_date: meetingDate || new Date().toISOString().split('T')[0],
      status: 'scheduled'
    }])
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ message: 'Failed to create meeting' });
  }
  
  return res.status(201).json({
    meetingId: meeting.id,
    status: meeting.status
  });
}
```

---

## Common Authorization Patterns

### Pattern 1: Owner-Only Access

```typescript
async function verifyOwner(memberId: string, recordId: string) {
  const { data: record } = await supabase
    .from('reading_record')
    .select('member_id')
    .eq('id', recordId)
    .single();
  
  if (record.member_id !== memberId) {
    throw new Error('Unauthorized');
  }
}

// Usage
try {
  await verifyOwner(memberId, readingRecordId);
  // Proceed with update
} catch {
  return res.status(403).json({ message: 'Unauthorized' });
}
```

### Pattern 2: Club Membership

```typescript
async function verifyClubMember(memberId: string, bookClubId: string) {
  const { data: member, error } = await supabase
    .from('member')
    .select('id')
    .eq('id', memberId)
    .eq('book_club_id', bookClubId)
    .single();
  
  if (error || !member) {
    throw new Error('Not a member');
  }
}

// Usage
try {
  await verifyClubMember(memberId, bookClubId);
  // Proceed with operation
} catch {
  return res.status(403).json({ message: 'Not a member' });
}
```

### Pattern 3: Host-Only Operations

```typescript
async function verifyHost(memberId: string, bookClubId: string) {
  const { data: member } = await supabase
    .from('member')
    .select('is_host')
    .eq('id', memberId)
    .eq('book_club_id', bookClubId)
    .single();
  
  if (!member?.is_host) {
    throw new Error('Not authorized');
  }
}

// Usage
try {
  await verifyHost(memberId, bookClubId);
  // Proceed with host operation
} catch {
  return res.status(403).json({ message: 'Host only' });
}
```

### Pattern 4: Time-Based Access

```typescript
async function verifyMeetingNotStarted(meetingId: string) {
  const { data: meeting } = await supabase
    .from('meeting')
    .select('status')
    .eq('id', meetingId)
    .single();
  
  if (meeting.status === 'in_progress') {
    throw new Error('Meeting already started');
  }
}

// Usage
try {
  await verifyMeetingNotStarted(meetingId);
  // Allow editing
} catch {
  return res.status(403).json({ message: 'Cannot edit - meeting started' });
}
```

---

## Error Handling Strategy

### Standard Error Response Format

```typescript
interface ErrorResponse {
  message: string;           // User-friendly message
  code?: string;            // Error code for frontend
  details?: string;         // Technical details (dev mode only)
}

// Examples
{
  "message": "Not a member of this club",
  "code": "NOT_MEMBER"
}

{
  "message": "Only host can perform this action",
  "code": "HOST_ONLY"
}

{
  "message": "Cannot edit reading record after meeting starts",
  "code": "MEETING_STARTED"
}
```

### RLS Error Translation

```typescript
async function handleDatabaseError(error: any) {
  if (error.code === 'PGRST201') {
    // RLS denied
    return {
      status: 403,
      message: 'You do not have permission for this action'
    };
  }
  
  if (error.code === '23505') {
    // Unique constraint
    return {
      status: 400,
      message: 'This record already exists'
    };
  }
  
  if (error.code === '23503') {
    // Foreign key constraint
    return {
      status: 404,
      message: 'Referenced record not found'
    };
  }
  
  // Generic error
  return {
    status: 500,
    message: 'Database error'
  };
}
```

---

## Testing Authorization

### Unit Test Example

```typescript
import { POST } from '@/app/api/create-reading-record/route';

describe('Create Reading Record Authorization', () => {
  it('should allow member to create record', async () => {
    const req = new Request('http://localhost/api/create-reading-record', {
      method: 'POST',
      headers: { 'x-member-id': validMemberId },
      body: JSON.stringify({
        bookClubId,
        meetingId,
        data: { memQuote: 'test' }
      })
    });
    
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
  
  it('should deny non-member', async () => {
    const req = new Request('http://localhost/api/create-reading-record', {
      method: 'POST',
      headers: { 'x-member-id': otherClubMemberId },
      body: JSON.stringify({
        bookClubId,
        meetingId,
        data: { memQuote: 'test' }
      })
    });
    
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
  
  it('should deny update after meeting starts', async () => {
    // Setup: meeting status = 'in_progress'
    
    const req = new Request('http://localhost/api/create-reading-record', {
      method: 'POST',
      headers: { 'x-member-id': validMemberId },
      body: JSON.stringify({
        bookClubId,
        meetingId: startedMeetingId,
        data: { memQuote: 'updated' }
      })
    });
    
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
```

---

## Migration to TASK 04 (Authentication)

### Before TASK 04

- Extract `memberId` from localStorage
- Pass via `x-member-id` header
- Verify membership at API level
- Use service role for database operations

### During TASK 04

- User logs in with Supabase auth
- Get access token from auth session
- Pass token to Supabase client
- API validates token (next.js middleware)

### After TASK 04

```typescript
// Middleware verifies auth token
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const supabase = createMiddlewareClient({ req, res: NextResponse.next() });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  return NextResponse.next();
}
```

### RLS Integration

```typescript
// After TASK 04, use authenticated client for RLS
const { data: records } = await supabase
  .from('reading_record')
  .select()
  // RLS automatically filters to user's records
  .eq('meeting_id', meetingId);
  // No need for manual member verification
```

---

## Security Checklist

- [ ] All APIs extract and validate user identity
- [ ] All write operations verify user authorization
- [ ] Host-only operations check `is_host` flag
- [ ] Time-based restrictions enforced (can't edit after start)
- [ ] Error messages don't leak sensitive info
- [ ] RLS policies provide backup security
- [ ] Audit trail maintained (no deletes)
- [ ] After TASK 04: Authenticated client for RLS

---

## References

- [Main Authorization Layer in API](../app/api/)
- [RLS Policies Design (9-RLS-SECURITY.md)](./9-RLS-SECURITY.md)
- [Feature Specification (5-FEATURE-SPEC.md)](./5-FEATURE-SPEC.md)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

