import { Construction } from "lucide-react";
import { Card } from "./Card";

// 준비 중 안내. 작동하지 않는 버튼이나 예시 데이터를 넣지 않는다 (명세 원칙).
export function ComingSoon({ title, message }: { title?: string; message?: string }) {
  return (
    <Card className="py-14 text-center">
      <Construction className="mx-auto h-10 w-10 text-brand-600" aria-hidden />
      {title && <h2 className="mt-4 text-lg font-semibold text-gray-900">{title}</h2>}
      <p className="mt-2 text-sm text-gray-600">
        {message ?? "준비 중인 페이지입니다. 기능이 구현되면 이곳에서 이용할 수 있습니다."}
      </p>
    </Card>
  );
}
