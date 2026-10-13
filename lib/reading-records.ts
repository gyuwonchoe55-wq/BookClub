import { createClient } from "@/utils/supabase/client";

export interface ReadingRecord {
  id: string;
  meetingId: string;
  memberId: string;
  memorableQuote?: string;
  memorableQuotePage?: string;
  discussionQuestion?: string;
  discussionPassage?: string;
  discussionNote?: string;
  takeaway?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateReadingRecordData {
  memorableQuote?: string;
  memorableQuotePage?: string;
  discussionQuestion?: string;
  discussionPassage?: string;
  discussionNote?: string;
  takeaway?: string;
}

interface UpdateReadingRecordData {
  memorableQuote?: string;
  memorableQuotePage?: string;
  discussionQuestion?: string;
  discussionPassage?: string;
  discussionNote?: string;
  takeaway?: string;
}

const RECORD_SELECT =
  "id, meeting_id, member_id, memorable_quote, memorable_quote_page, discussion_question, discussion_passage, discussion_note, takeaway, created_at, updated_at";

/**
 * Create a new reading record for a member in a meeting
 */
export async function createReadingRecord(
  meetingId: string,
  memberId: string,
  data: CreateReadingRecordData
): Promise<string> {
  const supabase = createClient();

  const { data: result, error } = await supabase
    .from("reading_record")
    .insert({
      meeting_id: meetingId,
      member_id: memberId,
      memorable_quote: data.memorableQuote || null,
      memorable_quote_page: data.memorableQuotePage || null,
      discussion_question: data.discussionQuestion || null,
      discussion_passage: data.discussionPassage || null,
      discussion_note: data.discussionNote || null,
      takeaway: data.takeaway || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create reading record: ${error.message}`);
  }

  return result.id;
}

/**
 * Update an existing reading record
 * Only the creator can update, and only before meeting starts (status='scheduled')
 */
export async function updateReadingRecord(
  recordId: string,
  data: UpdateReadingRecordData
): Promise<void> {
  const supabase = createClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.memorableQuote !== undefined) {
    updatePayload.memorable_quote = data.memorableQuote || null;
  }
  if (data.memorableQuotePage !== undefined) {
    updatePayload.memorable_quote_page = data.memorableQuotePage || null;
  }
  if (data.discussionQuestion !== undefined) {
    updatePayload.discussion_question = data.discussionQuestion || null;
  }
  if (data.discussionPassage !== undefined) {
    updatePayload.discussion_passage = data.discussionPassage || null;
  }
  if (data.discussionNote !== undefined) {
    updatePayload.discussion_note = data.discussionNote || null;
  }
  if (data.takeaway !== undefined) {
    updatePayload.takeaway = data.takeaway || null;
  }

  const { error } = await supabase
    .from("reading_record")
    .update(updatePayload)
    .eq("id", recordId);

  if (error) {
    throw new Error(`Failed to update reading record: ${error.message}`);
  }
}

/**
 * Get reading record for a specific member in a specific meeting
 */
export async function getReadingRecord(
  meetingId: string,
  memberId: string
): Promise<ReadingRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("reading_record")
    .select(RECORD_SELECT)
    .eq("meeting_id", meetingId)
    .eq("member_id", memberId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch reading record: ${error.message}`);
  }

  return {
    id: data.id,
    meetingId: data.meeting_id,
    memberId: data.member_id,
    memorableQuote: data.memorable_quote,
    memorableQuotePage: data.memorable_quote_page,
    discussionQuestion: data.discussion_question,
    discussionPassage: data.discussion_passage,
    discussionNote: data.discussion_note,
    takeaway: data.takeaway,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get all reading records for a meeting
 */
export async function getMeetingReadingRecords(
  meetingId: string
): Promise<ReadingRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("reading_record")
    .select(RECORD_SELECT)
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch meeting reading records: ${error.message}`);
  }

  return data.map((r) => ({
    id: r.id,
    meetingId: r.meeting_id,
    memberId: r.member_id,
    memorableQuote: r.memorable_quote,
    memorableQuotePage: r.memorable_quote_page,
    discussionQuestion: r.discussion_question,
    discussionPassage: r.discussion_passage,
    discussionNote: r.discussion_note,
    takeaway: r.takeaway,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
