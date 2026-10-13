"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Button } from "@/components";
import { getSessionById, updateSessionStep } from "@/lib/sessions";
import { endMeeting } from "@/lib/meetings";
import { getMeetingReadingRecords } from "@/lib/reading-records";
import { getBookClubMembers } from "@/lib/members";

interface Takeaway {
  takeaway: string;
  memberId: string;
  memberNickname: string;
}

interface PageState {
  isLoading: boolean;
  error: string;
  takeaways: Takeaway[];
  sessionId: string;
  meetingId: string;
  isAdvancing: boolean;
}

export default function Step4Page({
  params,
}: {
  params: Promise<{ bookClubId: string }>;
}) {
  const { bookClubId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [state, setState] = useState<PageState>({
    isLoading: true,
    error: "",
    takeaways: [],
    sessionId: sessionId || "",
    meetingId: "",
    isAdvancing: false,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!sessionId) {
          throw new Error("Session ID not provided");
        }

        const session = await getSessionById(sessionId);
        if (!session) {
          throw new Error("Session not found");
        }

        const records = await getMeetingReadingRecords(session.meetingId);
        const members = await getBookClubMembers(bookClubId);
        const memberMap = new Map(members.map((m) => [m.id, m.nickname]));

        const takeaways: Takeaway[] = records
          .filter((r) => r.takeaway)
          .map((r) => ({
            takeaway: r.takeaway!,
            memberId: r.memberId,
            memberNickname: memberMap.get(r.memberId) || "알 수 없음",
          }));

        if (takeaways.length === 0) {
          throw new Error("No takeaways found in reading records");
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          takeaways,
          meetingId: session.meetingId,
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
  }, [sessionId, bookClubId]);

  const handleEndMeeting = async () => {
    try {
      setState((prev) => ({
        ...prev,
        isAdvancing: true,
      }));

      // session 단계를 먼저 완료로 바꾼 뒤 meeting을 종료한다.
      // 중간에 실패하면 현재 회차에 남으므로 "모임 이어서 진행하기"로 이 화면에 돌아와 다시 종료할 수 있다.
      await updateSessionStep(state.sessionId, "completed");
      await endMeeting(state.meetingId);
      router.push(`/${bookClubId}/session/complete?meetingId=${state.meetingId}`);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isAdvancing: false,
        error: err instanceof Error ? err.message : "Failed to end meeting",
      }));
    }
  };

  if (state.isLoading) {
    return (
      <div className="bg-yellow-400 min-h-screen flex items-center justify-center">
        <p className="text-black">로딩 중...</p>
      </div>
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
          <Button variant="secondary" onClick={() => router.back()} className="w-full">
            돌아가기
          </Button>
        </div>
      </Layout>
    );
  }

  if (state.takeaways.length === 0) {
    return (
      <div className="bg-yellow-400 min-h-screen flex flex-col items-center justify-center">
        <p className="text-black">진행할 내용이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-400 min-h-screen flex flex-col">
      {/* Top Navigation */}
      <div className="border-b-4 border-black bg-yellow-400 flex items-center">
        <div className="flex-1 flex">
          <div className="flex-1 border-r-4 border-black px-4 py-3 font-bold text-center">
            인트로
          </div>
          <div className="flex-1 border-r-4 border-black px-4 py-3 font-bold text-center">
            진행 1
          </div>
          <div className="flex-1 border-r-4 border-black px-4 py-3 font-bold text-center">
            진행 2
          </div>
          <div className="flex-1 bg-black text-white border-r-4 border-black px-4 py-3 font-bold text-center">
            마무리
          </div>
        </div>
        <div className="px-4 py-3 font-bold">끝내기</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-bold text-black">한줄평</h2>
          <p className="text-lg text-black">마지막 한줄평을 나눠보세요</p>

          {/* Takeaway Cards */}
          <div className="grid grid-cols-3 gap-4 max-w-4xl">
            {state.takeaways.map((item, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center p-6 border-4 border-black rounded-lg ${
                  idx === 0 ? "bg-black text-white" : "bg-yellow-400 text-black"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-4">
                  <span className="text-black font-bold text-lg">
                    {item.memberNickname.charAt(0)}
                  </span>
                </div>
                <p className="font-bold mb-2">{item.memberNickname}</p>
                <p className="text-sm leading-relaxed text-center">
                  {item.takeaway}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="px-6 py-8">
        <Button
          variant="primary"
          onClick={handleEndMeeting}
          disabled={state.isAdvancing}
          className="w-full rounded-full py-4 bg-white text-black border-2 border-black hover:bg-gray-100"
        >
          모임 종료
        </Button>
      </div>
    </div>
  );
}
