import { StudentHealthPage } from "@/modules/health/pages/StudentHealthPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentHealthPage studentId={id} />;
}
