import { getDashboardData } from "@/lib/api";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardView data={data} />;
}
