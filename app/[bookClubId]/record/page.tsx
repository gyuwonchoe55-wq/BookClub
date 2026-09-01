"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Layout, Button, Textarea } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { getBookClub } from "@/lib/book-clubs";
import { getCurrentMeeting } from "@/lib/meetings";
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
  question: string;
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
    question: "",
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

        const meeting = await getCurrentMeeting(bookClubId);
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
            question: existingRecord.discussionQuestion || "",
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
          discussionQuestion: formData.question,
          takeaway: formData.takeaway,
        });
      } else {
        // Create new record
        await createReadingRecord(state.meeting.id, state.currentMemberId, {
          memorableQuote: formData.sentence,
          discussionQuestion: formData.question,
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
                인상 깊은 문장
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
              placeholder="책에서 인상 깊었던 문장을 옮겨 적어주세요."
            />
          </div>

          {/* Field 2: Discussion Question */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-medium text-gray-500">02</span>
              <label className="text-sm font-medium text-black">
                이야기하고 싶은 질문
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
              placeholder="이 책에 대해 궁금하거나 함께 이야기하고 싶은 점을 물어봐주세요."
            />
          </div>

          {/* Field 3: Takeaway */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-medium text-gray-500">03</span>
              <label className="text-sm font-medium text-black">
                적용점 또는 기억하고 싶은 한 가지
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
              placeholder="이 책을 통해 배우거나 실천하고 싶은 점을 적어주세요."
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
