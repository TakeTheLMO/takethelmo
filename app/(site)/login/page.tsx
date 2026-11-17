import { redirect } from "next/navigation";
import { getLocalUser } from "@/features/local-auth/session";
import { LocalLoginForm } from "@/features/local-auth/LoginForm";
import { safeNextPath } from "@/lib/safe-redirect";
import { Container } from "@/components/ui/Container";
export const metadata = { title: "로그인" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getLocalUser()) redirect(safeNextPath(next, "/mypage"));
  return <Container className="py-12 sm:py-16"><section className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-7 sm:p-9">
    <h1 className="text-2xl font-bold">로그인</h1><p className="mt-3 text-sm leading-6 text-gray-500">계정으로 로그인하고 연구실 안전관리 업무를 이어가세요.</p>
    <LocalLoginForm next={next} initialRegister={false} />
    <p className="mt-5 text-xs leading-6 text-gray-500">등록 자료와 첨부는 계정별로 서버에 저장되며 담당 관리자가 확인할 수 있습니다.</p>
  </section></Container>;
}
