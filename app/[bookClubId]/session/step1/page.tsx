"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Button } from "@/components";
import { getSessionById, updateSessionStep } from "@/lib/sessions";
import { getMeetingReadingRecords } from "@/lib/reading-records";
import { getBookClubMembers } from "@/lib/members";
import { getMeetingById } from "@/lib/meetings";

interface Step {
  label: string;
  color: string;
}

interface Sentence {
  sentence: string;
  memberId: string;
  memberNickname: string;
}

interface PageState {
  isLoading: boolean;
  error: string;
  sentences: Sentence[];
  currentIndex: number;
  sessionId: string;
  meetingId: string;
  bookTitle: string;
  isAdvancing: boolean;
}

const STEPS: Record<string, Step> = {
  intro: { label: "인트로", color: "bg-orange-400" },
  step1: { label: "진행 1", color: "bg-green-500" },
  step2: { label: "진행 2", color: "bg-red-300" },
  step3: { label: "마무리", color: "bg-yellow-400" },
};

export default function IntroPage({
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
    sentences: [],
    currentIndex: 0,
    sessionId: sessionId || "",
    meetingId: "",
    bookTitle: "",
    isAdvancing: false,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!sessionId) {
          throw new Error("Session ID not provided");
        }

        const session = await getSessionById(sessionId);
        if (!session) {
          throw new Error("Session not found");
        }

        const meeting = await getMeetingById(session.meetingId);
        if (!meeting) {
          throw new Error("Meeting not found");
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          sessionId: session.id,
          meetingId: session.meetingId,
          bookTitle: meeting.bookTitle,
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

  const handleMoveToStep1 = async () => {
    try {
      setState((prev) => ({
        ...prev,
        isAdvancing: true,
      }));

      await updateSessionStep(state.sessionId, "memorable_quote");

      router.push(`/${bookClubId}/session/step2?sessionId=${state.sessionId}`);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isAdvancing: false,
        error: err instanceof Error ? err.message : "Failed to move to next step",
      }));
    }
  };

  if (state.isLoading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center bg-orange-400">
          <p className="text-white">로딩 중...</p>
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
    <div className="bg-orange-400 min-h-screen flex flex-col">
      {/* Top Navigation */}
      <div className="border-b-4 border-black bg-orange-400 flex items-center">
        <div className="flex-1 flex">
          <div className="flex-1 bg-black text-white px-4 py-3 font-bold text-center">
            인트로
          </div>
          <div className="flex-1 border-l-4 border-black px-4 py-3 font-bold text-center">
            진행 1
          </div>
          <div className="flex-1 border-l-4 border-black px-4 py-3 font-bold text-center">
            진행 2
          </div>
          <div className="flex-1 border-l-4 border-black px-4 py-3 font-bold text-center">
            마무리
          </div>
        </div>
        <div className="px-4 py-3 font-bold">끝내기</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-bold text-white">감상 공유</h2>
          <p className="text-3xl font-bold text-black leading-relaxed">
            {state.bookTitle}
            <br />
            어떻게 읽었나요?
          </p>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="px-6 py-8">
        <Button
          variant="primary"
          onClick={handleMoveToStep1}
          disabled={state.isAdvancing}
          className="w-full rounded-full py-4 bg-black text-white hover:bg-gray-800"
        >
          다음
        </Button>
      </div>
    </div>
  );
}
