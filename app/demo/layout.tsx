import { DemoProvider } from "@/features/demo/Store";
import { DemoShell } from "@/features/demo/Shell";
export const metadata = { title: "사용자 체험 데모" };
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoProvider>
      <DemoShell>{children}</DemoShell>
    </DemoProvider>
  );
}
