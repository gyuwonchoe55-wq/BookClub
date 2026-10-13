"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Button } from "@/components";
import { getSessionById, updateSessionStep } from "@/lib/sessions";
import { getMeetingReadingRecords } from "@/lib/reading-records";
import { getBookClubMembers } from "@/lib/members";

interface Sentence {
  sentence: string;
  page: string | null;
  memberId: string;
  memberNickname: string;
}

interface PageState {
  isLoading: boolean;
  error: string;
  sentences: Sentence[];
  currentIndex: number;
  sessionId: string;
  isAdvancing: boolean;
}

export default function Step2Page({
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

        const records = await getMeetingReadingRecords(session.meetingId);
        const members = await getBookClubMembers(bookClubId);
        const memberMap = new Map(members.map((m) => [m.id, m.nickname]));

        const sentences: Sentence[] = records
          .filter((r) => r.memorableQuote)
          .map((r) => ({
            sentence: r.memorableQuote!,
            // 기존 기록은 null이므로 빈 값이면 페이지를 표시하지 않는다
            page: r.memorableQuotePage?.trim() || null,
            memberId: r.memberId,
            memberNickname: memberMap.get(r.memberId) || "알 수 없음",
          }));

        if (sentences.length === 0) {
          throw new Error("No sentences found in reading records");
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          sentences,
          currentIndex: session.currentQuestionIndex || 0,
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

  const handlePrevious = () => {
    if (state.currentIndex > 0) {
      setState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
      }));
    }
  };

  const handleNext = () => {
    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.sentences.length) {
      handleMoveToStep3();
    } else {
      setState((prev) => ({
        ...prev,
        currentIndex: nextIndex,
      }));
    }
  };

  const handleMoveToStep3 = async () => {
    try {
      setState((prev) => ({
        ...prev,
        isAdvancing: true,
      }));

      await updateSessionStep(state.sessionId, "discussion");
      router.push(`/${bookClubId}/session/step3?sessionId=${state.sessionId}`);
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
      <div className="bg-green-500 min-h-screen flex items-center justify-center">
        <p className="text-white">로딩 중...</p>
      </div>
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
          <Button variant="secondary" onClick={() => router.back()} className="w-full">
            돌아가기
          </Button>
        </div>
      </Layout>
    );
  }

  if (state.sentences.length === 0) {
    return (
      <div className="bg-green-500 min-h-screen flex flex-col items-center justify-center">
        <p className="text-white">진행할 내용이 없습니다.</p>
      </div>
    );
  }

  const currentSentence = state.sentences[state.currentIndex];
  const isLastSentence = state.currentIndex === state.sentences.length - 1;

  return (
    <div className="bg-green-500 min-h-screen flex flex-col">
      {/* Top Navigation */}
      <div className="border-b-4 border-black bg-green-500 flex items-center">
        <div className="flex-1 flex">
          <div className="flex-1 border-r-4 border-black px-4 py-3 font-bold text-center">
            인트로
          </div>
          <div className="flex-1 bg-black text-white border-r-4 border-black px-4 py-3 font-bold text-center">
            진행 1
          </div>
          <div className="flex-1 border-r-4 border-black px-4 py-3 font-bold text-center">
            진행 2
          </div>
          <div className="flex-1 border-r-4 border-black px-4 py-3 font-bold text-center">
            마무리
          </div>
        </div>
        <div className="px-4 py-3 font-bold">끝내기</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-6">
          <p className="text-sm font-bold text-black">다음</p>
          <h2 className="text-4xl font-bold text-white">인상깊은 부분</h2>
          <div className="border-b-2 border-black py-4 px-8 max-w-2xl">
            <p className="text-black font-bold text-lg leading-relaxed whitespace-pre-wrap">
              {currentSentence.sentence}
            </p>
          </div>
          {currentSentence.page && (
            <p className="text-sm text-black">페이지 {currentSentence.page}</p>
          )}
          <p className="text-sm font-bold text-black">
            {currentSentence.memberNickname}
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="px-6 py-8 flex items-center justify-center gap-4">
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={state.currentIndex === 0 || state.isAdvancing}
          className="w-12 h-12 rounded-full bg-white text-black border-2 border-white hover:bg-gray-100"
        >
          ◀
        </Button>
        <div className="flex gap-1">
          {state.sentences.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx <= state.currentIndex ? "bg-black" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={state.isAdvancing}
          className="w-12 h-12 rounded-full bg-black text-white hover:bg-gray-800"
        >
          ▶
        </Button>
      </div>
    </div>
  );
}
