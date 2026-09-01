"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Layout, Button } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { getBookClub } from "@/lib/book-clubs";
import { getCurrentMeeting, getBookClubMeetings } from "@/lib/meetings";
import { getBookClubMembers } from "@/lib/members";
import { getMeetingReadingRecords } from "@/lib/reading-records";
import { startMeeting } from "@/lib/sessions";

interface MemberWithRecord {
  id: string;
  nickname: string;
  isHost: boolean;
  hasRecord: boolean;
  isCurrentUser: boolean;
}

interface PageData {
  clubName: string;
  inviteCode: string;
  currentMeeting: {
    id: string;
    bookTitle: string;
    meetingDate: string;
    status: "scheduled" | "in_progress" | "completed";
  } | null;
  members: MemberWithRecord[];
  currentUserMember: MemberWithRecord | null;
  isCurrentUserHost: boolean;
  pastMeetings: Array<{
    id: string;
    bookTitle: string;
    meetingDate: string;
    status: string;
  }>;
}

export default function BookClubPage({
  params,
}: {
  params: Promise<{ bookClubId: string }>;
}) {
  const { bookClubId } = use(params);
  const router = useRouter();
  const { userId, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [copiedMessage, setCopiedMessage] = useState("");
  const [isStartingMeeting, setIsStartingMeeting] = useState(false);

  const handleCopyInviteLink = async () => {
    if (!data) return;

    const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${data.inviteCode}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedMessage("초대 링크가 복사되었습니다.");
      setTimeout(() => setCopiedMessage(""), 2000);
    } catch {
      setCopiedMessage("복사에 실패했습니다.");
      setTimeout(() => setCopiedMessage(""), 2000);
    }
  };

  const handleStartMeeting = async () => {
    if (!data?.currentMeeting) return;

    setIsStartingMeeting(true);
    try {
      const sessionId = await startMeeting(data.currentMeeting.id);
      // Navigate to STEP 1 with session ID
      router.push(
        `/${bookClubId}/session/step1?sessionId=${sessionId}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "모임을 시작하는데 실패했습니다."
      );
      setIsStartingMeeting(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;

    const loadData = async () => {
      try {
        const [bookClub, currentMeeting, members, allMeetings] =
          await Promise.all([
            getBookClub(bookClubId),
            getCurrentMeeting(bookClubId),
            getBookClubMembers(bookClubId),
            getBookClubMeetings(bookClubId),
          ]);

        if (!bookClub) {
          setError("독서모임을 찾을 수 없습니다.");
          setIsLoading(false);
          return;
        }

        // Load reading records for current meeting if it exists
        let memberWithRecords: MemberWithRecord[] = [];
        if (currentMeeting) {
          const records = await getMeetingReadingRecords(currentMeeting.id);
          memberWithRecords = members.map((member) => ({
            id: member.id,
            nickname: member.nickname,
            isHost: member.isHost,
            hasRecord: records.some((r) => r.memberId === member.id),
            isCurrentUser: false,
          }));
        } else {
          memberWithRecords = members.map((member) => ({
            id: member.id,
            nickname: member.nickname,
            isHost: member.isHost,
            hasRecord: false,
            isCurrentUser: false,
          }));
        }

        // Mark current user and determine if host
        const currentUserMember = memberWithRecords.find((m) => {
          const originalMember = members.find((om) => om.id === m.id);
          return originalMember?.userId === userId;
        });

        const membersWithCurrentUserMarked = memberWithRecords.map((m) => {
          const originalMember = members.find((om) => om.id === m.id);
          return {
            ...m,
            isCurrentUser: originalMember?.userId === userId,
          };
        });

        // Get past meetings (all except current)
        const pastMeetings = allMeetings
          .filter((m) => m.status !== "scheduled")
          .slice(0, 5)
          .map((m) => ({
            id: m.id,
            bookTitle: m.bookTitle,
            meetingDate: m.meetingDate,
            status: m.status,
          }));

        setData({
          clubName: bookClub.name,
          inviteCode: bookClub.inviteCode,
          currentMeeting: currentMeeting
            ? {
                id: currentMeeting.id,
                bookTitle: currentMeeting.bookTitle,
                meetingDate: currentMeeting.meetingDate,
                status: currentMeeting.status,
              }
            : null,
          members: membersWithCurrentUserMarked,
          currentUserMember: currentUserMember || null,
          isCurrentUserHost: currentUserMember?.isHost || false,
          pastMeetings,
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
  }, [bookClubId, userId, isAuthLoading]);

  if (isLoading || isAuthLoading) {
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
          <div className="border border-gray-300 p-4">
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
      <div className="space-y-12">
        {/* Book Club Name */}
        <div>
          <h1 className="text-4xl font-bold text-black">{data.clubName}</h1>
        </div>

        {/* Current Meeting Card */}
        {data.currentMeeting && (
          <div className="border border-gray-300 p-8 space-y-4">
            <p className="text-sm text-gray-600 font-medium">현재 회차</p>
            <div className="space-y-3">
              <p className="text-2xl font-semibold text-black">
                {data.currentMeeting.bookTitle}
              </p>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  {new Date(data.currentMeeting.meetingDate).toLocaleDateString(
                    "ko-KR",
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  {data.currentMeeting.status === "scheduled" && "모임 전"}
                  {data.currentMeeting.status === "in_progress" && "진행 중"}
                  {data.currentMeeting.status === "completed" && "완료"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Members Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 font-medium">
              함께하는 사람 {data.members.length}명
            </p>
          </div>
          <div className="space-y-2">
            {data.members.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between px-4 py-3 text-sm ${
                  member.isCurrentUser ? "bg-gray-100" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400">●</span>
                  <span className="text-black font-medium">
                    {member.nickname}
                  </span>
                  {member.isHost && (
                    <span className="text-sm text-gray-600">👑</span>
                  )}
                </div>
                <span className="text-xs text-gray-600 ml-2 flex-shrink-0">
                  {member.hasRecord ? "작성완료" : "미작성"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Copy Invite Link Button (Host Only) */}
        {data.isCurrentUserHost && (
          <div className="border-t border-gray-300 pt-8">
            <div className="space-y-2">
              <Button
                variant="secondary"
                onClick={handleCopyInviteLink}
                className="w-full"
              >
                친구 초대하기
              </Button>
              {copiedMessage && (
                <p className="text-xs text-gray-600 text-center">
                  {copiedMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* My Reading Record Section */}
        {data.currentMeeting && (
          <div className="border-t border-gray-300 pt-8 space-y-4">
            <p className="text-sm text-gray-600 font-medium">나의 독서 기록</p>
            {data.currentUserMember?.hasRecord ? (
              <div>
                <p className="text-sm text-black mb-4">작성완료</p>
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      router.push(`/${bookClubId}/record`)
                    }
                    className="w-full"
                  >
                    기록 수정하기
                  </Button>
                  {data.currentMeeting.status === "in_progress" && (
                    <p className="text-xs text-gray-600">
                      진행 중인 모임은 수정할 수 없습니다.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  아직 기록을 작성하지 않았어요.
                </p>
                <Button
                  variant="primary"
                  onClick={() =>
                    router.push(`/${bookClubId}/record`)
                  }
                  className="w-full"
                >
                  독서 기록 작성하기
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Start Meeting Button (Host Only) */}
        {data.isCurrentUserHost && data.currentMeeting && (
          <div className="border-t border-gray-300 pt-8">
            <Button
              variant="primary"
              onClick={handleStartMeeting}
              disabled={
                !data.currentUserMember?.hasRecord ||
                data.members.some((m) => !m.hasRecord) ||
                data.currentMeeting.status !== "scheduled" ||
                isStartingMeeting
              }
              className="w-full"
            >
              {isStartingMeeting ? "모임 시작 중..." : "모임 시작하기"}
            </Button>
            {data.currentMeeting.status !== "scheduled" && (
              <p className="text-xs text-gray-600 mt-2">
                이미 진행된 또는 완료된 모임입니다.
              </p>
            )}
            {data.currentUserMember && !data.currentUserMember.hasRecord && (
              <p className="text-xs text-gray-600 mt-2">
                먼저 자신의 독서 기록을 작성해주세요.
              </p>
            )}
            {data.members.some((m) => !m.hasRecord) && (
              <p className="text-xs text-gray-600 mt-2">
                모든 참여자의 기록 작성을 기다리는 중입니다.
              </p>
            )}
          </div>
        )}

        {/* Past Meetings Section */}
        {data.pastMeetings.length > 0 && (
          <div className="border-t border-gray-300 pt-8 space-y-4">
            <p className="text-sm text-gray-600 font-medium">지난 모임</p>
            <div className="space-y-2">
              {data.pastMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span className="text-black">{meeting.bookTitle}</span>
                  <span className="text-xs text-gray-600">
                    {new Date(meeting.meetingDate).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/${bookClubId}/past-meetings`)}
              className="w-full text-left px-0 border-0 text-sm"
            >
              → 이전 회차 보기
            </Button>
          </div>
        )}

        {/* New Meeting Button (Host Only) */}
        {data.isCurrentUserHost && (
          <div className="border-t border-gray-300 pt-8">
            <Button
              variant="ghost"
              onClick={() => router.push(`/${bookClubId}/new-session`)}
              className="w-full text-left px-0 border-0 text-sm"
            >
              + 새 모임 만들기
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
