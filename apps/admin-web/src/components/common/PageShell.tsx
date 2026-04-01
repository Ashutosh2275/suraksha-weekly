import { MobileAdminShell } from "@/components/common/MobileAdminShell";

interface PageShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <MobileAdminShell subtitle={subtitle} title={title}>
      {children}
    </MobileAdminShell>
  );
}
