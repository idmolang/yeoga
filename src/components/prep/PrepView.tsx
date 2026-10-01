"use client";

// 준비 단계 화면: 할 일 / 일정 / 예산 / 정산 / 준비물 (모든 참여자가 함께 편집)

import { useState } from "react";
import BudgetTab from "@/components/prep/BudgetTab";
import PackingTab from "@/components/prep/PackingTab";
import ScheduleTab from "@/components/prep/ScheduleTab";
import SettleTab from "@/components/prep/SettleTab";
import TodoTab from "@/components/prep/TodoTab";
import { useRoomContext } from "@/components/room/RoomContext";
import Tabs, { TabPanel } from "@/components/Tabs";

type Tab = "todo" | "schedule" | "budget" | "settle" | "packing";

export default function PrepView() {
  const { data, me } = useRoomContext();
  const [tab, setTab] = useState<Tab>("todo");
  const left = data.todos.filter((t) => !t.done).length;
  const myPacking = data.packing.filter((p) => !p.shared && p.owner_id === me && !p.packed).length;

  return (
    <div className="space-y-4">
      <Tabs
        label="준비"
        current={tab}
        onChange={setTab}
        tabs={[
          { id: "todo", label: "할 일", badge: left || "" },
          { id: "schedule", label: "일정" },
          { id: "budget", label: "예산" },
          { id: "settle", label: "정산" },
          { id: "packing", label: "준비물", badge: myPacking || "" },
        ]}
      />
      <TabPanel id={tab}>
        {tab === "todo" && <TodoTab />}
        {tab === "schedule" && <ScheduleTab />}
        {tab === "budget" && <BudgetTab />}
        {tab === "settle" && <SettleTab />}
        {tab === "packing" && <PackingTab />}
      </TabPanel>
    </div>
  );
}
