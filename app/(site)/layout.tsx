import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdminArea } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/config/roles";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        본문 바로가기
      </a>
      <Header
        user={user ? { email: user.email, roleLabel: ROLE_LABELS[user.profile.role] } : null}
        showAdminLink={canAccessAdminArea(user?.profile.role)}
      />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
