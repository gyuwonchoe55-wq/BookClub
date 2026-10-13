-- Update session.current_step to support 5-stage meeting progression
--
-- New state values:
-- - 'intro': Introduction stage (free discussion, no recording)
-- - 'memorable_quote': Sharing memorable quotes from the book
-- - 'discussion': Discussion stage with user-submitted questions
-- - 'takeaway': Sharing takeaways/one-liners
-- - 'completed': Session finished
--
-- Maps to 4-stage UI:
-- intro → step1 (인트로)
-- memorable_quote → step2 (진행 1)
-- discussion → step3 (진행 2)
-- takeaway → step4 (마무리)
-- completed → session end

-- Update startMeeting function to initialize current_step to 'intro'
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
  -- current_step starts at 'intro' (instead of 'icebreaker')
  INSERT INTO session (meeting_id, current_step, current_question_index, started_at, created_at, updated_at)
  VALUES (p_meeting_id, 'intro', 0, now(), now(), now())
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- Update update_session_step function to accept new state values
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
  IF p_step NOT IN ('intro', 'memorable_quote', 'discussion', 'takeaway', 'completed') THEN
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

  -- Update current_step
  UPDATE session
  SET current_step = p_step, updated_at = now()
  WHERE id = p_session_id;
END;
$$;
