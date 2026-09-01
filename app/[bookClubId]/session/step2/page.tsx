"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Button } from "@/components";
import { getSessionById, advanceQuestion, updateSessionStep } from "@/lib/sessions";
import { getMeetingReadingRecords } from "@/lib/reading-records";
import { getBookClubMembers } from "@/lib/members";

interface Question {
  question: string;
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

const QUESTION_TIME_SECONDS = 300; // 5 minutes

export default function Step2Page({
  params,
}: {
  params: { bookClubId: string };
}) {
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
        const members = await getBookClubMembers(params.bookClubId);
        const memberMap = new Map(members.map((m) => [m.id, m.nickname]));

        // Extract questions from reading records
        const questions: Question[] = records
          .filter((r) => r.discussionQuestion)
          .map((r) => ({
            question: r.discussionQuestion!,
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
  }, [sessionId, params.bookClubId]);

  // Timer effect
  useEffect(() => {
    if (state.isLoading || state.error) {
      return;
    }

    if (state.remainingTime === 0) {
      return;
    }

    const timer = setInterval(() => {
      setState((prev) => ({
        ...prev,
        remainingTime: Math.max(0, prev.remainingTime - 1),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isLoading, state.error]);

  const handleNextQuestion = async () => {
    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.questions.length) {
      // All questions completed, move to STEP 3
      await handleMoveToStep3();
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
          error:
            err instanceof Error ? err.message : "Failed to advance question",
        }));
      }
    }
  };

  const handleMoveToStep3 = async () => {
    try {
      setState((prev) => ({
        ...prev,
        isAdvancing: true,
      }));

      await updateSessionStep(state.sessionId, "takeaway");

      // Navigate to STEP 3
      router.push(
        `/${params.bookClubId}/session/step3?sessionId=${state.sessionId}`
      );
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isAdvancing: false,
        error:
          err instanceof Error ? err.message : "Failed to move to STEP 3",
      }));
    }
  };

  // Format remaining time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

  if (state.questions.length === 0) {
    return (
      <Layout>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <p className="text-gray-600">진행할 질문이 없습니다.</p>
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

  const currentQuestion = state.questions[state.currentIndex];
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  const progressText = `${state.currentIndex + 1}/${state.questions.length}`;

  return (
    <Layout>
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold">STEP 2 · 이야기 나누기</h1>
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
                    width: `${((state.currentIndex + 1) / state.questions.length) * 100}%`,
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
          {/* Question Number */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              질문 {state.currentIndex + 1} / {state.questions.length}
            </p>
          </div>

          {/* Author */}
          <div className="text-center">
            <p className="text-lg font-bold">
              {currentQuestion.memberNickname}님의 질문
            </p>
          </div>

          {/* Current Question */}
          <div className="text-center">
            <p className="whitespace-pre-wrap text-2xl font-bold leading-relaxed">
              {currentQuestion.question}
            </p>
          </div>

          {/* Timer */}
          <div className="text-center">
            <p className="text-5xl font-bold tabular-nums">
              {formatTime(state.remainingTime)}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-12">
          <Button
            variant="primary"
            onClick={isLastQuestion ? handleMoveToStep3 : handleNextQuestion}
            disabled={state.isAdvancing}
            className="w-full"
          >
            {isLastQuestion ? "STEP 3으로 이동" : "다음 질문"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
