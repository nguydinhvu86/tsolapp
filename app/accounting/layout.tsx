import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const permissions = (session.user as any)?.permissions as string[] || [];
  const canView = permissions.includes("ACCOUNTING_VIEW") || permissions.includes("ACCOUNTING_VIEW_ALL") || (session.user as any)?.role === "ADMIN";
  if (!canView) {
      redirect("/dashboard");
  }

  return <>{children}</>;
}
