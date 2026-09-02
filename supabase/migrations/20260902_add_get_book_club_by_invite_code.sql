-- Get book club info by invite code
-- Used by join page to show basic info to unauthenticated users
-- Returns: id, name only (minimal info)
CREATE OR REPLACE FUNCTION get_book_club_by_invite_code(p_invite_code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT book_club.id, book_club.name
  FROM book_club
  WHERE book_club.invite_code = p_invite_code;
END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION get_book_club_by_invite_code(text) TO authenticated;
