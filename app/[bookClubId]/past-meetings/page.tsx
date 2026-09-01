"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { getBookClubMeetings } from "@/lib/meetings";

interface PastMeeting {
  id: string;
  bookTitle: string;
  meetingDate: string;
  status: "scheduled" | "in_progress" | "completed";
  sessionNumber: number;
}

export default function PastMeetingsPage({
  params,
}: {
  params: Promise<{ bookClubId: string }>;
}) {
  const { bookClubId } = use(params);
  const router = useRouter();
  const { isLoading: isAuthLoading } = useAuth();
  const [meetings, setMeetings] = useState<PastMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isAuthLoading) return;

    const loadMeetings = async () => {
      try {
        const allMeetings = await getBookClubMeetings(bookClubId);

        // Filter out scheduled meetings (current meeting)
        const pastMeetings = allMeetings.filter(
          (m) => m.status !== "scheduled"
        );

        // Add session number based on reverse order
        const meetingsWithNumber = pastMeetings.map((m, index) => ({
          id: m.id,
          bookTitle: m.bookTitle,
          meetingDate: m.meetingDate,
          status: m.status,
          sessionNumber: pastMeetings.length - index,
        }));

        setMeetings(meetingsWithNumber);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "지난 회차를 불러오는데 실패했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadMeetings();
  }, [bookClubId, isAuthLoading]);

  if (isLoading || isAuthLoading) {
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
      <div className="space-y-8">
        {/* Back Button */}
        <div>
          <button
            onClick={() => router.back()}
            className="text-black hover:text-gray-600 font-medium transition-colors"
          >
            ← 뒤로가기
          </button>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-black">지난 모임</h1>
        </div>

        {/* Error State */}
        {error && (
          <div className="border border-gray-300 bg-gray-50 p-4">
            <p className="text-black text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {meetings.length === 0 && !error && (
          <div className="space-y-4">
            <p className="text-gray-600">지난 회차가 없습니다.</p>
          </div>
        )}

        {/* Meetings List */}
        {meetings.length > 0 && (
          <div className="space-y-2">
            {meetings.map((meeting) => (
              <button
                key={meeting.id}
                onClick={() => router.push(`/${bookClubId}/past-meetings/${meeting.id}`)}
                className="w-full text-left border border-gray-300 p-4 space-y-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    회차 {meeting.sessionNumber}
                  </p>
                  <p className="text-xs text-gray-600">
                    {meeting.status === "completed" && "완료"}
                    {meeting.status === "in_progress" && "진행 중"}
                  </p>
                </div>
                <p className="text-lg font-semibold text-black">
                  {meeting.bookTitle}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(meeting.meetingDate).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
