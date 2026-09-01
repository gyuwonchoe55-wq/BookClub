"use client";

import { useEffect, useState } from "react";
import { signInAnonymously } from "@/lib/auth";

interface AuthState {
  userId: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to manage authentication state
 * Automatically signs in anonymously on mount
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    userId: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const userId = await signInAnonymously();
        if (mounted) {
          setState({
            userId,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (mounted) {
          setState({
            userId: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error("Unknown error"),
          });
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
