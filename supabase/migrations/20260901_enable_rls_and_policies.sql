-- BookClub RLS (Row Level Security) Policies
-- Implements data access control using Supabase Anonymous Auth
-- Each user is identified by auth.uid() and mapped to member.user_id
-- Secure RPC functions handle sensitive operations (Book Club creation, Meeting start, etc)

-- ============================================================================
-- PHASE 1: Schema Enhancement for Auth Integration
-- ============================================================================
-- Add user_id column to member table to map Supabase auth users to members

ALTER TABLE member ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT;

-- Create index for user_id lookups
CREATE INDEX idx_member_user_id ON member(user_id);

-- Add unique constraint to ensure one member record per user per book club
ALTER TABLE member ADD CONSTRAINT unique_user_per_bookclub UNIQUE (user_id, book_club_id);

-- ============================================================================
-- PHASE 2: Security Helper Functions (SECURITY DEFINER)
-- ============================================================================
-- These functions avoid RLS recursion by bypassing RLS checks
-- They are used internally by RLS policies and application code

-- Check if current user is a member of a book club
CREATE OR REPLACE FUNCTION is_book_club_member(p_book_club_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM member
    WHERE member.book_club_id = p_book_club_id
    AND member.user_id = auth.uid()
  );
$$;

-- Check if current user is the host of a book club
CREATE OR REPLACE FUNCTION is_book_club_host(p_book_club_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM member
    WHERE member.book_club_id = p_book_club_id
    AND member.user_id = auth.uid()
    AND member.is_host = true
  );
$$;

-- Check if a member and meeting belong to the same book club
-- Used for validating reading record ownership and consistency
-- Avoids RLS recursion by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_member_of_meeting(p_member_id uuid, p_meeting_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM member m
    INNER JOIN meeting mt ON m.book_club_id = mt.book_club_id
    WHERE m.id = p_member_id
    AND m.user_id = auth.uid()
    AND mt.id = p_meeting_id
  );
$$;

