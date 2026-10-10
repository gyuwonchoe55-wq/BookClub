# Row-Level Security (RLS) Policies Design

## Document Purpose

This document explains the Row-Level Security (RLS) policies for the BookClub MVP application. It serves as a security blueprint for understanding data access controls and implementing proper authentication integration.

---

## RLS Overview

Row-Level Security enables fine-grained access control at the database level. Instead of trusting the application layer to enforce permissions, the database itself restricts data access based on defined policies.

**Why RLS matters for BookClub:**
- Prevents unintended data modification through direct database queries
- Ensures users can only see/modify data they own or have access to
- Provides defense-in-depth alongside application-level authorization
- Automatically enforced regardless of how data is accessed

---

## Architecture & Data Flow

```
User Browser
    ↓
signInAnonymously()
    ↓
Supabase Anonymous Auth
    ↓
authenticated user (auth.uid())
    ↓
Next.js Client (Supabase Client with auth token)
    ↓
SECURITY DEFINER RPC or Direct Query
    ↓
RLS Policies (data access control)
    ↓
PostgreSQL Database
```

**Key Points:**
- `signInAnonymously()` creates a Supabase authenticated user with `auth.uid()`
- `auth.uid()` is mapped to `member.user_id` for membership identification
- SECURITY DEFINER RPC functions handle sensitive operations with built-in authorization
- RLS policies use `auth.uid()` and helper functions for access control
- Note: Supabase `anon` role and Anonymous Sign-In `authenticated` user are different concepts

---

## Current Authentication & RLS Implementation

### Anonymous Sign-In Flow
1. User initializes session with `signInAnonymously()`
2. Supabase creates authenticated user with unique `auth.uid()`
3. `auth.uid()` is stored in `member.user_id` when user joins a book club
4. Each data query uses authenticated Supabase client

### User Identification
- **Primary identifier**: `auth.uid()` (Supabase unique user ID)
- **Book club membership link**: `member.user_id = auth.uid()`
- Book club membership is verified through member table lookup
- No registration or login required (anonymous auth)

### Table Privileges & RLS Enforcement

**Current Table Privileges** (authenticated role):
| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| book_club | ✓ | | | |
| member | ✓ | ✓ | | |
| meeting | ✓ | | | |
| reading_record | ✓ | ✓ | ✓ | |
| session | ✓ | | | |

- All tables have RLS enabled
- Data modifications (insert/update) require both table privilege AND RLS policy pass
- Sensitive operations (create book club, join club, start meeting) handled by SECURITY DEFINER RPC
- RPC functions include built-in authorization checks before modifying data
- SELECT operations available through both direct queries (RLS-filtered) and RPC functions

---

## RLS Policies by Table

### 1. book_club

**Access Pattern:**
- Members view only book clubs they belong to
- No direct INSERT/UPDATE operations via RLS
- Book club creation handled by RPC function `create_book_club_with_host`

**Policies:**

| Operation | Access | Condition |
|-----------|--------|-----------|
| SELECT | Allowed | User is member of this book_club |
| INSERT | Denied | No policy exists (use RPC) |
| UPDATE | Denied | No policy exists |
| DELETE | Denied | Referential integrity + no policy |

**Access Control Logic:**
```sql
-- SELECT: User sees only book clubs they're a member of
book_club_id IN (
  SELECT book_club_id FROM member WHERE user_id = auth.uid()
)
```

**Security Rationale:**
- Access verified through membership check using `is_book_club_member()` helper
- Helper function uses `auth.uid()` to identify current user
- Book club creation requires RPC with authorization
- Supports invit-based access model (share invite code, user joins via RPC)

---

### 2. member

**Access Pattern:**
- View members of book clubs you're in (see participants)
- Join a book club via `join_book_club` RPC (creates own member record)
- Cannot modify or delete membership

**Policies:**

| Operation | Access | Condition |
|-----------|--------|-----------|
| SELECT | Allowed | User is member of same book_club |
| INSERT | Allowed | Can only create own record (user_id = auth.uid(), is_host=false) |
| UPDATE | Denied | No policy exists |
| DELETE | Denied | Referential integrity + no policy |

**Access Control Logic:**

```sql
-- SELECT: User sees members of book clubs they're in
is_book_club_member(book_club_id)

-- INSERT: User can only create own member record
(user_id = auth.uid()) AND (is_host = false)
```

**How Users Join:**
- Application calls `join_book_club(invite_code, nickname)` RPC
- RPC validates invite code and checks not already member
- RPC creates member record with user_id = auth.uid(), is_host = false
- RLS INSERT policy enforces is_host = false as additional safeguard

