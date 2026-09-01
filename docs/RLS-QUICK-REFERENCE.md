# RLS Quick Reference

Quick lookup guide for understanding BookClub RLS policies.

---

## What You Need to Know

### MVP Phase (Current)

- **Read Access**: Allowed via publishable key (anon access)
- **Write Access**: Requires API validation (no auth yet)
- **User ID**: Passed via `x-member-id` header from localStorage

### Post-TASK 04

- **All Access**: Uses authenticated Supabase tokens
- **RLS Enforcement**: Automatic via `auth.uid()` in policies
- **Temporary Policies**: `_anon_mvp` policies removed

---

## Table Access Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **book_club** | Any user | API only | API only | Blocked |
| **member** | Same club | Own record | Blocked | Blocked |
| **meeting** | Same club | API only | API only | Blocked |
| **reading_record** | Same club | Own record | Own + before start | Blocked |
| **session** | Same club | API only | API only | Blocked |

---

## Who Can Do What

### Create Book Club
- Anyone (no membership needed)
- Via API endpoint only
- Returns: `bookClubId`, `memberId`

### Join Book Club
- Anyone with invite code
- Via API endpoint only
- Creates member record (is_host=false)
- Returns: `bookClubId`, `memberId`

### View Book Club Info
- Any member of that book club
- Can see other members, meetings, reading records
- Via SELECT queries (RLS filters)

### Create Reading Record
- Any member of the book club
- For their own member record only
- Via INSERT (RLS enforces ownership)

### Edit Reading Record
- Own record only
- Only before meeting starts (status != 'in_progress')
- Via UPDATE (RLS enforces both checks)

### Start Meeting (Host-Only)
- Book club host only
- Via API endpoint
- API verifies `is_host = true`
- Creates session record
- Changes meeting status to 'in_progress'

### Create New Round (Host-Only)
- Book club host only
- Via API endpoint
- Creates new meeting record

### Delete Records
- **NOT ALLOWED** at any level
- Maintains audit trail
- Use soft delete pattern if needed (future)

---

## Error Response Codes

| Scenario | HTTP Status | Error Code |
|----------|-------------|-----------|
| User not authenticated | 401 | UNAUTHORIZED |
| User not club member | 403 | NOT_MEMBER |
| User is not host | 403 | HOST_ONLY |
| Meeting already started | 403 | MEETING_STARTED |
| Record already exists | 400 | DUPLICATE |
| Meeting not found | 404 | NOT_FOUND |
| RLS denied access | 403 | PERMISSION_DENIED |
| Database error | 500 | DB_ERROR |

---

## API Header Requirements (MVP Phase)

All API requests should include:

```
x-member-id: <uuid from localStorage>
```

Example:
```typescript
const response = await fetch('/api/create-reading-record', {
  method: 'POST',
  headers: {
    'x-member-id': localStorage.getItem('memberId'),
    'content-type': 'application/json'
  },
  body: JSON.stringify({ ... })
});
```

---

## RLS Policy Names

**book_club**
- `book_club_select_authenticated` - Read access (post-TASK 04)
- `book_club_select_anon_mvp` - Read access (MVP only)

**member**
- `member_select_same_bookclub` - See members of your club
- `member_insert_own` - Create own member record
- `member_select_anon_mvp` - Read access (MVP only)
- `member_insert_anon_mvp` - Write access (MVP only)

**meeting**
- `meeting_select_member_bookclub` - See club meetings
- `meeting_select_anon_mvp` - Read access (MVP only)

**reading_record**
- `reading_record_select_member_bookclub` - See club's records
- `reading_record_insert_own` - Create own records
- `reading_record_update_own_before_start` - Edit before meeting
- `reading_record_select_anon_mvp` - Read access (MVP only)
- `reading_record_insert_anon_mvp` - Write access (MVP only)
- `reading_record_update_anon_mvp` - Edit access (MVP only)

**session**
- `session_select_member_bookclub` - See meeting progress
- `session_select_anon_mvp` - Read access (MVP only)

---

## Common Queries

### See all members of my club
```sql
SELECT * FROM member
WHERE book_club_id = $1;
-- RLS filters to clubs you're a member of
```

