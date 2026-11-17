import { LogIn } from "lucide-react";
import { Card } from "./Card";
import { ButtonLink } from "./Button";
import { safeNextPath } from "@/lib/safe-redirect";

// 로그인이 필요한 데이터 페이지에서 비로그인 사용자에게 보여주는 안내.
export function LoginRequired({ next, message }: { next: string; message?: string }) {
  return (
    <Card className="py-12 text-center">
      <LogIn className="mx-auto h-10 w-10 text-brand-600" aria-hidden />
      <p className="mt-4 text-sm text-gray-600">{message ?? "로그인한 기관 구성원만 볼 수 있습니다."}</p>
      <ButtonLink href={`/login?next=${encodeURIComponent(safeNextPath(next))}`} className="mt-6">
        로그인
      </ButtonLink>
    </Card>
  );
}