**Security Rationale:**
- Users need to see participants for meeting discussions
- Users can only join once per book club (UNIQUE constraint on user_id + book_club_id)
- `is_host=false` enforced both at RPC level and RLS policy level
- Host promotion/demotion only through backend (no direct table access)
- Member deletion prevented to maintain participant history

---

### 3. meeting

**Access Pattern:**
- View meetings in book clubs you're a member of
- Create meetings via `create_meeting` RPC (host only)
- Start meetings via `start_meeting` RPC (host only, creates session)
- Cannot modify or delete meetings directly

**Policies:**

| Operation | Access | Condition |
|-----------|--------|-----------|
| SELECT | Allowed | User is member of meeting's book_club |
| INSERT | Denied | No policy exists (use RPC) |
| UPDATE | Denied | No policy exists (use RPC) |
| DELETE | Denied | Referential integrity + no policy |

**Access Control Logic:**

```sql
-- SELECT: User sees meetings of clubs they belong to
is_book_club_member(book_club_id)
```

**How Meetings Are Created/Started:**
- Host calls `create_meeting(book_club_id, book_title, meeting_date)` RPC
  - RPC checks `is_book_club_host()` before creating
  - Creates meeting with status='scheduled'
  
- Host calls `start_meeting(meeting_id)` RPC
  - RPC checks `is_book_club_host()` before starting
  - Updates meeting status to 'in_progress'
  - Creates session with current_step='icebreaker'

**Security Rationale:**
- Meetings visible only to book club members
- Meeting creation/status changes require host authorization checked in RPC
- Status transitions controlled via RPC, not direct table updates
- Prevents unauthorized meeting creation or schedule changes

---

### 4. reading_record

**Access Pattern:**
- View all reading notes from book clubs you're in
- Create your own reading record for a meeting
- Edit your own record only before meeting starts (status='scheduled')
- Cannot delete records (audit trail maintained)

**Policies:**

| Operation | Access | Condition |
|-----------|--------|-----------|
| SELECT | Allowed | User is member of record's meeting's book_club |
| INSERT | Allowed | User creates own record for own member + same book_club |
| UPDATE | Allowed | Own record AND meeting status = 'scheduled' |
| DELETE | Denied | No policy exists |

**Access Control Logic:**

```sql
-- SELECT: User sees records from meetings they participate in
meeting_id IN (
  SELECT m.id FROM meeting m
  WHERE is_book_club_member(m.book_club_id)
)

-- INSERT: User can only create record for themselves in their book club
(member_id IN (SELECT id FROM member WHERE user_id = auth.uid()))
AND is_member_of_meeting(member_id, meeting_id)

-- UPDATE: Own record + meeting must be scheduled
member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
AND is_member_of_meeting(member_id, meeting_id)
AND meeting_id IN (SELECT id FROM meeting WHERE status = 'scheduled')
```

**Helper Functions Used:**
- `is_member_of_meeting()`: Verifies member and meeting belong to same book_club
- Avoids RLS recursion by using SECURITY DEFINER

**Business Rules Enforced:**
- One record per member per meeting (UNIQUE constraint)
- Records locked when meeting starts (status='in_progress')
- Users cannot modify other members' notes
- Complete audit trail maintained (no deletions, only create/update)
- Records become read-only once meeting begins

---

### 5. session

**Access Pattern:**
- View real-time meeting progress (current step, question index)
- Cannot create/modify sessions directly via RLS
- Session creation and progress updates via RPC functions only

**Policies:**

| Operation | Access | Condition |
|-----------|--------|-----------|
| SELECT | Allowed | User is member of session's meeting's book_club |
| INSERT | Denied | No policy exists (use RPC) |
| UPDATE | Denied | No policy exists (use RPC) |
| DELETE | Denied | Referential integrity + no policy |

**Access Control Logic:**

```sql
-- SELECT: User sees progress of meetings they participate in
meeting_id IN (
  SELECT m.id FROM meeting m
  WHERE is_book_club_member(m.book_club_id)
)
```

**How Sessions Are Managed:**
- Host calls `start_meeting(meeting_id)` RPC
  - Creates session with current_step='icebreaker'
  - One session per meeting (UNIQUE constraint)
  
- Host calls `update_session_step(session_id, step)` RPC during meeting
  - Verifies host authorization before updating
  - Progresses through: icebreaker → discussion → takeaway → completed
  
- Host calls `advance_question(session_id)` RPC
  - Increments current_question_index within a step

