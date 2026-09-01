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
User Browser (localStorage: memberId)
    ↓
Next.js API Route (role verification)
    ↓
Supabase Client (authenticated or publishable key)
    ↓
RLS Policies (data access control)
    ↓
PostgreSQL Database
```

---

## Current State (MVP - Before TASK 04)

### Authentication
- No formal Supabase auth yet
- Users identified by `memberId` in browser localStorage
- API routes verify user ownership of member records

### RLS Access
- **Read operations**: Use publishable key (anon access) - allowed for all
- **Write operations**: Would need authenticated access (not yet available)
- Policies prepared for authenticated access (TASK 04 prerequisite)

### MVP Limitations
- RLS policies have temporary `_anon_mvp` policies for read access
- Write operations must validate ownership at API level
- No true user authentication yet

---

## Post-TASK 04 (With Authentication)

### Authentication Setup
1. Supabase auth configured with custom sign-up flow
2. `user_id` column added to `member` table (already in migration)
3. Each member record links to a Supabase auth user: `member.user_id = auth.users.id`

### RLS Enforcement
- Supabase client authenticated with user token
- `auth.uid()` returns current user's UUID in policies
- RLS policies enforce user ownership automatically
- Temporary anonymous policies removed

---

## RLS Policies by Table

### 1. book_club

**Access Pattern:**
- View any book club (need to see details before joining)
- No write operations via RLS (API creates clubs)

**Policies:**

| Operation | Access | Condition |
|-----------|--------|-----------|
| SELECT | Allowed | Any authenticated/anon user (MVP) |
| INSERT | Denied | No policy exists |
| UPDATE | Denied | No policy exists |
| DELETE | Denied | Referential integrity + no policy |

**Security Rationale:**
- Book clubs are semi-public (shared via invite link)
- Visibility doesn't need privacy restriction for MVP
- Creation/modification handled at API level with host authorization

**Future Enhancement:**
- After TASK 04, consider private book clubs requiring membership to view

---

### 2. member

**Access Pattern:**
- View members of book clubs you're in (see participants)
- Join a book club (create own member record)
- Cannot modify or delete membership

**Policies:**

| Operation | Access | Condition |
|-----------|--------|-----------|
| SELECT | Allowed | User is member of same book_club |
| INSERT | Allowed | Can only create own record (user_id = auth.uid()) |
| UPDATE | Denied | No policy exists |
| DELETE | Denied | Referential integrity + no policy |

**Access Control Logic:**

```sql
-- SELECT: User sees members of book clubs they're in
member_id IN (
  SELECT id FROM member WHERE user_id = auth.uid()
)

-- INSERT: User can only create own member record
user_id = auth.uid() AND is_host = false
```

**Security Rationale:**
- Users need to see participants for meeting discussions
- Users can only join once per book club (UNIQUE constraint)
- Cannot set `is_host=true` (default false, API verification needed)
- Member deletion prevented to maintain participant history

**Privilege Escalation Prevention:**
- RLS enforces `is_host = false` on INSERT
- Host promotion/demotion handled at API level
- API must verify requester is current host

---

### 3. meeting

**Access Pattern:**
- View meetings in book clubs you're a member of
- Create meetings (host only, API level)
- Cannot modify or delete meetings

**Policies:**

| Operation | Access | Condition |
|-----------|--------|-----------|
| SELECT | Allowed | User is member of meeting's book_club |
| INSERT | Denied | No policy exists (API-only) |
| UPDATE | Denied | No policy exists (API-only) |
| DELETE | Denied | Referential integrity + no policy |

**Access Control Logic:**

```sql
-- SELECT: User sees meetings of clubs they belong to
meeting.book_club_id IN (
  SELECT book_club_id FROM member WHERE user_id = auth.uid()
)
```

**Business Rules Enforced by RLS:**
- Users cannot see meetings from book clubs they don't belong to
- Status changes prevented via RLS (must go through API)
- Cannot modify meeting schedule without authorization

**API-Level Checks Required:**
- Host verification: Only host can create/modify meetings
- Status transitions: Only host can start or complete meetings

---

### 4. reading_record

**Access Pattern:**
- View all reading notes from book clubs you're in
- Create your own reading record for a meeting
- Edit your own record only before meeting starts
- Cannot delete records

**Policies:**

| Operation | Access | Condition |
|-----------|--------|-----------|
| SELECT | Allowed | User is member of record's meeting's book_club |
| INSERT | Allowed | Only create own record (member_id = current user's member record) |
| UPDATE | Allowed | Own record AND meeting status != 'in_progress' |
| DELETE | Denied | No policy exists |

**Access Control Logic:**

```sql
-- SELECT: User sees records from meetings they participate in
meeting_id IN (
  SELECT m.id FROM meeting m
  WHERE m.book_club_id IN (
    SELECT book_club_id FROM member WHERE user_id = auth.uid()
  )
)

