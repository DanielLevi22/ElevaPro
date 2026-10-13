import { createStudentsService } from "@elevapro/shared";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StudentsClient } from "@/modules/students/pages/StudentsClient";

export default async function StudentsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const students = user
    ? (await createStudentsService(supabase).fetchStudents(user.id, { limit: 200 })).students
    : [];

  return <StudentsClient initialStudents={students} specialistId={user?.id ?? null} />;
}
