"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Layout, Button } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { getMeetingById } from "@/lib/meetings";
import { getBookClubMembers } from "@/lib/members";
import { getMeetingReadingRecords } from "@/lib/reading-records";

interface MemberWithRecord {
  id: string;
  nickname: string;
  isHost: boolean;
  hasRecord: boolean;
}

interface ReadingRecord {
  id: string;
  memberId: string;
  memberNickname: string;
  memorableQuote: string | null;
  discussionQuestion: string | null;
  takeaway: string | null;
}

interface PageData {
  bookTitle: string;
  meetingDate: string;
  status: string;
  members: MemberWithRecord[];
  readingRecords: ReadingRecord[];
}

export default function PastMeetingDetailPage({
  params,
}: {
  params: Promise<{ bookClubId: string; meetingId: string }>;
}) {
  const { bookClubId, meetingId } = use(params);
  const router = useRouter();
  const { isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isAuthLoading) return;

    const loadData = async () => {
      try {
        const [meeting, members, records] = await Promise.all([
          getMeetingById(meetingId),
          getBookClubMembers(bookClubId),
          getMeetingReadingRecords(meetingId),
        ]);

        if (!meeting) {
          setError("모임을 찾을 수 없습니다.");
          setIsLoading(false);
          return;
        }

        // Map reading records with member nicknames
        const recordsWithNames = records.map((record) => {
          const member = members.find((m) => m.id === record.memberId);
          return {
            id: record.id,
            memberId: record.memberId,
            meetingId: record.meetingId,
            memorableQuote: record.memorableQuote ?? null,
            discussionQuestion: record.discussionQuestion ?? null,
            takeaway: record.takeaway ?? null,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            memberNickname: member?.nickname || "알 수 없음",
          };
        });

        setData({
          bookTitle: meeting.bookTitle,
          meetingDate: meeting.meetingDate,
          status: meeting.status,
          members: members.map((m) => ({
            id: m.id,
            nickname: m.nickname,
            isHost: m.isHost,
            hasRecord: records.some((r) => r.memberId === m.id),
          })),
          readingRecords: recordsWithNames,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "데이터를 불러오는데 실패했습니다."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [bookClubId, meetingId, isAuthLoading]);

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
          <Button
            variant="secondary"
            onClick={() => router.back()}
            className="w-full"
          >
            ← 뒤로가기
          </Button>
          <div className="border border-gray-300 p-4">
            <p className="text-black text-sm">
              {error || "알 수 없는 오류가 발생했습니다."}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-12">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-8 border-0 px-0 text-left"
          >
            ← 지난 모임
          </Button>

          <h1 className="text-3xl font-bold text-black mb-4">
            {data.bookTitle}
          </h1>

          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              {new Date(data.meetingDate).toLocaleDateString("ko-KR")}
            </p>
            <p className="text-sm text-gray-600">
              {data.status === "completed" && "완료된 모임"}
              {data.status === "in_progress" && "진행 중인 모임"}
            </p>
          </div>
        </div>

        {/* Members Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 font-medium">
              참여자 {data.members.length}명
            </p>
          </div>
          <div className="space-y-2">
            {data.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
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

        {/* Reading Records Section */}
        {data.readingRecords.length > 0 && (
          <div className="border-t border-gray-300 pt-8 space-y-8">
            <p className="text-sm text-gray-600 font-medium">독서 기록</p>

            {data.readingRecords.map((record) => (
              <div key={record.id} className="space-y-6">
                {/* Member Name */}
                <p className="text-sm font-semibold text-black">
                  {record.memberNickname}
                </p>

                {/* Record Fields */}
                <div className="space-y-4">
                  {/* Memorable Quote */}
                  {record.memorableQuote && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">
                        인상 깊은 문장
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {record.memorableQuote}
                      </p>
                    </div>
                  )}

                  {/* Discussion Question */}
                  {record.discussionQuestion && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">
                        이야기하고 싶은 질문
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {record.discussionQuestion}
                      </p>
                    </div>
                  )}

                  {/* Takeaway */}
                  {record.takeaway && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">
                        적용점 또는 기억하고 싶은 한 가지
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {record.takeaway}
                      </p>
                    </div>
                  )}
                </div>

                {/* Divider between records */}
                {record.id !== data.readingRecords[data.readingRecords.length - 1].id && (
                  <div className="border-t border-gray-200 pt-6"></div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Records State */}
        {data.readingRecords.length === 0 && (
          <div className="border-t border-gray-300 pt-8">
            <p className="text-sm text-gray-600">
              작성된 독서 기록이 없습니다.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
