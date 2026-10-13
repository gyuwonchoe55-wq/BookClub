"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Layout, Button, Input, Textarea } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { getBookClub } from "@/lib/book-clubs";
import { getActiveOrCurrentMeeting } from "@/lib/meetings";
import { getMemberByUserId } from "@/lib/members";
import {
  getReadingRecord,
  createReadingRecord,
  updateReadingRecord,
  ReadingRecord,
} from "@/lib/reading-records";

interface PageState {
  meeting: {
    id: string;
    bookTitle: string;
    status: "scheduled" | "in_progress" | "completed";
  } | null;
  existingRecord: ReadingRecord | null;
  currentMemberId: string | null;
  isLoading: boolean;
  error: string;
  isSaving: boolean;
  savingError: string;
}

interface FormData {
  sentence: string;
  sentencePage: string;
  question: string;
  passage: string;
  note: string;
  takeaway: string;
}

export default function ReadingRecordPage({
  params,
}: {
  params: Promise<{ bookClubId: string }>;
}) {
  const { bookClubId } = use(params);
  const router = useRouter();
  const { userId, isLoading: isAuthLoading } = useAuth();

  const [state, setState] = useState<PageState>({
    meeting: null,
    existingRecord: null,
    currentMemberId: null,
    isLoading: true,
    error: "",
    isSaving: false,
    savingError: "",
  });

  const [formData, setFormData] = useState<FormData>({
    sentence: "",
    sentencePage: "",
    question: "",
    passage: "",
    note: "",
    takeaway: "",
  });

  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});

  // Load initial data
  useEffect(() => {
    if (isAuthLoading || !userId) return;

    const loadData = async () => {
      try {
        // Get book club and meeting info
        const bookClub = await getBookClub(bookClubId);
        if (!bookClub) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "독서모임을 찾을 수 없습니다.",
          }));
          return;
        }

        // scheduled: 작성/수정 가능, in_progress: 기존 기록 조회만 가능 (read-only)
        const meeting = await getActiveOrCurrentMeeting(bookClubId);
        if (!meeting) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "현재 모임을 찾을 수 없습니다.",
          }));
          return;
        }

        // Get current user's member ID
        const currentMember = await getMemberByUserId(bookClubId, userId);
        if (!currentMember) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "모임의 참여자로 등록되지 않았습니다.",
          }));
          return;
        }

        // Check for existing reading record
        const existingRecord = await getReadingRecord(meeting.id, currentMember.id);
        if (existingRecord) {
          setFormData({
            sentence: existingRecord.memorableQuote || "",
            sentencePage: existingRecord.memorableQuotePage || "",
            question: existingRecord.discussionQuestion || "",
            passage: existingRecord.discussionPassage || "",
            note: existingRecord.discussionNote || "",
            takeaway: existingRecord.takeaway || "",
          });
        }

        setState((prev) => ({
          ...prev,
          meeting: {
            id: meeting.id,
            bookTitle: meeting.bookTitle,
            status: meeting.status,
          },
          existingRecord: existingRecord,
          currentMemberId: currentMember.id,
          isLoading: false,
          error: "",
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "데이터를 불러오는데 실패했습니다.",
        }));
      }
    };

    loadData();
  }, [bookClubId, userId, isAuthLoading]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.sentence.trim()) {
      errors.sentence = "필수 입력 항목입니다.";
    }
    if (!formData.question.trim()) {
      errors.question = "필수 입력 항목입니다.";
    }
    if (!formData.takeaway.trim()) {
      errors.takeaway = "필수 입력 항목입니다.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !state.meeting || !state.currentMemberId) return;

    setState((prev) => ({
      ...prev,
      isSaving: true,
      savingError: "",
    }));

    try {
      if (state.existingRecord) {
        // Update existing record
        await updateReadingRecord(state.existingRecord.id, {
          memorableQuote: formData.sentence,
          memorableQuotePage: formData.sentencePage,
          discussionQuestion: formData.question,
          discussionPassage: formData.passage,
          discussionNote: formData.note,
          takeaway: formData.takeaway,
        });
      } else {
        // Create new record
        await createReadingRecord(state.meeting.id, state.currentMemberId, {
          memorableQuote: formData.sentence,
          memorableQuotePage: formData.sentencePage,
          discussionQuestion: formData.question,
          discussionPassage: formData.passage,
          discussionNote: formData.note,
          takeaway: formData.takeaway,
        });
      }

      // Redirect back to book club page
      router.push(`/${bookClubId}`);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isSaving: false,
        savingError:
          err instanceof Error
            ? err.message
            : "저장에 실패했습니다. 다시 시도해주세요.",
      }));
    }
  };

  // Loading state
  if (isAuthLoading || state.isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <p className="text-black">로딩 중...</p>
        </div>
      </Layout>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button
            variant="secondary"
            onClick={() => router.back()}
            className="w-full"
          >
            ← 뒤로가기
          </Button>
          <div className="border border-gray-300 p-4">
            <p className="text-black text-sm">{state.error}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => router.push("/")}
            className="w-full"
          >
            홈으로 돌아가기
          </Button>
        </div>
      </Layout>
    );
  }

  // Page doesn't have required data
  if (!state.meeting || !state.currentMemberId) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button
            variant="secondary"
            onClick={() => router.back()}
            className="w-full"
          >
            ← 뒤로가기
          </Button>
          <div className="border border-gray-300 p-4">
            <p className="text-black text-sm">
              필요한 정보를 불러올 수 없습니다.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const isReadOnly = state.meeting.status === "in_progress";

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-8 border-0 px-0 text-left"
          >
            ← {state.meeting.bookTitle}
          </Button>

          <h1 className="text-3xl font-bold text-black mb-4">
            {state.meeting.bookTitle}
          </h1>

          <p className="text-sm text-gray-600 leading-relaxed">
            모임에서 함께 나눌 이야기를 간단히 남겨주세요.
          </p>
        </div>

        {/* Meeting in progress notice */}
        {isReadOnly && (
          <div className="border border-gray-300 bg-gray-50 p-4 space-y-2">
            <p className="text-sm text-gray-700">
              진행 중인 모임은 수정할 수 없습니다.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Field 1: Memorable Quote */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-medium text-gray-500">01</span>
              <label className="text-sm font-medium text-black">
                인상 깊은 부분
              </label>
            </div>
            <Textarea
              value={formData.sentence}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  sentence: e.target.value,
                }));
                if (formErrors.sentence) {
                  setFormErrors((prev) => ({
                    ...prev,
                    sentence: "",
                  }));
                }
              }}
              disabled={isReadOnly}
              error={formErrors.sentence}
              className={isReadOnly ? "opacity-60" : ""}
              placeholder="책에서 가장 인상 깊었던 문장이나 부분을 남겨주세요."
            />
            <Input
              label="페이지 (선택)"
              value={formData.sentencePage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sentencePage: e.target.value,
                }))
              }
              disabled={isReadOnly}
              className={isReadOnly ? "opacity-60" : ""}
              placeholder="예: 128 또는 128~130"
            />
          </div>

          {/* Field 2: Discussion */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-medium text-gray-500">02</span>
              <label className="text-sm font-medium text-black">
                발제
              </label>
            </div>
            <Textarea
              value={formData.question}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  question: e.target.value,
                }));
                if (formErrors.question) {
                  setFormErrors((prev) => ({
                    ...prev,
                    question: "",
                  }));
                }
              }}
              disabled={isReadOnly}
              error={formErrors.question}
              className={isReadOnly ? "opacity-60" : ""}
              placeholder="함께 이야기해보고 싶은 질문을 적어주세요."
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-black">
                함께 읽을 본문 (선택)
              </label>
              <Textarea
                value={formData.passage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    passage: e.target.value,
                  }))
                }
                disabled={isReadOnly}
                className={isReadOnly ? "opacity-60" : ""}
                placeholder="질문과 함께 살펴보면 좋을 책의 문장이나 부분을 적어주세요."
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-black">
                발제자의 말 (선택)
              </label>
              <Textarea
                value={formData.note}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    note: e.target.value,
                  }))
                }
                disabled={isReadOnly}
                className={isReadOnly ? "opacity-60" : ""}
                placeholder="이 질문을 떠올린 이유나 함께 이야기하고 싶은 생각을 적어주세요. 예: 이 부분을 읽으며 ○○가 궁금해졌어요. 여러분은 어떻게 생각했는지 이야기해보고 싶어요."
              />
            </div>
          </div>

          {/* Field 3: Takeaway */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-medium text-gray-500">03</span>
              <label className="text-sm font-medium text-black">
                한줄평
              </label>
            </div>
            <Textarea
              value={formData.takeaway}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  takeaway: e.target.value,
                }));
                if (formErrors.takeaway) {
                  setFormErrors((prev) => ({
                    ...prev,
                    takeaway: "",
                  }));
                }
              }}
              disabled={isReadOnly}
              error={formErrors.takeaway}
              className={isReadOnly ? "opacity-60" : ""}
              placeholder="이 책을 한 문장으로 남긴다면?"
            />
          </div>

          {/* Error message */}
          {state.savingError && (
            <div className="border border-gray-300 bg-gray-50 p-4">
              <p className="text-sm text-gray-700">{state.savingError}</p>
            </div>
          )}

          {/* Submit button */}
          <div className="space-y-4 pt-4 border-t border-gray-300">
            <Button
              type="submit"
              variant="primary"
              disabled={isReadOnly || state.isSaving}
              className="w-full"
            >
              {state.isSaving
                ? "저장 중..."
                : state.existingRecord
                  ? "수정하기"
                  : "저장하기"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