### See my reading records
```sql
SELECT * FROM reading_record
WHERE member_id = $1;
-- RLS filters to meetings you can access
```

### See all meetings in my club
```sql
SELECT * FROM meeting
WHERE book_club_id = $1;
-- RLS filters to clubs you're in
```

### Check meeting status
```sql
SELECT status FROM meeting
WHERE id = $1;
-- Determines if record can be edited
```

---

## Implementation Steps

### For API Developers

1. **Extract user identity**
   ```typescript
   const memberId = req.headers.get('x-member-id');
   ```

2. **Verify membership** (for club-specific operations)
   ```typescript
   const member = await getCurrentMember(memberId, bookClubId);
   if (!member) throw new Error('Not a member');
   ```

3. **Verify host status** (for host-only operations)
   ```typescript
   if (!member.is_host) throw new Error('Host only');
   ```

4. **Check business rules** (e.g., meeting not started)
   ```typescript
   if (meeting.status === 'in_progress') {
     throw new Error('Meeting already started');
   }
   ```

5. **Make database call** (RLS provides additional protection)
   ```typescript
   const { data, error } = await supabase
     .from('table')
     .operation(conditions);
   ```

6. **Handle errors gracefully**
   ```typescript
   if (error) return errorResponse(error);
   ```

### For Frontend Developers

1. **Store memberId on login**
   ```typescript
   localStorage.setItem('memberId', newMemberId);
   ```

2. **Pass memberId to APIs**
   ```typescript
   const memberId = localStorage.getItem('memberId');
   const response = await fetch('/api/endpoint', {
     headers: { 'x-member-id': memberId },
     ...
   });
   ```

3. **Handle permission errors**
   ```typescript
   if (response.status === 403) {
     // Show "You don't have permission" message
   }
   ```

4. **Disable editing when meeting started**
   ```typescript
   if (meeting.status === 'in_progress') {
     // Disable edit button
   }
   ```

---

## Testing Checklist

- [ ] Can create book club
- [ ] Can join club with invite code
- [ ] Can create reading record for upcoming meeting
- [ ] Cannot edit reading record after meeting starts
- [ ] Can see other members' reading records
- [ ] Cannot see members from other clubs
- [ ] Cannot delete records
- [ ] Host can start meeting
- [ ] Non-host cannot start meeting
- [ ] RLS policies work with authenticated access (post-TASK 04)

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/20260901_enable_rls_and_policies.sql` | RLS implementation |
| `docs/9-RLS-SECURITY.md` | Complete security design |
| `docs/10-API-AUTHORIZATION-GUIDE.md` | API implementation examples |
| `docs/RLS-QUICK-REFERENCE.md` | This file (quick lookup) |

---

## Quick Troubleshooting

### Issue: "Row-level security policy denies..."

**Check:**
1. Are you passing `x-member-id` header? (MVP phase)
2. After TASK 04: Is user authenticated?
3. Is user a member of the target book club?
4. For UPDATE: Is the record yours?
5. For UPDATE: Has meeting started?

### Issue: Cannot see other members' data

**Expected behavior!** This is security working correctly.
- You can only see members of clubs you're in
- They can only see data from their club
- This isolation is enforced by RLS

### Issue: API call works but RLS denies in Supabase console

**This is correct.** Direct database access different from API:
- API uses service role (can bypass RLS)
- Your user account hits RLS policies
- Test via API endpoints, not console queries

---

## Next Steps

1. **Deploy RLS migration** to Supabase
2. **Implement API authorization** checks (see 10-API-AUTHORIZATION-GUIDE.md)
3. **Test MVP** with anonymous read access
4. **Implement TASK 04** (authentication)
5. **Remove temporary `_anon_mvp` policies**
6. **Verify authenticated access** with real users

---

## Questions?

See full documentation:
- **Security Design**: `docs/9-RLS-SECURITY.md`
- **API Implementation**: `docs/10-API-AUTHORIZATION-GUIDE.md`
- **RLS SQL**: `supabase/migrations/20260901_enable_rls_and_policies.sql`

