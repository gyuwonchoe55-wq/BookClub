"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Layout, Button, Input } from "@/components";
import { getBookClubInfoByInviteCode } from "@/lib/book-clubs";
import { getCurrentMeeting } from "@/lib/meetings";
import { joinBookClub } from "@/lib/members";
import { useAuth } from "@/hooks/useAuth";

interface JoinPageData {
  bookClubId: string;
  bookClubName: string;
  bookTitle?: string;
  meetingDate?: string;
}

export default function JoinPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = use(params);
  const router = useRouter();
  const { userId, isLoading: isAuthLoading } = useAuth();

  const [data, setData] = useState<JoinPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  // Load book club and meeting data
  useEffect(() => {
    const loadData = async () => {
      try {
        const bookClub = await getBookClubInfoByInviteCode(inviteCode);

        if (!bookClub) {
          setLoadError("초대 링크가 유효하지 않습니다.");
          setIsLoading(false);
          return;
        }

        const meeting = await getCurrentMeeting(bookClub.id);

        setData({
          bookClubId: bookClub.id,
          bookClubName: bookClub.name,
          bookTitle: meeting?.bookTitle,
          meetingDate: meeting?.meetingDate,
        });
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "데이터를 불러오는데 실패했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate nickname
    if (!nickname.trim()) {
      setSubmitError("별명을 입력해주세요.");
      return;
    }

    if (!data || !userId) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await joinBookClub(inviteCode, nickname.trim());
      // Redirect to book club room
      router.push(`/${response.bookClubId}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "참여에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    if (submitError) {
      setSubmitError("");
    }
  };

  // Loading state - auth initializing
  if (isAuthLoading || isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <p className="text-black text-lg">로딩 중...</p>
        </div>
      </Layout>
    );
  }

  // Error state - invalid invite code or load error
  if (loadError || !data) {
    return (
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-black">
              초대 링크가
              <br />
              유효하지 않습니다
            </h1>
          </div>

          {/* Error Message */}
          <div className="border border-gray-300 bg-gray-50 p-4">
            <p className="text-black text-sm">
              {loadError || "초대 링크를 다시 확인해주세요."}
            </p>
          </div>

          {/* Action Button */}
          <div>
            <Button
              variant="secondary"
              onClick={() => router.push("/")}
              className="w-full"
            >
              홈으로 돌아가기
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-600 font-medium mb-2">초대받음</p>
            <h1 className="text-4xl font-bold text-black">
              {data.bookClubName}
            </h1>
          </div>

          {/* Current Meeting Info */}
          {data.bookTitle && (
            <div className="border border-gray-300 p-6 space-y-3">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">
                  현재 책
                </p>
                <p className="text-lg font-semibold text-black">
                  {data.bookTitle}
                </p>
              </div>
              {data.meetingDate && (
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">
                    모임 날짜
                  </p>
                  <p className="text-black">
                    {new Date(data.meetingDate).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Section */}
        <div className="space-y-6 border-t border-gray-300 pt-8">
          {/* Nickname Input */}
          <Input
            label="별명"
            placeholder="예: 영희"
            value={nickname}
            onChange={handleNicknameChange}
            disabled={isSubmitting || isAuthLoading}
            autoFocus
          />

          {/* Submit Error */}
          {submitError && (
            <div className="border border-gray-300 bg-gray-50 p-4">
              <p className="text-black text-sm">{submitError}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              variant="primary"
              type="submit"
              className="w-full"
              disabled={isSubmitting || isAuthLoading || !nickname.trim()}
            >
              {isSubmitting ? "참여 중..." : "참여하기"}
            </Button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
