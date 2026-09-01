import { createClient } from "@/utils/supabase/client";

const USER_ID_STORAGE_KEY = "bookclub_user_id";

/**
 * Sign in anonymously or retrieve existing session
 * If user is already authenticated, returns existing user ID
 * If not, creates new anonymous session
 */
export async function signInAnonymously(): Promise<string> {
  const supabase = createClient();

  // Check if user already has a session
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  if (existingUser?.id) {
    // Already authenticated, return existing user ID
    localStorage.setItem(USER_ID_STORAGE_KEY, existingUser.id);
    return existingUser.id;
  }

  // Not authenticated, sign in anonymously
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(`Failed to sign in anonymously: ${error.message}`);
  }

  if (!data.user?.id) {
    throw new Error("Failed to get user ID from anonymous auth");
  }

  // Store user ID in localStorage for quick access
  localStorage.setItem(USER_ID_STORAGE_KEY, data.user.id);

  return data.user.id;
}

/**
 * Get current authenticated user ID
 * Checks localStorage first, then verifies with Supabase
 */
export async function getCurrentUser(): Promise<string | null> {
  // Try localStorage first for performance
  const storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (storedUserId) {
    return storedUserId;
  }

  // If not in localStorage, check with Supabase
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    localStorage.setItem(USER_ID_STORAGE_KEY, user.id);
    return user.id;
  }

  return null;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  localStorage.removeItem(USER_ID_STORAGE_KEY);
}

/**
 * Check if authentication is ready (user is authenticated)
 */
export async function isAuthReady(): Promise<boolean> {
  const userId = await getCurrentUser();
  return userId !== null;
}