-- INSERT: User can only create record for themselves
member_id IN (
  SELECT id FROM member WHERE user_id = auth.uid()
)

-- UPDATE: Own record + meeting not started
member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
AND meeting_id IN (SELECT id FROM meeting WHERE status != 'in_progress')
```

**Business Rules Enforced:**
- One record per member per meeting (UNIQUE constraint)
- Records locked once meeting starts (status='in_progress')
- Users cannot edit other members' notes
- Complete audit trail maintained (no deletions)

**Feature Spec Implementation:**
- F05: Reading record creation/modification control
- Reading records usable as meeting discussion content
- Pre-meeting editing, locked during meeting

---

### 5. session

**Access Pattern:**
- View real-time meeting progress (current step, timing)
- Cannot create/modify sessions via RLS (host/API only)

**Policies:**

| Operation | Access | Condition |
|-----------|--------|-----------|
| SELECT | Allowed | User is member of session's meeting's book_club |
| INSERT | Denied | No policy exists (API creates on meeting start) |
| UPDATE | Denied | No policy exists (API updates during meeting) |
| DELETE | Denied | Referential integrity + no policy |

**Access Control Logic:**

```sql
-- SELECT: User sees progress of meetings they participate in
meeting_id IN (
  SELECT m.id FROM meeting m
  WHERE m.book_club_id IN (
    SELECT book_club_id FROM member WHERE user_id = auth.uid()
  )
)
```

**Why No Write Policies:**
- Sessions created when host starts meeting (API-driven)
- Progress updates only during active meeting (API-controlled)
- Participants view-only (shouldn't modify progress)

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

## MVP Constraints & Assumptions

### Current Limitations

1. **No User Identification in Database**
   - `member.user_id` exists but not populated yet
   - Can't verify user identity through RLS
   - Workaround: API validates ownership using localStorage memberId

2. **Anonymous Read Access**
   - Policies have `_anon_mvp` variants for publishable key
   - Allow all read access without authentication
   - MUST be removed after TASK 04

3. **API-Level Authorization**
   - RLS can't verify host status (requires comparing member records)
   - API must double-check authorization before write operations
   - Example: Verify host before allowing meeting status change

4. **Session Creation**
   - Sessions created by API, not through INSERT policies
   - No RLS policy protects session creation (API-only)

### After TASK 04 (Authentication Implementation)

1. **User Identification**
   - Supabase auth integrated
   - Each user has unique user_id
   - member.user_id populated with auth user ID

2. **Authenticated Access**
   - All clients use authenticated Supabase tokens
   - RLS policies use `auth.uid()` for user verification
   - Anonymous `_anon_mvp` policies removed

3. **True Host Verification**
   - Can verify host through member table query
   - API can use RLS to list only book clubs user can modify

4. **Enhanced Policies**
   - Consider host-only INSERT/UPDATE policies if needed
   - Implement session creation/modification API policies

---

## Testing RLS Policies

### Pre-TASK 04 Testing (Anonymous Access)

```typescript
// 1. Test read access works without auth
const { data: bookClubs } = await supabase
  .from('book_club')
  .select()
  .limit(1);
// Should return data (anon read allowed)

// 2. Test write requires API (not direct DB)
const { error } = await supabase
  .from('member')
  .insert({ book_club_id: clubId, nickname: 'Test' });
// Should fail (no auth, RLS denies)

