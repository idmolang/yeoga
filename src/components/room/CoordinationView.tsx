"use client";

// 모으기·조율 단계 화면: 내 응답 / 조율 현황 / 확정하기(방장)

import { useMemo, useState } from "react";
import ConfirmForm from "@/components/room/ConfirmForm";
import Dashboard from "@/components/room/Dashboard";
import ResponseForm from "@/components/room/ResponseForm";
import { useRoomContext } from "@/components/room/RoomContext";
import Tabs, { TabPanel } from "@/components/Tabs";
import { coordinate } from "@/lib/coordinate";

type Tab = "respond" | "dashboard" | "confirm";

export default function CoordinationView() {
  const { data, me, isHost } = useRoomContext();
  const c = useMemo(() => coordinate(data), [data]);
  const answered = data.responses.some((r) => r.user_id === me);
  const [tab, setTab] = useState<Tab>(answered ? "dashboard" : "respond");

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: "respond", label: answered ? "내 응답" : "응답하기" },
    { id: "dashboard", label: "조율 현황", badge: `${c.responseCount}/${c.memberCount}` },
    ...(isHost ? [{ id: "confirm" as Tab, label: "확정하기" }] : []),
  ];

  return (
    <div className="space-y-4">
      <Tabs label="조율" tabs={tabs} current={tab} onChange={setTab} />
      <TabPanel id={tab}>
        {tab === "respond" && <ResponseForm onDone={() => setTab("dashboard")} />}
        {tab === "dashboard" && <Dashboard c={c} onConfirm={() => setTab("confirm")} />}
        {tab === "confirm" && isHost && <ConfirmForm c={c} />}
      </TabPanel>
    </div>
  );
}
