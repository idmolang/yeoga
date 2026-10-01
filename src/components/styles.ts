// 여러 폼에서 같이 쓰는 Tailwind 클래스 (빠른 시작 폼과 같은 디자인)

export const input =
  "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 aria-[invalid=true]:border-red-500 dark:border-slate-600 dark:bg-slate-900";
export const choice =
  "flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 has-[:checked]:border-sky-700 has-[:checked]:bg-sky-50 dark:border-slate-600 dark:has-[:checked]:bg-sky-950";
export const fieldLabel = "text-sm font-medium";
export const fieldError = "text-sm text-red-600";
export const card =
  "space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900";
export const primaryButton =
  "rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white hover:bg-sky-800";
export const secondaryButton =
  "rounded-lg border border-slate-300 px-5 py-3 dark:border-slate-600";
export const deleteButton = "shrink-0 px-1 text-sm text-slate-400 hover:text-red-600";
