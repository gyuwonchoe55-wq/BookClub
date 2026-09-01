-- Session Management Functions and Updated RLS Policies
-- TASK 10: Meeting start and session progress management
-- Implements session progression through meeting stages (icebreaker → discussion → takeaway)

-- ============================================================================
-- PART 1: Session Progress Update Functions
-- ============================================================================

-- Update session's current step
-- Allows host to progress meeting through stages: icebreaker → discussion → takeaway → completed
-- Returns: void
-- Error if: caller not host, session not found, invalid step value
CREATE OR REPLACE FUNCTION update_session_step(
  p_session_id uuid,
  p_step varchar(50)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_book_club_id uuid;
  v_meeting_id uuid;
BEGIN
  -- Validate step value
  IF p_step NOT IN ('icebreaker', 'discussion', 'takeaway', 'completed') THEN
    RAISE EXCEPTION 'Invalid step value: %', p_step;
  END IF;

  -- Get meeting_id and book_club_id from session
  SELECT s.meeting_id INTO v_meeting_id
  FROM session s
  WHERE s.id = p_session_id;

  IF v_meeting_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Get book_club_id from meeting
  SELECT book_club_id INTO v_book_club_id
  FROM meeting
  WHERE id = v_meeting_id;

  IF v_book_club_id IS NULL THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;

  -- Authorization: Only host can update session progress
  IF NOT is_book_club_host(v_book_club_id) THEN
    RAISE EXCEPTION 'Only the host can update session progress';
  END IF;

  -- Update session step
  UPDATE session
  SET current_step = p_step, updated_at = now()
  WHERE id = p_session_id;
END;
$$;

-- Advance to next question in current discussion phase
-- Increments current_question_index by 1
-- Returns: void
-- Error if: caller not host, session not found
CREATE OR REPLACE FUNCTION advance_question(
  p_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_book_club_id uuid;
  v_meeting_id uuid;
  v_current_index integer;
BEGIN
  -- Get meeting_id from session
  SELECT s.meeting_id, s.current_question_index INTO v_meeting_id, v_current_index
  FROM session s
  WHERE s.id = p_session_id;

  IF v_meeting_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Get book_club_id from meeting
  SELECT book_club_id INTO v_book_club_id
  FROM meeting
  WHERE id = v_meeting_id;

  IF v_book_club_id IS NULL THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;

  -- Authorization: Only host can advance questions
  IF NOT is_book_club_host(v_book_club_id) THEN
    RAISE EXCEPTION 'Only the host can advance questions';
  END IF;

  -- Increment question index
  UPDATE session
  SET current_question_index = COALESCE(v_current_index, 0) + 1, updated_at = now()
  WHERE id = p_session_id;
END;
$$;

-- Restrict execution of session functions to authenticated users only
REVOKE ALL ON FUNCTION update_session_step(uuid, varchar) FROM public;
REVOKE ALL ON FUNCTION advance_question(uuid) FROM public;
GRANT EXECUTE ON FUNCTION update_session_step(uuid, varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION advance_question(uuid) TO authenticated;

-- ============================================================================
-- PART 2: Update RLS Policy for Reading Records
-- ============================================================================
-- REQUIREMENT: Block reading_record modifications when meeting is in_progress
-- Current policy (reading_record_update_own_before_start) only allows updates when
-- meeting.status = 'scheduled'. This ensures records are locked during meeting.

-- Policy already enforces this via:
--   AND meeting_id IN (
--     SELECT id FROM meeting WHERE status = 'scheduled'
--   )
--
-- This means:
-- - When meeting.status = 'scheduled': Updates allowed (policy passes)
-- - When meeting.status = 'in_progress': Updates blocked (policy fails)
-- - When meeting.status = 'completed': Updates blocked (policy fails)
--
-- The existing policy is sufficient and needs no changes. This comment documents
-- the intentional design and confirms the requirement is met.

-- ============================================================================
-- TASK 10 Documentation
-- ============================================================================
--
-- MEETING LIFECYCLE:
-- 1. 'scheduled': Users can create/edit reading records
-- 2. 'in_progress': Meeting started, session progresses, reading records locked
-- 3. 'completed': Meeting finished, records finalized
--
-- SESSION PROGRESSION:
-- When host calls start_meeting(meeting_id):
-- 1. meeting.status → 'in_progress'
-- 2. session created with current_step='icebreaker'
-- 3. reading_record UPDATE policy blocks further edits
--
-- During meeting, host progresses through steps:
-- 1. icebreaker: Show memorable quotes (uses current_question_index)
-- 2. discussion: Topic discussion with questions (uses current_question_index)
-- 3. takeaway: Share learning takeaways (uses current_question_index)
-- 4. completed: Meeting finished
--
-- Functions:
-- - start_meeting(p_meeting_id) → returns session_id
--   Creates session and locks records
-- - update_session_step(p_session_id, p_step) → returns void
--   Moves to next stage (icebreaker → discussion → takeaway → completed)
-- - advance_question(p_session_id) → returns void
--   Increments current_question_index for multi-item stages
--
-- RLS Security:
-- - Only authenticated users can call these functions
-- - Only meeting host can execute session functions (checked via is_book_club_host)
-- - Reading record updates automatically blocked by RLS policy when status != 'scheduled'
--
