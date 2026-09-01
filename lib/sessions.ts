import { createClient } from "@/utils/supabase/client";

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

/**
 * Start a meeting and create a session
 * Only the host can start meetings
 * Initializes session with current_step='icebreaker'
 *
 * Returns: session id on success
 * Throws: error if not host or meeting not found
 */
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

/**
 * Update session's current step to progress through meeting stages
 * Only the host can update session progress
 *
 * Stages: icebreaker → discussion → takeaway → completed
 * - icebreaker: Ice breaker with memorable quotes
 * - discussion: Discussion with questions
 * - takeaway: Sharing takeaways/learnings
 * - completed: Meeting finished
 */
export async function updateSessionStep(
  sessionId: string,
  step: "icebreaker" | "discussion" | "takeaway" | "completed"
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("update_session_step", {
    p_session_id: sessionId,
    p_step: step,
  });

  if (error) {
    throw new Error(`Failed to update session step: ${error.message}`);
  }
}

/**
 * Advance to the next question/item in current stage
 * Only the host can advance questions
 * Increments current_question_index by 1
 *
 * Used when transitioning between items within the same stage
 */
export async function advanceQuestion(sessionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("advance_question", {
    p_session_id: sessionId,
  });

  if (error) {
    throw new Error(`Failed to advance question: ${error.message}`);
  }
}

/**
 * Get session data for a meeting
 * Returns null if no session exists (meeting not started)
 */
export async function getSession(meetingId: string): Promise<Session | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("session")
    .select(
      "id, meeting_id, current_step, current_question_index, remaining_seconds, started_at, ended_at, created_at, updated_at"
    )
    .eq("meeting_id", meetingId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No session found (meeting not started)
    }
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  return {
    id: data.id,
    meetingId: data.meeting_id,
    currentStep: data.current_step,
    currentQuestionIndex: data.current_question_index || 0,
    remainingSeconds: data.remaining_seconds,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get session by session ID
 * Returns null if not found
 */
export async function getSessionById(sessionId: string): Promise<Session | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("session")
    .select(
      "id, meeting_id, current_step, current_question_index, remaining_seconds, started_at, ended_at, created_at, updated_at"
    )
    .eq("id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  return {
    id: data.id,
    meetingId: data.meeting_id,
    currentStep: data.current_step,
    currentQuestionIndex: data.current_question_index || 0,
    remainingSeconds: data.remaining_seconds,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
