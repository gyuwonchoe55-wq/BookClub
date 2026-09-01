"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layout, Button, Input } from "@/components";
import { createBookClub } from "@/lib/book-clubs";
import { useAuth } from "@/hooks/useAuth";

export default function CreatePage() {
  const router = useRouter();
  const { userId, isLoading: isAuthLoading } = useAuth();

  const [formData, setFormData] = useState({
    clubName: "",
    nickname: "",
    bookTitle: "",
    meetingDate: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clubName.trim()) {
      newErrors.clubName = "독서모임 이름을 입력해주세요.";
    }

    if (!formData.nickname.trim()) {
      newErrors.nickname = "별명을 입력해주세요.";
    }

    if (!formData.bookTitle.trim()) {
      newErrors.bookTitle = "책 제목을 입력해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !userId) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Generate invite code (simple implementation)
      const inviteCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const response = await createBookClub(
        formData.clubName,
        inviteCode,
        formData.nickname,
        formData.bookTitle,
        formData.meetingDate || null,
      );

      // Redirect to book club room
      router.push(`/${response.bookClubId}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "독서모임 생성에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Show loading state while auth is initializing
  if (isAuthLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-8 text-black hover:text-gray-600 font-medium"
            >
              ← 뒤로가기
            </button>
          </div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Back Button */}
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-black hover:text-gray-600 font-medium transition-colors"
          >
            ← 뒤로가기
          </button>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-black">
            어떤 독서모임을
            <br />
            만들러 오셨나요?
          </h1>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <Input
            label="독서모임 이름"
            name="clubName"
            placeholder="예: 김영하 팬클럽"
            value={formData.clubName}
            onChange={handleInputChange}
            error={errors.clubName}
            disabled={isSubmitting}
          />

          <Input
            label="내 별명"
            name="nickname"
            placeholder="예: 영희"
            value={formData.nickname}
            onChange={handleInputChange}
            error={errors.nickname}
            disabled={isSubmitting}
          />

          <Input
            label="책 제목"
            name="bookTitle"
            placeholder="예: 여덟 살의 인생"
            value={formData.bookTitle}
            onChange={handleInputChange}
            error={errors.bookTitle}
            disabled={isSubmitting}
          />

          <Input
            label="모임 날짜 (선택)"
            name="meetingDate"
            type="date"
            value={formData.meetingDate}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="border border-gray-300 bg-gray-50 p-4">
            <p className="text-black text-sm">{submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            variant="primary"
            type="submit"
            className="w-full"
            disabled={isSubmitting || isAuthLoading}
          >
            {isSubmitting ? "생성 중..." : "독서모임 만들기"}
          </Button>
        </div>
      </form>
    </Layout>
  );
}
