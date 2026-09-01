"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Button } from "@/components";
import { getSessionById, updateSessionStep } from "@/lib/sessions";
import { getMeetingReadingRecords } from "@/lib/reading-records";
import { getBookClubMembers } from "@/lib/members";

interface Takeaway {
  takeaway: string;
  memberId: string;
  memberNickname: string;
}

interface PageState {
  isLoading: boolean;
  error: string;
  takeaways: Takeaway[];
  currentIndex: number;
  sessionId: string;
  meetingId: string;
  isAdvancing: boolean;
}

export default function Step3Page({
  params,
}: {
  params: Promise<{ bookClubId: string }>;
}) {
  const { bookClubId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [state, setState] = useState<PageState>({
    isLoading: true,
    error: "",
    takeaways: [],
    currentIndex: 0,
    sessionId: sessionId || "",
    meetingId: "",
    isAdvancing: false,
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!sessionId) {
          throw new Error("Session ID not provided");
        }

        // Fetch session
        const session = await getSessionById(sessionId);
        if (!session) {
          throw new Error("Session not found");
        }

        // Fetch meeting and reading records
        const records = await getMeetingReadingRecords(session.meetingId);

        // Fetch members
        const members = await getBookClubMembers(bookClubId);
        const memberMap = new Map(members.map((m) => [m.id, m.nickname]));

        // Extract takeaways from reading records
        const takeaways: Takeaway[] = records
          .filter((r) => r.takeaway)
          .map((r) => ({
            takeaway: r.takeaway!,
            memberId: r.memberId,
            memberNickname: memberMap.get(r.memberId) || "알 수 없음",
          }));

        if (takeaways.length === 0) {
          throw new Error("No takeaways found in reading records");
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          takeaways,
          currentIndex: session.currentQuestionIndex || 0,
          meetingId: session.meetingId,
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
  }, [sessionId, bookClubId]);

  const handleNextTakeaway = async () => {
    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.takeaways.length) {
      // All takeaways completed, end meeting
      await handleEndMeeting();
    } else {
      try {
        setState((prev) => ({
          ...prev,
          isAdvancing: true,
        }));

        // Advance to next takeaway by incrementing currentQuestionIndex
        // (This will be tracked in the session)
        setState((prev) => ({
          ...prev,
          currentIndex: nextIndex,
          isAdvancing: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isAdvancing: false,
          error:
            err instanceof Error ? err.message : "Failed to advance takeaway",
        }));
      }
    }
  };

  const handleEndMeeting = async () => {
    try {
      setState((prev) => ({
        ...prev,
        isAdvancing: true,
      }));

      await updateSessionStep(state.sessionId, "completed");

      // Navigate to completion page
      router.push(
        `/${bookClubId}/session/complete?meetingId=${state.meetingId}`,
      );
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isAdvancing: false,
        error: err instanceof Error ? err.message : "Failed to end meeting",
      }));
    }
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

  if (state.takeaways.length === 0) {
    return (
      <Layout>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <p className="text-gray-600">진행할 적용점이 없습니다.</p>
          <Button
            onClick={() => router.back()}
            className="border border-black px-6 py-2"
          >
            돌아가기
          </Button>
        </div>
      </Layout>
    );
  }

  const currentTakeaway = state.takeaways[state.currentIndex];
  const isLastTakeaway = state.currentIndex === state.takeaways.length - 1;
  const progressText = `${state.currentIndex + 1}/${state.takeaways.length}`;

  return (
    <Layout>
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold">STEP 3 · 마무리하기</h1>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="border border-black">
                <div
                  className="border-r border-black bg-black"
                  style={{
                    height: "4px",
                    width: `${
                      ((state.currentIndex + 1) / state.takeaways.length) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
            <span className="whitespace-nowrap text-sm text-gray-600">
              {progressText}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col justify-center gap-12">
          {/* Participant Number */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              참여자 {state.currentIndex + 1} / {state.takeaways.length}
            </p>
          </div>

          {/* Member Name */}
          <div className="text-center">
            <p className="text-lg font-bold">
              {currentTakeaway.memberNickname}님의 기억
            </p>
          </div>

          {/* Current Takeaway */}
          <div className="text-center">
            <p className="whitespace-pre-wrap text-2xl font-bold leading-relaxed">
              {currentTakeaway.takeaway}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-12">
          <Button
            variant="primary"
            onClick={isLastTakeaway ? handleEndMeeting : handleNextTakeaway}
            disabled={state.isAdvancing}
            className="w-full"
          >
            {isLastTakeaway ? "모임 종료" : "다음 참여자"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