**Why No Direct Write Access:**
- Sessions only created/modified during active meeting
- Host-only operations verified in RPC functions
- Prevents unauthorized progress manipulation
- Ensures step progression follows defined sequence

---

## Security Features

### 1. User Isolation

**Problem:** Prevent users from seeing/modifying data from other book clubs.

**Solution:** All policies check club membership through `member` table.

**Verification:**
```sql
-- User Alice only sees meetings from book clubs where Alice is a member
SELECT * FROM meeting
WHERE book_club_id IN (
  SELECT book_club_id FROM member WHERE user_id = alice_user_id
)
```

### 2. Ownership Enforcement

**Problem:** Prevent users from modifying others' reading records.

**Solution:** INSERT/UPDATE policies check `member_id` belongs to current user.

**Verification:**
```sql
-- User can only update their own reading records
UPDATE reading_record
WHERE member_id = (
  SELECT id FROM member WHERE user_id = auth.uid()
)
```

### 3. Business Logic Enforcement

**Problem:** Allow editing reading records only before meeting starts.

**Solution:** UPDATE policy checks `meeting.status != 'in_progress'`.

**Verification:**
```sql
-- Records locked when meeting.status = 'in_progress'
-- UPDATE fails even if user owns the record
```

### 4. Deletion Prevention

**Problem:** Maintain audit trail and prevent accidental data loss.

**Solution:**
- No DELETE policies on any table
- Database constraints prevent orphaned records
- Cascade deletes only on meeting deletion

**If Removal Needed:**
- Implement soft delete (add `deleted_at` column)
- RLS policies can filter out soft-deleted records
- Maintains audit trail while hiding deleted data

### 5. Privilege Escalation Prevention

**Problem:** Prevent non-hosts from gaining host permissions.

**Solution:**
- RLS enforces `is_host = false` on member INSERT
- Host promotion/demotion only at API level
- API must re-verify host status on each operation

---

## Current Implementation Notes

### Sensitive Operations via SECURITY DEFINER RPC

The following operations bypass direct table access in favor of SECURITY DEFINER RPC functions:

1. **Book Club Creation**: `create_book_club_with_host()`
   - Creates book_club, member (as host), and initial meeting atomically
   - Verifies input data
   - Links user via `auth.uid()` → `member.user_id`

2. **Joining Book Club**: `join_book_club()`
   - Validates invite code
   - Checks user not already member
   - Creates member record with `user_id = auth.uid()`
   - Enforces `is_host = false`

3. **Meeting Management**:
   - `create_meeting()`: Host-only, creates new meeting
   - `start_meeting()`: Host-only, updates status to 'in_progress', creates session
   - `update_session_step()`: Host-only, progresses meeting through stages
   - `advance_question()`: Host-only, increments question index

### Authorization Pattern

All SECURITY DEFINER RPC functions:
1. Check user identity via `auth.uid()`
2. Verify membership via `is_book_club_member()`
3. Verify host status via `is_book_club_host()` where needed
4. Perform operation with elevated privileges
5. Return results or raise exception

This ensures sensitive operations cannot be bypassed through direct table access.

---

## Testing RLS Policies

### Authenticated Access Testing

All users access BookClub through anonymous Supabase authentication. Tests verify RLS enforcement:

```typescript
// 1. Test authenticated read access
// User signed in with signInAnonymously(), client uses auth token
const { data: bookClubs } = await supabase
  .from('book_club')
  .select();
// Should only return book clubs user is a member of

const { data: meetings } = await supabase
  .from('meeting')
  .select();
// Should only return meetings from user's book clubs

// 2. Test membership isolation
const { data: members } = await supabase
  .from('member')
  .select()
  .eq('book_club_id', club_a_id);
// Works: User is member of club_a

const { data: other_members } = await supabase
  .from('member')
  .select()
  .eq('book_club_id', club_b_id);
// Returns empty: User is not member of club_b

// 3. Test reading record access
const { data: own_records } = await supabase
  .from('reading_record')
  .select()
  .eq('member_id', user_member_id);
// Works: User's own records from clubs they're in

const { data: others } = await supabase
  .from('reading_record')
  .select()
  .eq('member_id', 'other_user_member_id');
// Returns empty: RLS denies access to other users' records

// 4. Test record modification constraints
const { error } = await supabase
  .from('reading_record')
  .update({ memorable_quote: 'New quote' })
  .eq('id', recordId);
// Succeeds if: user owns record AND meeting.status = 'scheduled'
// Fails if: meeting has started (status != 'scheduled')
```

