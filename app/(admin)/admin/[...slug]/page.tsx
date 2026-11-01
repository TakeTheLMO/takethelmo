import { notFound, redirect } from "next/navigation";
import { Construction } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { findAdminItem } from "@/config/admin-navigation";
import { ADMIN_AREA_ROLES } from "@/config/roles";
import { requireRole } from "@/lib/auth/guards";

// 아직 구현되지 않은 관리자 메뉴. 이 파일이 있어도 /admin/** 는 항상 권한 검사를 거친다.
export default async function AdminComingSoon({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const href = `/admin/${slug.join("/")}`;
  const user = await requireRole(ADMIN_AREA_ROLES, href);
  const item = findAdminItem(href);
  if (!item) notFound();
  if (!item.roles.includes(user.profile.role)) redirect("/forbidden");

  return (
    <Card className="max-w-xl py-12 text-center">
      <Construction className="mx-auto h-10 w-10 text-brand-600" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">{item.label}</h1>
      <p className="mt-2 text-sm text-gray-600">준비 중인 페이지입니다.</p>
      <ButtonLink href="/admin" variant="outline" className="mt-6">대시보드로</ButtonLink>
    </Card>
  );
}
