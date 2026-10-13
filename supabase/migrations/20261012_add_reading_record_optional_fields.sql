-- Add optional fields to reading_record
--
-- - memorable_quote_page: 인상 깊은 부분의 페이지 (text, e.g. "128", "128~130", "p.128")
-- - discussion_passage: 발제와 함께 다시 읽어볼 책의 본문
-- - discussion_note: 발제자가 질문을 떠올린 이유, 맥락 또는 생각
--
-- All columns are nullable and have no default.
-- Existing rows keep NULL values (no backfill).
-- No RLS or RPC changes: reading_record writes go through direct table access,
-- and the existing table-level GRANTs already cover new columns.

ALTER TABLE reading_record
  ADD COLUMN IF NOT EXISTS memorable_quote_page text,
  ADD COLUMN IF NOT EXISTS discussion_passage text,
  ADD COLUMN IF NOT EXISTS discussion_note text;
