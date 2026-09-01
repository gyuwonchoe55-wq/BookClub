"use client";

import { useRouter } from "next/navigation";
import { Layout, Button } from "@/components";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <Layout>
        <div className="space-y-8 py-16">
          <p className="text-black">로딩 중...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-12 py-16">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-black leading-tight">
            함께 읽고
            <br />
            나누다
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            독서모임을 만들고, 책 이야기를 나누세요.
            <br />
            더 깊이 있는 독서 경험을 함께합니다.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="border border-gray-300 p-8 space-y-3">
              <h2 className="text-xl font-bold text-black">책을 읽고</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                인상 깊은 문장, 이야기하고 싶은 질문, 배운 점을 남기세요.
              </p>
            </div>

            <div className="border border-gray-300 p-8 space-y-3">
              <h2 className="text-xl font-bold text-black">모임을 진행하고</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                함께 나눈 문장들을 공유하고, 질문에 대해 대화하며, 마지막으로 각자의 기억을 나눕니다.
              </p>
            </div>

            <div className="border border-gray-300 p-8 space-y-3">
              <h2 className="text-xl font-bold text-black">기록을 남긴다</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                독서모임의 모든 순간이 기록됩니다. 언제든 다시 돌아봐 보세요.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="border-t border-gray-300 pt-8">
          <Button
            variant="primary"
            onClick={() => router.push("/create")}
            className="w-full"
          >
            독서모임 시작하기
          </Button>
        </div>
      </div>
    </Layout>
  );
}