-- Restrict execution of helper functions to authenticated users only
REVOKE ALL ON FUNCTION is_book_club_member(uuid) FROM public;
REVOKE ALL ON FUNCTION is_book_club_host(uuid) FROM public;
REVOKE ALL ON FUNCTION is_member_of_meeting(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION is_book_club_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_book_club_host(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_member_of_meeting(uuid, uuid) TO authenticated;

-- ============================================================================
-- PHASE 3: Secure RPC Functions for Book Club Operations
-- ============================================================================
-- These functions handle sensitive multi-step operations with proper authorization

-- Create a new Book Club with host member and first meeting
-- Returns: (book_club_id, member_id, meeting_id)
CREATE OR REPLACE FUNCTION create_book_club_with_host(
  p_name varchar(255),
  p_invite_code varchar(50),
  p_host_nickname varchar(100),
  p_book_title varchar(255),
  p_meeting_date date
)
RETURNS TABLE(book_club_id uuid, member_id uuid, meeting_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_book_club_id uuid;
  v_member_id uuid;
  v_meeting_id uuid;
BEGIN
  -- Input validation
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Book club name cannot be empty';
  END IF;
  IF p_invite_code IS NULL OR TRIM(p_invite_code) = '' THEN
    RAISE EXCEPTION 'Invite code cannot be empty';
  END IF;
  IF p_host_nickname IS NULL OR TRIM(p_host_nickname) = '' THEN
    RAISE EXCEPTION 'Host nickname cannot be empty';
  END IF;
  IF p_book_title IS NULL OR TRIM(p_book_title) = '' THEN
    RAISE EXCEPTION 'Book title cannot be empty';
  END IF;

  -- Step 1: Create book club
  INSERT INTO book_club (name, invite_code, created_at, updated_at)
  VALUES (p_name, p_invite_code, now(), now())
  RETURNING id INTO v_book_club_id;

  -- Step 2: Create host member
  -- Host is identified by current auth.uid()
  INSERT INTO member (book_club_id, user_id, nickname, is_host, joined_at, created_at, updated_at)
  VALUES (v_book_club_id, auth.uid(), p_host_nickname, true, now(), now(), now())
  RETURNING id INTO v_member_id;

  -- Step 3: Create first meeting
  INSERT INTO meeting (book_club_id, book_title, meeting_date, status, created_at, updated_at)
  VALUES (v_book_club_id, p_book_title, p_meeting_date, 'scheduled', now(), now())
  RETURNING id INTO v_meeting_id;

  -- Return results
  RETURN QUERY SELECT v_book_club_id, v_member_id, v_meeting_id;
END;
$$;

-- Join an existing Book Club using invite code
-- Returns: (book_club_id, member_id)
-- Error if: invite code invalid, user already member, nickname empty
CREATE OR REPLACE FUNCTION join_book_club(
  p_invite_code varchar(50),
  p_nickname varchar(100)
)
RETURNS TABLE(book_club_id uuid, member_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_book_club_id uuid;
  v_member_id uuid;
  v_current_user_id uuid;
BEGIN
  -- Capture current user ID once to avoid ambiguity
  v_current_user_id := auth.uid();

  -- Input validation
  IF p_invite_code IS NULL OR TRIM(p_invite_code) = '' THEN
    RAISE EXCEPTION 'Invite code cannot be empty';
  END IF;
  IF p_nickname IS NULL OR TRIM(p_nickname) = '' THEN
    RAISE EXCEPTION 'Nickname cannot be empty';
  END IF;

  -- Step 1: Look up book club by invite code
  -- Use explicit table alias to avoid column ambiguity
  SELECT bc.id INTO v_book_club_id
  FROM book_club bc
  WHERE bc.invite_code = p_invite_code;

  IF v_book_club_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Step 2: Check if user is already a member
  -- Use explicit table alias for clarity
  IF EXISTS(
    SELECT 1
    FROM member m
    WHERE m.book_club_id = v_book_club_id
    AND m.user_id = v_current_user_id
  ) THEN
    RAISE EXCEPTION 'You are already a member of this book club';
  END IF;

  -- Step 3: Create member record for current user
  -- is_host is always false for new members joining via invite code
  INSERT INTO member (book_club_id, user_id, nickname, is_host, joined_at, created_at, updated_at)
  VALUES (v_book_club_id, v_current_user_id, p_nickname, false, now(), now(), now())
  RETURNING id INTO v_member_id;

  -- Return results with explicit local variables
  RETURN QUERY SELECT v_book_club_id, v_member_id;
END;
$$;

-- Create a new meeting in an existing book club
-- Only the host can create meetings
CREATE OR REPLACE FUNCTION create_meeting(
  p_book_club_id uuid,
  p_book_title varchar(255),
  p_meeting_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting_id uuid;
BEGIN
  -- Authorization: Only host can create meetings
  IF NOT is_book_club_host(p_book_club_id) THEN
    RAISE EXCEPTION 'Only the host can create new meetings';
  END IF;

  -- Create meeting
  INSERT INTO meeting (book_club_id, book_title, meeting_date, status, created_at, updated_at)
  VALUES (p_book_club_id, p_book_title, p_meeting_date, 'scheduled', now(), now())
  RETURNING id INTO v_meeting_id;

  RETURN v_meeting_id;
END;
$$;

-- Start a meeting (create session and update status)
-- Only the host can start meetings
CREATE OR REPLACE FUNCTION start_meeting(
  p_meeting_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_book_club_id uuid;
  v_session_id uuid;
BEGIN
  -- Get book_club_id from meeting
  SELECT book_club_id INTO v_book_club_id
  FROM meeting
  WHERE id = p_meeting_id;

  IF v_book_club_id IS NULL THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;

  -- Authorization: Only host can start meetings
  IF NOT is_book_club_host(v_book_club_id) THEN
    RAISE EXCEPTION 'Only the host can start meetings';
  END IF;

  -- Update meeting status to in_progress
  UPDATE meeting
  SET status = 'in_progress', updated_at = now()
  WHERE id = p_meeting_id;

  -- Create session for the meeting
  -- current_step starts at 'icebreaker'
  -- See TASK 10~13 for session progress update functions
  INSERT INTO session (meeting_id, current_step, current_question_index, started_at, created_at, updated_at)
  VALUES (p_meeting_id, 'icebreaker', 0, now(), now(), now())
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- End a meeting (update status and session)
-- Only the host can end meetings
CREATE OR REPLACE FUNCTION end_meeting(
  p_meeting_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_book_club_id uuid;
BEGIN
  -- Get book_club_id from meeting
  SELECT book_club_id INTO v_book_club_id
  FROM meeting
  WHERE id = p_meeting_id;

  IF v_book_club_id IS NULL THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;

  -- Authorization: Only host can end meetings
  IF NOT is_book_club_host(v_book_club_id) THEN
    RAISE EXCEPTION 'Only the host can end meetings';
  END IF;

  -- Update meeting status to completed
  UPDATE meeting
  SET status = 'completed', updated_at = now()
  WHERE id = p_meeting_id;

  -- Update session end time
  UPDATE session
  SET ended_at = now(), updated_at = now()
  WHERE meeting_id = p_meeting_id;
END;
$$;

-- Restrict execution of RPC functions to authenticated users only
REVOKE ALL ON FUNCTION create_book_club_with_host(varchar, varchar, varchar, varchar, date) FROM public;
REVOKE ALL ON FUNCTION join_book_club(varchar, varchar) FROM public;
REVOKE ALL ON FUNCTION create_meeting(uuid, varchar, date) FROM public;
REVOKE ALL ON FUNCTION start_meeting(uuid) FROM public;
REVOKE ALL ON FUNCTION end_meeting(uuid) FROM public;
GRANT EXECUTE ON FUNCTION create_book_club_with_host(varchar, varchar, varchar, varchar, date) TO authenticated;
GRANT EXECUTE ON FUNCTION join_book_club(varchar, varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION create_meeting(uuid, varchar, date) TO authenticated;
GRANT EXECUTE ON FUNCTION start_meeting(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION end_meeting(uuid) TO authenticated;

-- ============================================================================
-- PHASE 4: Enable Row Level Security on All Tables
-- ============================================================================

ALTER TABLE book_club ENABLE ROW LEVEL SECURITY;
ALTER TABLE member ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BOOK_CLUB TABLE POLICIES
-- ============================================================================

-- Policy: Allow SELECT on book_club only to members of that club
CREATE POLICY book_club_select_member
  ON book_club
  FOR SELECT
  TO authenticated
  USING (
    -- Use helper function to avoid RLS recursion
    is_book_club_member(id)
  );

-- Policy: Prevent INSERT via RLS (handled by create_book_club_with_host RPC)
-- Policy: Prevent UPDATE via RLS (only backend can update)
-- Policy: Prevent DELETE via RLS (maintains data integrity)

-- ============================================================================
-- MEMBER TABLE POLICIES
-- ============================================================================

-- Policy: Allow SELECT on members to users of the same book club
CREATE POLICY member_select_same_bookclub
  ON member
  FOR SELECT
  TO authenticated
  USING (
    -- Use helper function to avoid RLS recursion
    is_book_club_member(book_club_id)
  );

-- Policy: Allow INSERT on member for users to join a book club
-- Only allows creating own member record with is_host=false
-- Use join_book_club RPC for joining, or create_book_club_with_host for initial creation
CREATE POLICY member_insert_own
  ON member
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only create a member record for themselves
    user_id = auth.uid()
    -- is_host must be false (regular members cannot set themselves as host)
    AND is_host = false
  );

-- Policy: Prevent UPDATE (member details are immutable after creation)
-- Policy: Prevent DELETE (maintains audit trail)

-- ============================================================================
-- MEETING TABLE POLICIES
-- ============================================================================

-- Policy: Allow SELECT on meetings to members of the same book club
CREATE POLICY meeting_select_member_bookclub
  ON meeting
  FOR SELECT
  TO authenticated
  USING (
    -- Use helper function to avoid RLS recursion
    is_book_club_member(book_club_id)
  );

-- Policy: Prevent INSERT via RLS (handled by create_meeting RPC or create_book_club_with_host)
-- Policy: Prevent UPDATE via RLS (handled by start_meeting/end_meeting RPC)
-- Policy: Prevent DELETE via RLS (maintains meeting history)

-- ============================================================================
-- READING_RECORD TABLE POLICIES
-- ============================================================================

-- Policy: Allow SELECT on reading records to members of the same book club
CREATE POLICY reading_record_select_member_bookclub
  ON reading_record
  FOR SELECT
  TO authenticated
  USING (
    -- User can see a reading record if user is a member of that meeting's book club
    meeting_id IN (
      SELECT m.id FROM meeting m
      WHERE is_book_club_member(m.book_club_id)
    )
  );

-- Policy: Allow INSERT on reading record to create own records
-- Validates: member belongs to current user AND member's book_club matches meeting's book_club
CREATE POLICY reading_record_insert_own
  ON reading_record
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Validation 1: member_id must be the current user's member record
    member_id IN (
      SELECT id FROM member WHERE user_id = auth.uid()
    )
    -- Validation 2: member and meeting must be in the same book club
    -- Uses helper function to avoid RLS recursion
    AND is_member_of_meeting(member_id, meeting_id)
  );

-- Policy: Allow UPDATE on own reading records only when meeting is scheduled
-- Validates: member ownership, book_club consistency, and meeting status
CREATE POLICY reading_record_update_own_before_start
  ON reading_record
  FOR UPDATE
  TO authenticated
  USING (
    -- USING clause: Can only read/lock records they created
    member_id IN (
      SELECT id FROM member WHERE user_id = auth.uid()
    )
    -- AND member's book_club matches meeting's book_club
    AND is_member_of_meeting(member_id, meeting_id)
  )
  WITH CHECK (
    -- WITH CHECK clause: Can only modify records they created
    member_id IN (
      SELECT id FROM member WHERE user_id = auth.uid()
    )
    -- AND member's book_club matches meeting's book_club
    AND is_member_of_meeting(member_id, meeting_id)
    -- AND meeting is still in scheduled status (not started yet)
    AND meeting_id IN (
      SELECT id FROM meeting WHERE status = 'scheduled'
    )
  );

-- Policy: Prevent DELETE (maintains audit trail)

-- ============================================================================
-- SESSION TABLE POLICIES
-- ============================================================================

-- Policy: Allow SELECT on sessions to members of the same book club
CREATE POLICY session_select_member_bookclub
  ON session
  FOR SELECT
  TO authenticated
  USING (
    -- User can see a session if user is a member of that meeting's book club
    meeting_id IN (
      SELECT m.id FROM meeting m
      WHERE is_book_club_member(m.book_club_id)
    )
  );

-- Policy: Prevent INSERT via RLS (handled by start_meeting RPC)
-- Policy: Prevent UPDATE via RLS (see TASK 10~13 for session update functions)
-- Policy: Prevent DELETE via RLS (maintains meeting history)

-- ============================================================================
-- SECURITY SUMMARY & AUTHORIZATION MODEL
-- ============================================================================
--
-- Authentication: Supabase Anonymous Auth
-- - Each user automatically authenticated with unique auth.uid()
-- - auth.uid() mapped to member.user_id
-- - No login/signup UI required
--
-- Authorization Levels:
-- 1. Host (is_host = true)
--    - Can create book clubs (via create_book_club_with_host RPC)
--    - Can create new meetings (via create_meeting RPC)
--    - Can start/end meetings (via start_meeting/end_meeting RPC)
--    - Can update session progress (TASK 10~13 - see note below)
--    - Can create/edit own reading records (before meeting starts)
--
-- 2. Member (is_host = false)
--    - Can join book clubs (via join_book_club RPC)
--    - Can create/edit own reading records (while meeting status = 'scheduled')
--    - Can view all members and reading records of their book club
--    - Can view current session progress
--
-- RLS Policies:
-- ✓ SELECT: Restricted via is_book_club_member() helper function
-- ✓ INSERT: Only allowed for own records (user_id = auth.uid())
-- ✓ UPDATE: Only for reading_records (own + status = 'scheduled'), other updates via RPC
-- ✓ DELETE: Completely blocked across all tables
--
-- Safe RPC Functions (SECURITY DEFINER, authenticated users only):
-- - create_book_club_with_host() - Creates book club, host member, first meeting
-- - join_book_club() - User joins existing book club with invite code
-- - create_meeting() - Creates new meeting (host only)
-- - start_meeting() - Starts meeting and creates session (host only)
-- - end_meeting() - Ends meeting (host only)
--
-- Helper Functions (SECURITY DEFINER, authenticated users only):
-- - is_book_club_member(book_club_id) - Avoids RLS recursion
-- - is_book_club_host(book_club_id) - Avoids RLS recursion
-- - is_member_of_meeting(member_id, meeting_id) - Validates member and meeting belong to same book_club
--
-- Session Progress Update (TASK 10~13):
-- - Session's current_step and current_question_index are managed during meeting
-- - Progress functions will be implemented in TASK 10 (start meeting)
-- - Updates: update_session_step(), advance_question(), etc.
-- - Only host can update session progress (will be enforced in TASK 10~13)
--
-- Why No Backend Required:
-- - User identification: auth.uid() from Supabase
-- - Data isolation: RLS policies enforce access control
-- - Secure operations: SECURITY DEFINER RPC functions with auth checks
-- - Authorization: is_host flag + helper functions
-- - No Express/NestJS needed
-- - No service role key needed
--
-- Data Flow Example - Book Club Creation:
-- 1. Frontend calls create_book_club_with_host(name, code, nickname, book, date) RPC
-- 2. Database validates auth.uid() exists (Supabase ensures user authenticated)
-- 3. Creates: book_club + member (is_host=true) + meeting (status='scheduled')
-- 4. Frontend receives book_club_id, member_id, meeting_id
-- 5. User is now identified as member.user_id = auth.uid()
--
-- Data Flow Example - Book Club Join:
-- 1. User receives invite code from host
-- 2. Frontend calls join_book_club(invite_code, nickname) RPC
-- 3. Database validates invite_code, checks not already member
-- 4. Creates member record with is_host=false
-- 5. User can now see book club data via RLS policies
--
-- Data Flow Example - Reading Record Create:
-- 1. User creates reading record with member_id and meeting_id
-- 2. INSERT policy validates:
--    a) member_id is current user's member (user_id = auth.uid())
--    b) member.book_club_id = meeting.book_club_id (via is_member_of_meeting)
-- 3. If validations pass, record is created
-- 4. RLS prevents creating records for invalid member/meeting combinations
--
-- Data Flow Example - Reading Record Edit:
-- 1. User views/edits reading record before meeting starts
-- 2. UPDATE policy checks:
--    a) member_id owns record (current user's member)
--    b) member and meeting in same book_club (via is_member_of_meeting)
--    c) meeting status = 'scheduled' (not started)
-- 3. If meeting status changes to 'in_progress', policy prevents further edits
-- 4. RLS automatically denies modifications to locked/invalid records
--
-- ============================================================================
-- PHASE 5: Grant Data API Table Privileges to Authenticated Role
-- ============================================================================
-- Minimal privileges required for app functionality
-- All sensitive operations (INSERT/UPDATE to core tables) handled via SECURITY DEFINER RPC
-- DELETE is completely blocked across all tables

-- book_club: SELECT only (via RLS policy: is_book_club_member)
GRANT SELECT ON public.book_club TO authenticated;

-- member: SELECT only (via RLS policy: is_book_club_member)
-- Member creation handled by create_book_club_with_host and join_book_club RPC
GRANT SELECT ON public.member TO authenticated;

-- meeting: SELECT only (via RLS policy: is_book_club_member)
-- Meeting creation handled by create_book_club_with_host and create_meeting RPC
-- Meeting updates handled by start_meeting and end_meeting RPC
GRANT SELECT ON public.meeting TO authenticated;

-- reading_record: SELECT, INSERT, UPDATE
-- SELECT: Via RLS policy checking meeting's book club membership
-- INSERT: Via RLS policy validating member ownership and meeting/member relationship
-- UPDATE: Via RLS policy (own records only, before meeting starts)
-- DELETE: Blocked by RLS (no policy defined)
GRANT SELECT ON public.reading_record TO authenticated;
GRANT INSERT ON public.reading_record TO authenticated;
GRANT UPDATE ON public.reading_record TO authenticated;

-- session: SELECT only
-- Session creation handled by start_meeting RPC
-- Session updates (progress) handled by TASK 10~13 RPC functions (to be implemented)
GRANT SELECT ON public.session TO authenticated;

-- ============================================================================
