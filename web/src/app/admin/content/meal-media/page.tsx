import { exigirPainelAdmin } from "@/lib/page-auth";
import { MealMediaAdminPage } from "@/nutrition";

export default async function Page() {
  await exigirPainelAdmin();
  return <MealMediaAdminPage />;
}
