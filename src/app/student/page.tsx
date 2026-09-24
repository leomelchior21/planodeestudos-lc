import { schoolRepository } from "@/repositories/school-repository";
import { StudentWizard } from "@/components/student-wizard";
export const dynamic = "force-dynamic";
export default async function StudentPage() {
  return <StudentWizard school={await schoolRepository.read()} />;
}
