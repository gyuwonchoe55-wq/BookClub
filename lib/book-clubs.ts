import { createClient } from "@/utils/supabase/client";

interface BookClub {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

interface CreateBookClubResponse {
  bookClubId: string;
  memberId: string;
  meetingId: string;
}

/**
 * Create a new book club with host member and first meeting
 * Uses RPC function to ensure atomic operation
 */
export async function createBookClub(
  name: string,
  inviteCode: string,
  hostNickname: string,
  bookTitle: string,
  meetingDate: string | null
): Promise<CreateBookClubResponse> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_book_club_with_host", {
    p_name: name,
    p_invite_code: inviteCode,
    p_host_nickname: hostNickname,
    p_book_title: bookTitle,
    p_meeting_date: meetingDate,
  });

  if (error) {
    let errorMsg = `Failed to create book club: ${error.message}`;
    if (error.details) errorMsg += ` (Details: ${error.details})`;
    throw new Error(errorMsg);
  }

  if (!data || data.length === 0) {
    throw new Error("Book club creation returned no data");
  }

  return {
    bookClubId: data[0].book_club_id,
    memberId: data[0].member_id,
    meetingId: data[0].meeting_id,
  };
}

/**
 * Get book club by ID
 */
export async function getBookClub(bookClubId: string): Promise<BookClub | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("book_club")
    .select("id, name, invite_code, created_at")
    .eq("id", bookClubId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch book club: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    createdAt: data.created_at,
  };
}

/**
 * Get book club by invite code
 */
export async function getBookClubByInviteCode(
  inviteCode: string
): Promise<BookClub | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("book_club")
    .select("id, name, invite_code, created_at")
    .eq("invite_code", inviteCode)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch book club by invite code: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    createdAt: data.created_at,
  };
}