### Security Test Scenarios

| Scenario | Expected Behavior | Why |
|----------|------------------|-----|
| User views book club they're member of | See book club details | RLS: is_book_club_member() check passes |
| User views book club they're NOT member of | No data returned | RLS: is_book_club_member() check fails |
| User views members of their book club | See all members | RLS: is_book_club_member() check passes |
| User views members of other book club | No data returned | RLS: is_book_club_member() check fails |
| User views own reading records | See own records | RLS: member_id IN (own member IDs) |
| User views other's reading records | No data returned | RLS: is_book_club_member() on meeting check |
| User edits own record (meeting scheduled) | Update succeeds | RLS: ownership + status='scheduled' both pass |
| User edits own record (meeting started) | Update fails | RLS: status != 'scheduled' check fails |
| User tries to edit another's record | Update fails | RLS: member_id ownership check fails |
| Non-host calls start_meeting RPC | RPC fails | SECURITY DEFINER: is_book_club_host() check fails |
| User tries to delete record | Delete fails | RLS: No DELETE policy exists on any table |
| Non-authenticated user accesses tables | All fail | table privilege: authenticated role only |

---

## Current Implementation Status

### Deployed & Active

- [x] RLS enabled on all core tables
- [x] RLS migration deployed to Supabase Production
- [x] Anonymous sign-in (`signInAnonymously()`) implemented
- [x] `member.user_id` populated with `auth.uid()` on user join
- [x] All SECURITY DEFINER RPC functions implemented and active
- [x] User isolation enforced via RLS policies
- [x] Reading record ownership enforced via RLS
- [x] Meeting status transitions via RPC (host-only)
- [x] Session management via RPC (host-only)

### Verified & Tested

- [x] Authenticated user access (via `auth.uid()`)
- [x] Cross-book-club data isolation
- [x] Reading record update restrictions (status='scheduled' only)
- [x] Host authorization on sensitive operations
- [x] Member deletion prevention (referential integrity)
- [x] Member unique constraint (one per user per book club)
- [x] RLS policy application on direct queries
- [x] RLS policy application on RPC functions

---

## Common RLS Patterns

### Pattern 1: User Ownership

**Use Case:** User can only access their own records.

```sql
CREATE POLICY user_can_access_own
  ON table_name
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

**In BookClub:** Reading records (user owns through member_id).

### Pattern 2: Team/Club Membership

**Use Case:** User can access records from teams/clubs they're members of.

```sql
CREATE POLICY member_can_access_club_data
  ON table_name
  FOR SELECT
  TO authenticated
  USING (
    club_id IN (
      SELECT club_id FROM membership WHERE user_id = auth.uid()
    )
  );
```

**In BookClub:** Meetings, reading_record (through book club membership).

### Pattern 3: Role-Based Access

**Use Case:** Only admins/hosts can modify records.

```sql
CREATE POLICY admin_can_modify
  ON table_name
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    -- Additional check for new data
    true
  );
```

**In BookClub:** Host-only operations (API-enforced, RLS not used yet).

### Pattern 4: Time-Based Access

**Use Case:** Access only allowed during specific conditions.

```sql
CREATE POLICY can_edit_before_deadline
  ON table_name
  FOR UPDATE
  TO authenticated
  USING (created_at > NOW() - INTERVAL '1 day')
  WITH CHECK (updated_at < deadline_timestamp);
```

**In BookClub:** Reading records before meeting starts.

### Pattern 5: Immutable Records

**Use Case:** Prevent all modifications after creation.

```sql
CREATE POLICY prevent_update
  ON table_name
  FOR UPDATE
  USING (false);

CREATE POLICY prevent_delete
  ON table_name
  FOR DELETE
  USING (false);
```

**In BookClub:** Session, meeting (no modifications).

---

## Performance Considerations

### RLS Overhead

RLS policies are evaluated for each row accessed. Complex policies can impact query performance.

**Optimization Strategies:**

1. **Use Indexed Lookups**
   ```sql
   -- ✓ Good: Uses index on (user_id, book_club_id)
   book_club_id IN (
     SELECT book_club_id FROM member
     WHERE user_id = auth.uid()
   )

   -- ✗ Bad: Full table scan
   book_club_id = ANY (ARRAY(SELECT book_club_id FROM member))
   ```

2. **Minimize Subqueries**
   - Each subquery evaluated per row
   - Complex policies (3+ joins) can be slow
   - Consider denormalization if needed

3. **Leverage Indexes**
   - Create indexes on frequently queried columns
   - BookClub has: idx_member_user_id, idx_member_book_club_id
   - Add more if performance degrades

4. **Use Explain Analyze**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM meeting
   WHERE book_club_id IN (
     SELECT book_club_id FROM member
     WHERE user_id = auth.uid()
   );
   ```

