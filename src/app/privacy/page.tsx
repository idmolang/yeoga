// 개인정보 안내 (로그인 전에도 볼 수 있다)

import Link from "next/link";
import { card, h1, h2, muted } from "@/components/styles";

export const metadata = { title: "개인정보 안내" };

const ROWS: [string, string][] = [
  ["받는 정보", "소셜 로그인(구글·카카오)의 닉네임과 프로필 사진. 이메일·연락처·계좌번호는 받지 않아요."],
  ["사용 목적", "여행방에서 참여자를 알아볼 수 있게 이름을 보여주는 것. 그 밖의 목적(광고, 제3자 제공)에는 쓰지 않아요."],
  ["직접 적는 정보", "방마다 정하는 표시 이름, 응답(날짜·예산·스타일), 지출·정산 기록은 같은 방 참여자에게만 보여요."],
  ["보관 기간", "탈퇴할 때까지 보관하고, 탈퇴하면 아래 기준으로 삭제해요."],
];

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className={h1}>개인정보 안내</h1>
        <p className={muted}>여가는 꼭 필요한 정보만 받아요.</p>
      </header>

      <section className={card}>
        <dl className="space-y-4">
          {ROWS.map(([title, body]) => (
            <div key={title} className="space-y-0.5">
              <dt className="font-semibold">{title}</dt>
              <dd className="text-slate-600 dark:text-slate-300">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={card}>
        <h2 className={h2}>탈퇴하면</h2>
        <ul className="list-inside list-disc space-y-1 text-slate-600 dark:text-slate-300">
          <li>닉네임·프로필 사진과 내 응답·의견·좋아요, 개인 준비물은 삭제돼요.</li>
          <li>내가 방장인 방은 삭제하거나 다른 참여자에게 방장을 넘길 수 있어요.</li>
          <li>다른 사람과 연결된 지출·정산 기록은 남기되, 내 이름은 &quot;탈퇴한 사용자&quot;로 바뀌어요.</li>
        </ul>
        <p className={muted}>내 정보 페이지에서 직접 탈퇴할 수 있어요.</p>
      </section>

      <Link href="/" className="text-sm font-medium text-sky-700 underline dark:text-sky-300">
        처음으로
      </Link>
    </div>
  );
}
