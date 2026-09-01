-- BookClub Application Schema
-- This schema manages book club meetings, members, and reading records

-- ============================================================================
-- BOOK_CLUB Table
-- Root entity representing a single book club
-- ============================================================================
CREATE TABLE book_club (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  invite_code varchar(50) NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_book_club_invite_code ON book_club(invite_code);

-- ============================================================================
-- MEMBER Table
-- Represents participants in a book club
-- One member can participate in multiple meetings
-- Each member belongs to exactly one book club
-- ============================================================================
CREATE TABLE member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_club_id uuid NOT NULL REFERENCES book_club(id) ON DELETE RESTRICT,
  nickname varchar(100) NOT NULL,
  is_host boolean NOT NULL DEFAULT false,
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_member_book_club_id ON member(book_club_id);
CREATE INDEX idx_member_is_host ON member(is_host);

-- ============================================================================
-- MEETING Table
-- Represents a single meeting/session of a book club
-- Each meeting belongs to exactly one book club
-- One meeting can have multiple reading records from members
-- Each meeting has exactly one session
-- ============================================================================
CREATE TABLE meeting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_club_id uuid NOT NULL REFERENCES book_club(id) ON DELETE RESTRICT,
  book_title varchar(255) NOT NULL,
  meeting_date date NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'scheduled',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_meeting_book_club_id ON meeting(book_club_id);
CREATE INDEX idx_meeting_status ON meeting(status);
CREATE INDEX idx_meeting_date ON meeting(meeting_date);

-- ============================================================================
-- READING_RECORD Table
-- Represents a member's reading notes for a specific meeting
-- One member can have exactly one reading record per meeting
-- This is enforced by the UNIQUE constraint on (meeting_id, member_id)
-- ============================================================================
CREATE TABLE reading_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES member(id) ON DELETE RESTRICT,
  memorable_quote text,
  discussion_question text,
  takeaway text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(meeting_id, member_id)
);

CREATE INDEX idx_reading_record_meeting_id ON reading_record(meeting_id);
CREATE INDEX idx_reading_record_member_id ON reading_record(member_id);
CREATE INDEX idx_reading_record_created_at ON reading_record(created_at);

-- ============================================================================
-- SESSION Table
-- Represents the real-time state of a meeting in progress
-- One meeting has exactly one session
-- This is enforced by the UNIQUE constraint on meeting_id
-- ============================================================================
CREATE TABLE session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE UNIQUE,
  current_step varchar(50),
  current_question_index integer DEFAULT 0,
  remaining_seconds integer,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_session_meeting_id ON session(meeting_id);

-- ============================================================================
-- Schema Documentation
-- ============================================================================
--
-- RELATIONSHIPS:
-- - BOOK_CLUB has many MEMBER and MEETING
-- - MEETING has many READING_RECORD and one SESSION
-- - MEMBER writes many READING_RECORD
--
-- KEY CONSTRAINTS:
-- - READING_RECORD has a composite unique constraint (meeting_id, member_id)
--   ensuring one member can have only one reading record per meeting
-- - SESSION has a unique constraint on meeting_id
--   ensuring one meeting can have only one session
--
-- DELETION BEHAVIOR:
-- - Deleting a BOOK_CLUB is restricted if it has members or meetings (RESTRICT)
-- - Deleting a MEETING cascades to READING_RECORD and SESSION (CASCADE)
-- - Deleting a MEMBER is restricted if they have reading records (RESTRICT)
--
-- TIMESTAMPS:
-- - All tables include created_at and updated_at for audit trail
-- - MEMBER includes joined_at for tracking membership start date
-- - SESSION includes started_at and ended_at for meeting timing
--
-- STATUS VALUES (for MEETING.status):
-- - 'scheduled': Meeting is planned but not yet started
-- - 'in_progress': Meeting is currently happening
-- - 'completed': Meeting has finished
-- - 'cancelled': Meeting was cancelled
--
-- CURRENT_STEP VALUES (for SESSION.current_step):
-- - 'icebreaker': Ice breaker stage
-- - 'discussion': Reading discussion stage
-- - 'takeaway': Takeaway sharing stage
-- - 'completed': Session completed
