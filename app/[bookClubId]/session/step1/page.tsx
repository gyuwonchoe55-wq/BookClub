"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Button } from "@/components";
import { getSessionById, updateSessionStep } from "@/lib/sessions";
import { getMeetingReadingRecords } from "@/lib/reading-records";
import { getBookClubMembers } from "@/lib/members";

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
  isAuthorRevealed: boolean;
  sessionId: string;
}

export default function Step1Page({
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
    sentences: [],
    currentIndex: 0,
    isAuthorRevealed: false,
    sessionId: sessionId || "",
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

        // Extract sentences from reading records
        const sentences: Sentence[] = records
          .filter((r) => r.memorableQuote)
          .map((r) => ({
            sentence: r.memorableQuote!,
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
          isAuthorRevealed: false,
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

  const handleRevealAuthor = () => {
    setState((prev) => ({
      ...prev,
      isAuthorRevealed: true,
    }));
  };

  const handleNextSentence = () => {
    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.sentences.length) {
      // All sentences completed, move to STEP 2
      handleMoveToStep2();
    } else {
      setState((prev) => ({
        ...prev,
        currentIndex: nextIndex,
        isAuthorRevealed: false,
      }));
    }
  };

  const handleMoveToStep2 = async () => {
    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
      }));

      await updateSessionStep(state.sessionId, "discussion");

      // Navigate to STEP 2
      router.push(
        `/${params.bookClubId}/session/step2?sessionId=${state.sessionId}`
      );
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to move to STEP 2",
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
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <p className="text-red-600">오류 발생</p>
          <p className="text-gray-600">{state.error}</p>
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

  if (state.sentences.length === 0) {
    return (
      <Layout>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <p className="text-gray-600">진행할 문장이 없습니다.</p>
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

  const currentSentence = state.sentences[state.currentIndex];
  const isLastSentence = state.currentIndex === state.sentences.length - 1;
  const progressText = `${state.currentIndex + 1}/${state.sentences.length}`;

  return (
    <Layout>
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold">STEP 1 · 아이스브레이킹</h1>
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
                    width: `${((state.currentIndex + 1) / state.sentences.length) * 100}%`,
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
          {/* Sentence Number */}
          <div className="text-center">
            <p className="text-sm text-gray-600">문장 {state.currentIndex + 1}</p>
          </div>

          {/* Current Sentence */}
          <div className="text-center">
            <p className="whitespace-pre-wrap text-2xl font-bold leading-relaxed">
              &ldquo;{currentSentence.sentence}&rdquo;
            </p>
          </div>

          {/* Author Section */}
          <div className="space-y-4 text-center">
            {!state.isAuthorRevealed ? (
              <>
                <p className="text-lg text-gray-600">누가 고른 문장일까요?</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold">
                  정답은 {currentSentence.memberNickname}님!
                </p>
                <p className="text-gray-600">
                  {currentSentence.memberNickname}님이 이 문장을 고른 이유를
                  들어볼까요?
                </p>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex gap-4">
          {!state.isAuthorRevealed ? (
            <Button
              onClick={handleRevealAuthor}
              className="flex-1 border border-black px-6 py-3 text-center font-bold"
            >
              작성자 공개
            </Button>
          ) : (
            <Button
              onClick={handleNextSentence}
              disabled={state.isLoading}
              className="flex-1 border border-black px-6 py-3 text-center font-bold disabled:opacity-50"
            >
              {isLastSentence ? "STEP 2로 이동" : "다음 문장"}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
