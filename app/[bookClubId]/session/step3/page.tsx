"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Button } from "@/components";
import { getSessionById, advanceQuestion, updateSessionStep } from "@/lib/sessions";
import { getMeetingReadingRecords } from "@/lib/reading-records";
import { getBookClubMembers } from "@/lib/members";

interface Question {
  question: string;
  passage: string | null;
  note: string | null;
  memberId: string;
  memberNickname: string;
}

interface PageState {
  isLoading: boolean;
  error: string;
  questions: Question[];
  currentIndex: number;
  remainingTime: number;
  sessionId: string;
  isAdvancing: boolean;
}

const QUESTION_TIME_SECONDS = 300;

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
    questions: [],
    currentIndex: 0,
    remainingTime: QUESTION_TIME_SECONDS,
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

        const questions: Question[] = records
          .filter((r) => r.discussionQuestion)
          .map((r) => ({
            question: r.discussionQuestion!,
            // 기존 기록은 null이므로 빈 값이면 해당 영역을 표시하지 않는다
            passage: r.discussionPassage?.trim() || null,
            note: r.discussionNote?.trim() || null,
            memberId: r.memberId,
            memberNickname: memberMap.get(r.memberId) || "알 수 없음",
          }));

        if (questions.length === 0) {
          throw new Error("No questions found in reading records");
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          questions,
          currentIndex: session.currentQuestionIndex || 0,
          remainingTime: QUESTION_TIME_SECONDS,
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

  useEffect(() => {
    if (state.isLoading || state.error || state.remainingTime === 0) {
      return;
    }

    const timer = setInterval(() => {
      setState((prev) => ({
        ...prev,
        remainingTime: Math.max(0, prev.remainingTime - 1),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isLoading, state.error, state.remainingTime]);

  const handlePrevious = () => {
    if (state.currentIndex > 0) {
      setState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
        remainingTime: QUESTION_TIME_SECONDS,
      }));
    }
  };

  const handleNext = async () => {
    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.questions.length) {
      await handleMoveToStep4();
    } else {
      try {
        setState((prev) => ({
          ...prev,
          isAdvancing: true,
        }));

        await advanceQuestion(state.sessionId);

        setState((prev) => ({
          ...prev,
          currentIndex: nextIndex,
          remainingTime: QUESTION_TIME_SECONDS,
          isAdvancing: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isAdvancing: false,
          error: err instanceof Error ? err.message : "Failed to advance",
        }));
      }
    }
  };

  const handleMoveToStep4 = async () => {
    try {
      setState((prev) => ({
        ...prev,
        isAdvancing: true,
      }));

      await updateSessionStep(state.sessionId, "takeaway");
      router.push(`/${bookClubId}/session/step4?sessionId=${state.sessionId}`);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isAdvancing: false,
        error: err instanceof Error ? err.message : "Failed to move to next step",
      }));
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // 상단 탭 이동: current_step을 먼저 갱신하고, 성공한 경우에만 해당 단계로 이동한다.
  // 탭 클릭만으로 meeting 상태는 바뀌지 않는다(끝내기/모임 종료는 마무리 화면에서만 처리).
  const handleTabClick = async (
    step: "intro" | "memorable_quote" | "discussion" | "takeaway",
    path: "step1" | "step2" | "step3" | "step4"
  ) => {
    if (state.isAdvancing || step === "discussion") return;

    setState((prev) => ({ ...prev, isAdvancing: true }));
    try {
      await updateSessionStep(state.sessionId, step);
      router.push(`/${bookClubId}/session/${path}?sessionId=${state.sessionId}`);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isAdvancing: false,
        error: err instanceof Error ? err.message : "단계 이동에 실패했습니다.",
      }));
    }
  };

  if (state.isLoading) {
    return (
      <div className="bg-red-300 min-h-screen flex items-center justify-center">
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

  if (state.questions.length === 0) {
    return (
      <div className="bg-red-300 min-h-screen flex flex-col items-center justify-center">
        <p className="text-white">진행할 내용이 없습니다.</p>
      </div>
    );
  }

  const currentQuestion = state.questions[state.currentIndex];
  const isLastQuestion = state.currentIndex === state.questions.length - 1;

  return (
    <div className="bg-red-300 min-h-screen flex flex-col">
      {/* Top Navigation */}
      <div className="border-b-4 border-black bg-red-300 flex items-center">
        <div className="flex-1 flex">
          <button
            type="button"
            onClick={() => handleTabClick("intro", "step1")}
            disabled={state.isAdvancing}
            className="flex-1 border-r-4 border-black px-4 py-3 font-bold text-center cursor-pointer"
          >
            인트로
          </button>
          <button
            type="button"
            onClick={() => handleTabClick("memorable_quote", "step2")}
            disabled={state.isAdvancing}
            className="flex-1 border-r-4 border-black px-4 py-3 font-bold text-center cursor-pointer"
          >
            진행 1
          </button>
          <button
            type="button"
            onClick={() => handleTabClick("discussion", "step3")}
            disabled={state.isAdvancing}
            className="flex-1 bg-black text-white border-r-4 border-black px-4 py-3 font-bold text-center"
          >
            진행 2
          </button>
          <button
            type="button"
            onClick={() => handleTabClick("takeaway", "step4")}
            disabled={state.isAdvancing}
            className="flex-1 border-r-4 border-black px-4 py-3 font-bold text-center cursor-pointer"
          >
            마무리
          </button>
        </div>
        <div className="px-4 py-3 font-bold">끝내기</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-3xl">
          <p className="text-sm font-bold text-black">발제 {state.currentIndex + 1}.</p>
          <h2 className="text-3xl font-bold text-black leading-relaxed">
            {currentQuestion.question}
          </h2>
          <p className="text-sm text-black">{currentQuestion.memberNickname}</p>
          {currentQuestion.passage && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-black">함께 읽을 본문</p>
              <p className="text-sm text-black italic whitespace-pre-wrap">
                {currentQuestion.passage}
              </p>
            </div>
          )}
          {currentQuestion.note && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-black">발제자의 말</p>
              <p className="text-sm text-black whitespace-pre-wrap">
                {currentQuestion.note}
              </p>
            </div>
          )}
          <p className="text-4xl font-bold text-black tabular-nums">
            {formatTime(state.remainingTime)}
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
          {state.questions.map((_, idx) => (
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
