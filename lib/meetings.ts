import { createClient } from "@/utils/supabase/client";

export interface Meeting {
  id: string;
  bookClubId: string;
  bookTitle: string;
  meetingDate: string;
  status: "scheduled" | "in_progress" | "completed";
  createdAt: string;
}

/**
 * Create a new meeting in a book club
 * Only the host can create meetings
 * Uses RPC function to ensure authorization
 */
export async function createMeeting(
  bookClubId: string,
  bookTitle: string,
  meetingDate: string
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_meeting", {
    p_book_club_id: bookClubId,
    p_book_title: bookTitle,
    p_meeting_date: meetingDate,
  });

  if (error) {
    throw new Error(`Failed to create meeting: ${error.message}`);
  }

  if (!data) {
    throw new Error("Meeting creation returned no data");
  }

  return data;
}

/**
 * Get all meetings for a book club, ordered by date descending
 */
export async function getBookClubMeetings(
  bookClubId: string
): Promise<Meeting[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("meeting")
    .select("id, book_club_id, book_title, meeting_date, status, created_at")
    .eq("book_club_id", bookClubId)
    .order("meeting_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch book club meetings: ${error.message}`);
  }

  return data.map((m) => ({
    id: m.id,
    bookClubId: m.book_club_id,
    bookTitle: m.book_title,
    meetingDate: m.meeting_date,
    status: m.status,
    createdAt: m.created_at,
  }));
}

/**
 * Get the current meeting (status='scheduled') for a book club
 * Returns the most recent scheduled meeting
 */
export async function getCurrentMeeting(
  bookClubId: string
): Promise<Meeting | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("meeting")
    .select("id, book_club_id, book_title, meeting_date, status, created_at")
    .eq("book_club_id", bookClubId)
    .eq("status", "scheduled")
    .order("meeting_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No scheduled meeting found
    }
    throw new Error(`Failed to fetch current meeting: ${error.message}`);
  }

  return {
    id: data.id,
    bookClubId: data.book_club_id,
    bookTitle: data.book_title,
    meetingDate: data.meeting_date,
    status: data.status,
    createdAt: data.created_at,
  };
}

/**
 * Get a meeting by its ID
 * Returns null if not found
 */
export async function getMeetingById(
  meetingId: string
): Promise<Meeting | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("meeting")
    .select("id, book_club_id, book_title, meeting_date, status, created_at")
    .eq("id", meetingId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch meeting: ${error.message}`);
  }

  return {
    id: data.id,
    bookClubId: data.book_club_id,
    bookTitle: data.book_title,
    meetingDate: data.meeting_date,
    status: data.status,
    createdAt: data.created_at,
  };
}
