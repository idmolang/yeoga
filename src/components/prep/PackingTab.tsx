"use client";

// F-14 준비물: 공용(하나만 있으면 되는 것)과 개인(각자 챙길 것)을 나눠 추가·체크·삭제 (v0.1 PackingTab을 DB 버전으로)
// 이름 중복은 같은 목록 안에서만 막는다 (공용 목록 / 내 개인 목록)

import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { useRoomContext } from "@/components/room/RoomContext";
import { card, choice, deleteButton, fieldLabel, h3, input, muted, primaryButton } from "@/components/styles";
import { deleteRow, insertRow, updateRow } from "@/lib/db";
import { groupPacking } from "@/lib/sort";
import { useValidation } from "@/lib/validation";
import type { PackingRow } from "@/types/db";
import { PACKING_GROUPS } from "@/types/trip";

/** "보조 배터리" 와 "보조배터리" 처럼 공백·대소문자만 다른 이름도 같은 것으로 본다 */
const normalize = (name: string) => name.replace(/\s+/g, "").toLowerCase();

export default function PackingTab() {
  const { data, supabase, run, me, going } = useRoomContext();
  const { trip, packing } = data;
  const v = useValidation("packing");
  const [form, setForm] = useState({ name: "", category: "", shared: false });

  const sharedItems = packing.filter((p) => p.shared);
  const myItems = packing.filter((p) => !p.shared && p.owner_id === me);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = form.name.trim();
    const list = form.shared ? sharedItems : myItems;
    const dup = list.find((p) => normalize(p.name) === normalize(name));
    const extra = { name: dup ? `"${dup.name}"은(는) 이미 ${form.shared ? "공용" : "내"} 준비물에 있어요.` : undefined };
    if (!v.validate(e.currentTarget, extra)) return;
    const ok = await run(() =>
      insertRow(supabase, "packing_items", {
        trip_id: trip.id,
        name,
        category: form.category,
        shared: form.shared,
        owner_id: form.shared ? null : me,
      }),
    );
    if (ok) setForm({ ...form, name: "" }); // 같은 분류로 연달아 추가하기 쉽게
  };

  // 다른 사람의 개인 준비물 진행률
  const others = going
    .filter((m) => m.user_id !== me)
    .map((m) => {
      const items = packing.filter((p) => !p.shared && p.owner_id === m.user_id);
      return { name: m.display_name, done: items.filter((p) => p.packed).length, total: items.length };
    });

  return (
    <section className="space-y-6">
      <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className={card} aria-label="준비물 추가">
        <fieldset>
          <legend className={`mb-2 ${fieldLabel}`}>공용/개인</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              [false, "개인 (내가 챙길 것)"],
              [true, "공용 (하나면 됨)"],
            ].map(([value, label]) => (
              <label key={String(value)} className={choice}>
                <input type="radio" name="shared" required checked={form.shared === value} onChange={() => setForm({ ...form, shared: value as boolean })} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
          <div className="space-y-1">
            <label className="block space-y-1">
              <span className={fieldLabel}>준비물</span>
              <input {...v.field("name")} className={input} required maxLength={30} placeholder="예: 우산" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <FieldError id={v.errorId("name")} message={v.errors.name} />
          </div>
          <div className="space-y-1">
            <label className="block space-y-1">
              <span className={fieldLabel}>분류</span>
              <select {...v.field("category")} className={input} required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="" disabled>선택</option>
                {PACKING_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
            <FieldError id={v.errorId("category")} message={v.errors.category} />
          </div>
        </div>
        <button type="submit" className={`w-full ${primaryButton}`}>준비물 추가</button>
      </form>

      <PackingList title="공용 준비물" hint="한 명만 챙기면 돼요. 누가 챙겼는지 체크해 주세요." items={sharedItems} run={run} supabase={supabase} />
      <PackingList title="내 준비물" hint="나만 보는 체크리스트예요." items={myItems} run={run} supabase={supabase} />

      {others.length > 0 && (
        <div className="space-y-2">
          <h3 className={h3}>다른 사람 준비 현황</h3>
          <ul className="flex flex-wrap gap-2 text-sm">
            {others.map((o) => (
              <li key={o.name} className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                {o.name} {o.done}/{o.total}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PackingList({
  title,
  hint,
  items,
  run,
  supabase,
}: {
  title: string;
  hint: string;
  items: PackingRow[];
  run: ReturnType<typeof useRoomContext>["run"];
  supabase: ReturnType<typeof useRoomContext>["supabase"];
}) {
  const packed = items.filter((p) => p.packed).length;
  return (
    <div className="space-y-3">
      <div>
        <h3 className={h3}>
          {title} <span className="text-sm font-normal text-slate-500">{packed}/{items.length}</span>
        </h3>
        <p className={muted}>{hint}</p>
      </div>
      {items.length === 0 && <p className={muted}>아직 없어요.</p>}
      {groupPacking(items).map(([group, list]) => (
        <div key={group} className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{group}</p>
          <ul>
            {list.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-1 py-1">
                <label className="flex min-w-0 flex-1 items-center gap-3">
                  <input type="checkbox" className="size-4" checked={item.packed} onChange={() => run(() => updateRow(supabase, "packing_items", item.id, { packed: !item.packed }))} />
                  <span className={item.packed ? "text-slate-400 line-through" : ""}>{item.name}</span>
                </label>
                <button type="button" onClick={() => run(() => deleteRow(supabase, "packing_items", item.id))} className={deleteButton} aria-label={`${item.name} 삭제`}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
