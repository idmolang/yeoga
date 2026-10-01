"use client";

// F-10 준비물 관리: 분류별로 묶어 보여주고 챙김 체크·추가·삭제 (이름 중복 불가)

import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { card, deleteButton, fieldLabel, input, primaryButton } from "@/components/styles";
import { groupPacking } from "@/lib/sort";
import { PACKING_GROUPS, type PackingItem, type Trip } from "@/types/trip";

type Props = { trip: Trip; update: (next: Trip) => void };

const EMPTY_FORM = { name: "", group: "" };
type Form = typeof EMPTY_FORM;

/** "보조 배터리" 와 "보조배터리" 처럼 공백·대소문자만 다른 이름도 같은 것으로 본다 */
const normalize = (name: string) => name.replace(/\s+/g, "").toLowerCase();

export default function PackingTab({ trip, update }: Props) {
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [error, setError] = useState("");

  const set = (key: keyof Form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "name") setError("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); // required 검사는 브라우저가 이미 통과시킨 상태
    const name = form.name.trim();

    if (!name) return setError("준비물 이름을 입력해 주세요.");
    const duplicate = trip.packing.find((p) => normalize(p.name) === normalize(name));
    if (duplicate) return setError(`"${duplicate.name}"은(는) 이미 ${duplicate.group}에 있어요.`);

    const item: PackingItem = { id: crypto.randomUUID(), name, group: form.group, packed: false };
    update({ ...trip, packing: [...trip.packing, item] });
    setForm({ ...EMPTY_FORM, group: form.group }); // 같은 분류로 연달아 추가하기 쉽게
  };

  const toggle = (id: string) =>
    update({
      ...trip,
      packing: trip.packing.map((p) => (p.id === id ? { ...p, packed: !p.packed } : p)),
    });

  const remove = (id: string) =>
    update({ ...trip, packing: trip.packing.filter((p) => p.id !== id) });

  const packedCount = trip.packing.filter((p) => p.packed).length;

  return (
    <section className="space-y-4">
      <form onSubmit={handleSubmit} className={card} aria-label="준비물 추가">
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <div className="space-y-1">
            <label className="block space-y-1">
              <span className={fieldLabel}>준비물</span>
              <input
                type="text"
                className={input}
                required
                maxLength={30}
                placeholder="예: 우산"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={!!error}
                aria-describedby="packing-name-error"
              />
            </label>
            <FieldError id="packing-name-error" message={error} />
          </div>
          <label className="block space-y-1">
            <span className={fieldLabel}>분류</span>
            <select
              className={input}
              required
              value={form.group}
              onChange={(e) => set("group", e.target.value)}
            >
              <option value="" disabled>
                선택
              </option>
              {PACKING_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className={`w-full ${primaryButton}`}>
          준비물 추가
        </button>
      </form>

      {trip.packing.length === 0 ? (
        <p className="text-slate-500">준비물이 없어요. 위에서 추가해 보세요.</p>
      ) : (
        <p className="text-sm text-slate-500">
          {packedCount} / {trip.packing.length}개 챙김
        </p>
      )}

      {groupPacking(trip.packing).map(([group, items]) => (
        <div key={group} className="space-y-1">
          <h3 className="font-semibold">
            {group} <span className="text-sm font-normal text-slate-500">{items.length}</span>
          </h3>
          <ul>
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-2 py-1">
                <label className="flex min-w-0 flex-1 items-center gap-3">
                  <input type="checkbox" checked={item.packed} onChange={() => toggle(item.id)} />
                  <span className={`break-words ${item.packed ? "text-slate-400 line-through" : ""}`}>
                    {item.name}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className={deleteButton}
                  aria-label={`${item.name} 삭제`}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