// 3. Test API handles writes correctly
const response = await fetch('/api/join-club', {
  method: 'POST',
  body: JSON.stringify({ clubId, nickname })
});
// Should succeed (API validates, creates member record)
```

### Post-TASK 04 Testing (Authenticated Access)

```typescript
// 1. Test authenticated read access
const { data: { session } } = await supabase.auth.getSession();
const client = supabase.setAuth(session.access_token);

const { data: meetings } = await client
  .from('meeting')
  .select();
// Should only return meetings from user's book clubs

// 2. Test ownership enforcement
const { data: others } = await client
  .from('reading_record')
  .select()
  .eq('member_id', 'different_member_id');
// Should return empty (RLS denies)

// 3. Test business rule enforcement
const { error } = await client
  .from('reading_record')
  .update({ memorable_quote: 'New quote' })
  .eq('id', recordId)
  .eq('meeting.status', 'in_progress');
// Should fail (meeting started, RLS denies)

// 4. Test cross-club isolation
const { data: crossClub } = await client
  .from('reading_record')
  .select()
  .in('meeting_id', [other_club_meeting_ids]);
// Should return empty (not a member of that club)
```

### Security Test Scenarios

| Scenario | Expected Behavior | Test Method |
|----------|------------------|------------|
| User views book club they don't belong to | See basic info (MVP) | SELECT book_club (should work) |
| User views members of club they're in | See all members | SELECT member WHERE book_club_id = own_club |
| User views members of club they're NOT in | Should fail | SELECT member WHERE book_club_id = other_club |
| User edits own reading record before meeting | Should succeed | UPDATE own reading_record (meeting.status = scheduled) |
| User edits own reading record after meeting starts | Should fail | UPDATE own reading_record (meeting.status = in_progress) |
| User tries to edit another's reading record | Should fail | UPDATE reading_record (member_id ≠ own) |
| Non-host tries to start meeting | API should deny | POST /api/start-meeting (API verifies host) |
| User deletes reading record | Should fail | DELETE reading_record (no policy exists) |

---

## Implementation Checklist

### Before TASK 04 (Current - MVP Bootstrap)

- [x] RLS migration file created with full policies
- [ ] Deploy RLS migration to Supabase
- [ ] Verify anonymous read access works
- [ ] Verify API-level writes work correctly
- [ ] Test user isolation (different members see different data)
- [ ] Test ownership enforcement at API level
- [ ] Document API authorization logic

### During TASK 04 (Authentication)

- [ ] Add Supabase auth to application
- [ ] Populate member.user_id for existing members
- [ ] Test authenticated access replaces anonymous
- [ ] Verify auth.uid() works in RLS policies
- [ ] Remove all `_anon_mvp` policies
- [ ] Test user isolation via RLS (not just API)
- [ ] Test cross-user data isolation

### Post-TASK 04 (Verification)

- [ ] Verify no anonymous access possible
- [ ] Monitor RLS policy performance
- [ ] Test edge cases (concurrent edits, race conditions)
- [ ] Document any custom auth claims
- [ ] Plan soft-delete implementation if needed
- [ ] Consider additional policies for future features

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

| Error | Cause | User Action |
|-------|-------|------------|
| RLS denies INSERT on member | User not authenticated | Login (TASK 04) |
| RLS denies INSERT on member | is_host=true | API won't send (enforced) |
| RLS denies UPDATE on reading_record | Meeting started | Can't edit (by design) |
| RLS denies SELECT from meeting | Not book club member | Join club first |
| RLS denies DELETE | No policy exists | Deletion not supported |

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

## Next Steps

### Immediate (Sprint Next)

1. Deploy RLS migration to Supabase staging
2. Test anonymous read access in app
3. Verify API writes work correctly
4. Document API authorization requirements

### TASK 04 (Authentication Implementation)

1. Implement Supabase auth
2. Populate member.user_id
3. Remove `_anon_mvp` policies
4. Verify authenticated access via RLS

### Future Enhancements

1. Implement soft delete pattern
2. Add audit logging for compliance
3. Consider host-only RLS policies
4. Performance monitoring & optimization
5. Custom claims for role-based access

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Feature Specification (5-FEATURE-SPEC.md)](./5-FEATURE-SPEC.md)
- [Entity Relationship Diagram (3-ERD.md)](./3-ERD.md)
- [RLS Migration File](../supabase/migrations/20260901_enable_rls_and_policies.sql)

