"use client";

// F-02 초대 공유: 초대 링크·초대 문구 복사
// 공유 방법은 SHARE_ACTIONS 배열 하나로 관리한다.
// 카카오톡 공유를 붙일 때는 Kakao SDK 를 불러온 뒤 이 배열에 { id: "kakao", ... } 하나만 추가하면 된다.

import { useState, useSyncExternalStore } from "react";
import { card, h2, input, muted, primaryButton, secondaryButton } from "@/components/styles";
import { inviteMessage, inviteUrl } from "@/lib/share";
import type { TripRow } from "@/types/db";

interface ShareContext {
  url: string;
  message: string;
  copy: (text: string, done: string) => Promise<void>;
}

interface ShareAction {
  id: string;
  label: string;
  primary?: boolean;
  /** 이 브라우저에서 쓸 수 있는가 (예: Web Share API 지원 여부) */
  available?: () => boolean;
  run: (ctx: ShareContext) => void | Promise<void>;
}

const SHARE_ACTIONS: ShareAction[] = [
  { id: "copy-message", label: "초대 문구 복사", primary: true, run: (c) => c.copy(c.message, "초대 문구를 복사했어요. 단톡방에 붙여넣으세요!") },
  { id: "copy-link", label: "링크만 복사", run: (c) => c.copy(c.url, "초대 링크를 복사했어요.") },
  {
    id: "native-share",
    label: "다른 앱으로 공유",
    available: () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    run: async (c) => {
      try {
        await navigator.share({ text: c.message });
      } catch {
        // 공유 창을 닫은 경우는 무시
      }
    },
  },
  // { id: "kakao", label: "카카오톡으로 공유", run: (c) => window.Kakao.Share.sendDefault({...}) },
];

const subscribe = () => () => {};

export default function InvitePanel({ trip, onClose }: { trip: TripRow; onClose?: () => void }) {
  // origin 은 브라우저에서만 알 수 있다 (서버 렌더링 때는 빈 값)
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => "");
  const [notice, setNotice] = useState("");
  const url = inviteUrl(origin, trip.invite_code);
  const message = inviteMessage(trip, url);

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(done);
    } catch {
      setNotice("복사하지 못했어요. 아래 칸을 길게 눌러 직접 복사해 주세요.");
    }
  };

  const actions = SHARE_ACTIONS.filter((a) => !a.available || a.available());

  return (
    <section className={card} aria-labelledby="invite-title">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 id="invite-title" className={h2}>친구 초대하기</h2>
          <p className={muted}>링크를 받은 사람은 로그인 후 바로 참여할 수 있어요.</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            닫기
          </button>
        )}
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-medium">초대 문구</span>
        <textarea className={`${input} text-sm`} rows={3} readOnly value={message} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            className={a.primary ? primaryButton : secondaryButton}
            onClick={() => a.run({ url, message, copy })}
          >
            {a.label}
          </button>
        ))}
      </div>
      <p role="status" className={notice ? "text-sm text-sky-700 dark:text-sky-300" : "sr-only"}>
        {notice}
      </p>
      <p className={muted}>링크를 아는 사람은 누구나 참여할 수 있어요. 연락처·계좌번호는 적지 마세요.</p>
    </section>
  );
}
