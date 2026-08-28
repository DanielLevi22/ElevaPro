import { Suspense } from "react";
import StudentActivitiesPage from "@/modules/students/pages/StudentActivitiesPage";

/**
 * `useSearchParams` (o filtro de autoria) obriga o Suspense: sem ele o Next
 * recusa a build estática da rota.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <StudentActivitiesPage />
    </Suspense>
  );
}