### Current Indexes

```sql
CREATE INDEX idx_member_user_id ON member(user_id);
CREATE INDEX idx_member_book_club_id ON member(book_club_id);
CREATE INDEX idx_member_book_club_id ON member(book_club_id);
CREATE INDEX idx_reading_record_member_id ON reading_record(member_id);
-- ... (see migration file for complete list)
```

---

## Error Handling

### RLS Denial Errors

When RLS denies access, Supabase returns:

```javascript
{
  error: 'new row violates row-level security policy',
  code: 'PGRST201',
  message: 'Row-level security policy <policy_name> denies insert ...'
}
```

### Common Scenarios

| Error | Cause | Resolution |
|-------|-------|-----------|
| RLS denies INSERT on member | User not authenticated | signInAnonymously() required first |
| RLS denies INSERT on member | is_host=true attempted | Use RPC (RLS enforces is_host=false) |
| RLS denies UPDATE on reading_record | Meeting in_progress or completed | Can only edit when status='scheduled' |
| RLS denies SELECT from meeting | Not book club member | Join club via join_book_club() RPC |
| RLS denies DELETE | No policy exists | Deletions blocked by design (audit trail) |
| RPC call fails | User not host | Verify is_host=true in member table |

### API Error Response Pattern

```typescript
// API should catch RLS errors and return user-friendly messages
try {
  const { data, error } = await client
    .from('reading_record')
    .update(newData);
  
  if (error?.code === 'PGRST201') {
    // RLS denied
    return res.status(403).json({
      message: 'Cannot modify this record',
      reason: 'You may not own this record or meeting has started'
    });
  }
} catch (err) {
  return res.status(500).json({ message: 'Database error' });
}
```

---

## Disaster Recovery & Auditing

### Maintaining Audit Trail

Since DELETE is prevented:

1. **Soft Delete Pattern** (Future)
   ```sql
   ALTER TABLE reading_record ADD COLUMN deleted_at timestamptz;
   CREATE POLICY exclude_deleted
     ON reading_record FOR SELECT
     USING (deleted_at IS NULL);
   ```

2. **Audit Table** (Future)
   ```sql
   CREATE TABLE audit_log (
     id uuid PRIMARY KEY,
     table_name text,
     record_id uuid,
     user_id uuid,
     operation text, -- INSERT, UPDATE
     old_data jsonb,
     new_data jsonb,
     timestamp timestamptz DEFAULT now()
   );
   ```

3. **Update Tracking**
   - `updated_at` timestamp on all records
   - Shows when last modified but not what changed
   - Full history would need audit table

### Recovery Procedures

If data mistakenly modified:

1. **Query Update History**
   ```sql
   SELECT id, memorable_quote, updated_at
   FROM reading_record
   WHERE member_id = $1
   ORDER BY updated_at DESC;
   ```

2. **Request Restoration**
   - Check updated_at to find when change occurred
   - Request admin to restore from backup
   - Future: Implement point-in-time restore

3. **Prevent Future Issues**
   - Verify RLS policies working
   - Add read-only replicas for critical data
   - Implement soft delete

---

## Future Enhancements

The current RLS implementation provides a solid security foundation. Future improvements may include:

1. **Soft Delete Pattern**
   - Add `deleted_at` column to tables
   - RLS policies filter soft-deleted records
   - Maintains audit trail while hiding deleted data

2. **Audit Logging**
   - Dedicated audit_log table
   - Tracks INSERT, UPDATE operations
   - Timestamps and user identification

3. **Performance Optimization**
   - Monitor RLS policy execution time
   - Add indexes if queries degrade
   - Profile complex subqueries in policies

4. **Access Control Enhancements**
   - Host-only RLS policies (if needed)
   - Role-based access beyond host/member
   - Time-based access restrictions

5. **Recovery & Compliance**
   - Point-in-time restore capability
   - Compliance audit reports
   - Data retention policies
5. Custom claims for role-based access

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Feature Specification (5-FEATURE-SPEC.md)](./5-FEATURE-SPEC.md)
- [Entity Relationship Diagram (3-ERD.md)](./3-ERD.md)
- [RLS Migration File](../supabase/migrations/20260901_enable_rls_and_policies.sql)

