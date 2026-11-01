import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { adminMenuFor } from "@/config/admin-navigation";
import { ADMIN_AREA_ROLES, ROLE_LABELS } from "@/config/roles";
import { requireRole } from "@/lib/auth/guards";

// 일반 사이트(Header/Footer)와 분리된 관리자 전용 레이아웃.
// 레이아웃의 검사는 보조 수단이다. 각 page.tsx도 requireRole을 호출해야 한다.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(ADMIN_AREA_ROLES, "/admin");
  const menu = adminMenuFor(user.profile.role).map(({ label, href }) => ({ label, href }));

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
        <Logo href="/admin" />
        <span className="rounded bg-brand-800 px-2 py-0.5 text-xs font-medium text-white">관리자</span>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link href="/" className="text-gray-600 hover:text-brand-700">사이트로 이동</Link>
          <span className="hidden text-gray-600 sm:inline">{ROLE_LABELS[user.profile.role]}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="rounded-md px-3 py-1.5 text-gray-700 hover:bg-gray-100">로그아웃</button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b border-gray-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <AdminSidebar items={menu} />
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
