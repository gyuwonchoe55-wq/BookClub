import { createClient } from "@/utils/supabase/client";

export interface Member {
  id: string;
  bookClubId: string;
  nickname: string;
  isHost: boolean;
  joinedAt: string;
  userId?: string;
}

interface JoinBookClubResponse {
  bookClubId: string;
  memberId: string;
}

/**
 * Join an existing book club using invite code
 * Uses RPC function to ensure invite code validation and atomic operation
 */
export async function joinBookClub(
  inviteCode: string,
  nickname: string
): Promise<JoinBookClubResponse> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("join_book_club", {
    p_invite_code: inviteCode,
    p_nickname: nickname,
  });

  if (error) {
    throw new Error(`Failed to join book club: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("Join book club returned no data");
  }

  return {
    bookClubId: data[0].book_club_id,
    memberId: data[0].member_id,
  };
}

/**
 * Get all members of a book club
 */
export async function getBookClubMembers(
  bookClubId: string
): Promise<Member[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("member")
    .select("id, book_club_id, nickname, is_host, joined_at, user_id")
    .eq("book_club_id", bookClubId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch book club members: ${error.message}`);
  }

  return data.map((m) => ({
    id: m.id,
    bookClubId: m.book_club_id,
    nickname: m.nickname,
    isHost: m.is_host,
    joinedAt: m.joined_at,
    userId: m.user_id,
  }));
}

/**
 * Get member by user ID within a specific book club
 */
export async function getMemberByUserId(
  bookClubId: string,
  userId: string
): Promise<Member | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("member")
    .select("id, book_club_id, nickname, is_host, joined_at, user_id")
    .eq("book_club_id", bookClubId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch member by user ID: ${error.message}`);
  }

  return {
    id: data.id,
    bookClubId: data.book_club_id,
    nickname: data.nickname,
    isHost: data.is_host,
    joinedAt: data.joined_at,
    userId: data.user_id,
  };
}
