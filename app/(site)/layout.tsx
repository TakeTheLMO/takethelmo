import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdminArea } from "@/lib/auth/permissions";
import { getLocalUser } from "@/features/local-auth/session";
import { DemoProvider } from "@/features/demo/Store";
import { SaveStatus } from "@/features/workspace/AccountTools";
import { accountRoles } from "@/features/local-auth/profile";
import { ROLE_LABELS } from "@/config/roles";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const local = await getLocalUser();
  const user = await getSessionUser();
  const content = (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        본문 바로가기
      </a>
      <Header
        user={local ? { email: local.email, name: local.name, roleLabel: accountRoles[local.role], local: true } : user ? { email: user.email, roleLabel: ROLE_LABELS[user.profile.role] } : null}
        showAdminLink={local ? local.canSwitchRole : canAccessAdminArea(user?.profile.role)}
      />
      {local && <SaveStatus />}
      <main id="main" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
  return local ? <DemoProvider key={local.id} user={local}>{content}</DemoProvider> : content;
}
