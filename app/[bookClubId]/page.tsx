"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layout, Button } from "@/components";
import { getBookClub } from "@/lib/book-clubs";
import { getCurrentMeeting } from "@/lib/meetings";
import { getBookClubMembers } from "@/lib/members";

interface BookClubRoom {
  clubName: string;
  inviteCode: string;
  currentBook?: string;
  meetingDate?: string;
  memberCount: number;
  isHost: boolean;
}

export default function BookClubPage({
  params,
}: {
  params: { bookClubId: string };
}) {
  const router = useRouter();
  const [data, setData] = useState<BookClubRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [copiedMessage, setCopiedMessage] = useState("");

  const handleCopyInviteLink = async () => {
    if (!data) return;

    const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${data.inviteCode}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedMessage("초대 링크가 복사되었습니다.");
      // Clear message after 2 seconds
      setTimeout(() => setCopiedMessage(""), 2000);
    } catch {
      setCopiedMessage("복사에 실패했습니다.");
      setTimeout(() => setCopiedMessage(""), 2000);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bookClub, meeting, members] = await Promise.all([
          getBookClub(params.bookClubId),
          getCurrentMeeting(params.bookClubId),
          getBookClubMembers(params.bookClubId),
        ]);

        if (!bookClub) {
          setError("독서모임을 찾을 수 없습니다.");
          return;
        }

        setData({
          clubName: bookClub.name,
          inviteCode: bookClub.inviteCode,
          currentBook: meeting?.bookTitle,
          meetingDate: meeting?.meetingDate,
          memberCount: members.length,
          isHost: members.some((m) => m.isHost),
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "데이터를 불러오는데 실패했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [params.bookClubId]);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <p className="text-black">로딩 중...</p>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="border border-gray-300 bg-gray-50 p-4">
            <p className="text-black text-sm">
              {error || "알 수 없는 오류가 발생했습니다."}
            </p>
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

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-black">{data.clubName}</h1>

          {/* Current Book Info */}
          {data.currentBook && (
            <div className="border border-gray-300 p-6 space-y-3">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">
                  현재 책
                </p>
                <p className="text-lg font-semibold text-black">
                  {data.currentBook}
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

          {/* Members Info */}
          <div>
            <p className="text-sm text-gray-600 font-medium mb-2">참여자</p>
            <p className="text-black">{data.memberCount}명이 참여 중입니다.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-300 pt-8 space-y-4">
          {/* Copy Invite Link Button */}
          <div className="space-y-2">
            <Button
              variant="secondary"
              onClick={handleCopyInviteLink}
              className="w-full"
            >
              참여 링크 복사
            </Button>
            {copiedMessage && (
              <p className="text-sm text-gray-600 text-center">
                {copiedMessage}
              </p>
            )}
          </div>

          {/* Placeholder Text */}
          <div>
            <p className="text-sm text-gray-600 mb-4">
              주요 기능이 곧 추가됩니다.
            </p>
          </div>

          {/* Home Button */}
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
