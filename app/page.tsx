import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { dashboardPathByRole } from "@/lib/authorization";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  redirect(dashboardPathByRole(session.role));
}
