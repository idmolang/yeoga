"use client";

// 한국어 폼 검증 (N-05)
// - 규칙은 HTML 기본 속성(required, min, max, maxLength, step)에 그대로 쓴다.
// - 폼에는 noValidate 를 달고, 제출할 때 이 훅이 검사해서 setCustomValidity 로 한국어 문구를 넣는다.
//   브라우저 언어와 관계없이 같은 문구가 필드 바로 아래(FieldError)에 보인다.

import { useCallback, useState, type FormEvent } from "react";
import { formatKDate } from "@/lib/date";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const isField = (el: Element): el is Field =>
  el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;

/** 브라우저의 validity 상태 → 한국어 문구 */
export function koreanMessage(el: Field): string {
  const v = el.validity;
  const type = el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase();
  const min = "min" in el ? el.min : "";
  const max = "max" in el ? el.max : "";

  if (v.valueMissing) {
    if (el.dataset.msgRequired) return el.dataset.msgRequired;
    if (type === "radio" || type === "checkbox" || type === "select") return "하나를 골라 주세요.";
    return "꼭 입력해 주세요.";
  }
  if (v.badInput) return type === "number" ? "숫자만 입력해 주세요." : "올바른 형식으로 입력해 주세요.";
  if (v.typeMismatch || v.patternMismatch) return el.title || "형식이 올바르지 않아요.";
  if (v.tooLong) return `${(el as HTMLInputElement).maxLength}자 이내로 입력해 주세요.`;
  if (v.rangeUnderflow) {
    if (type === "date") return `${formatKDate(min)}부터 고를 수 있어요.`;
    if (type === "time") return `${min} 이후로 입력해 주세요.`;
    return `${Number(min).toLocaleString("ko-KR")} 이상으로 입력해 주세요.`;
  }
  if (v.rangeOverflow) {
    if (type === "date") return `${formatKDate(max)}까지 고를 수 있어요.`;
    if (type === "time") return `${max} 이전으로 입력해 주세요.`;
    return `${Number(max).toLocaleString("ko-KR")} 이하로 입력해 주세요.`;
  }
  if (v.stepMismatch) {
    const step = Number((el as HTMLInputElement).step);
    return `${step.toLocaleString("ko-KR")} 단위로 입력해 주세요.`;
  }
  if (v.customError) return el.validationMessage;
  return "입력값을 확인해 주세요.";
}

export type Errors = Record<string, string | undefined>;

/**
 * const v = useValidation("todo");
 * <form noValidate onSubmit={...} onChangeCapture={v.clearOnChange}>
 *   <input {...v.field("title")} required maxLength={50} />
 *   <FieldError id={v.errorId("title")} message={v.errors.title} />
 * if (!v.validate(e.currentTarget, { title: 추가검사 ? "문구" : undefined })) return;
 */
export function useValidation(prefix: string) {
  const [errors, setErrors] = useState<Errors>({});

  const errorId = useCallback((name: string) => `${prefix}-${name}-error`, [prefix]);

  /** root 안의 입력을 모두 검사. extra 로 스크립트 검사 결과를 더한다. 통과하면 true */
  const validate = useCallback(
    (root: HTMLElement | null, extra: Errors = {}) => {
      if (!root) return false;
      const next: Errors = {};
      let first: Field | null = null;

      const fields = Array.from(root.querySelectorAll("input, select, textarea")).filter(isField);
      for (const el of fields) {
        el.setCustomValidity("");
        // 공백만 넣은 필수 칸도 비어 있는 것으로 본다
        if (el.required && !(el instanceof HTMLSelectElement) && el.type !== "checkbox" && el.type !== "radio" && el.value.trim() === "") {
          el.setCustomValidity(el.dataset.msgRequired ?? "꼭 입력해 주세요.");
        }
        if (!el.willValidate || el.validity.valid) continue;
        const message = el.validity.customError ? el.validationMessage : koreanMessage(el);
        el.setCustomValidity(message);
        if (el.name && !next[el.name]) next[el.name] = message;
        first ??= el;
      }

      for (const [name, message] of Object.entries(extra)) {
        if (!message || next[name]) continue;
        next[name] = message;
        const el = fields.find((f) => f.name === name);
        if (el) {
          el.setCustomValidity(message);
          first ??= el;
        }
      }

      setErrors(next);
      first?.focus();
      return Object.values(next).every((m) => !m);
    },
    [],
  );

  /** 값을 고치면 그 칸의 오류를 지운다 */
  const clearOnChange = useCallback((e: FormEvent<HTMLElement>) => {
    const el = e.target;
    if (!isField(el as Element)) return;
    const field = el as Field;
    field.setCustomValidity("");
    if (field.name) setErrors((prev) => (prev[field.name] ? { ...prev, [field.name]: undefined } : prev));
  }, []);

  const setError = useCallback((name: string, message?: string) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  const field = (name: string) => ({
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errorId(name),
  });

  return { errors, validate, clearOnChange, setError, field, errorId };
}
