// 유효성 오류를 해당 필드 바로 아래에 한국어로 표시 (N-05)
// 입력 칸에는 aria-describedby={id} 를 걸어 스크린리더가 오류를 읽게 한다.

import { fieldError } from "@/components/styles";

export default function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={fieldError}>
      {message}
    </p>
  );
}
