"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Button } from "@/components";
import { getMeetingById } from "@/lib/meetings";

interface Meeting {
  id: string;
  bookTitle: string;
  status: string;
}

interface PageState {
  isLoading: boolean;
  error: string;
  meeting: Meeting | null;
}

export default function CompletePage({
  params,
}: {
  params: { bookClubId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("meetingId");

  const [state, setState] = useState<PageState>({
    isLoading: true,
    error: "",
    meeting: null,
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!meetingId) {
          throw new Error("Meeting ID not provided");
        }

        // Fetch meeting
        const meeting = await getMeetingById(meetingId);
        if (!meeting) {
          throw new Error("Meeting not found");
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          meeting: {
            id: meeting.id,
            bookTitle: meeting.bookTitle,
            status: meeting.status,
          },
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    };

    loadData();
  }, [meetingId]);

  const handleReturnToClub = () => {
    router.push(`/${params.bookClubId}`);
  };

  if (state.isLoading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </Layout>
    );
  }

  if (state.error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="border border-gray-300 p-4">
            <p className="text-sm text-gray-700 font-medium mb-2">오류 발생</p>
            <p className="text-sm text-gray-600">{state.error}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => router.back()}
            className="w-full"
          >
            돌아가기
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex min-h-screen flex-col items-center justify-center gap-12 px-4">
        {/* Main Message */}
        <div className="text-center">
          <h1 className="text-4xl font-bold">모임이 종료되었습니다</h1>
        </div>

        {/* Secondary Message */}
        <div className="text-center">
          <p className="text-lg text-gray-700">다음에 또 만나요!</p>
        </div>

        {/* Book Title (optional) */}
        {state.meeting && (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              책 제목: {state.meeting.bookTitle}
            </p>
          </div>
        )}

        {/* Return Button */}
        <div className="mt-8 w-full max-w-sm">
          <Button
            variant="primary"
            onClick={handleReturnToClub}
            className="w-full"
          >
            독서모임방으로 돌아가기
          </Button>
        </div>
      </div>
    </Layout>
  );
}
