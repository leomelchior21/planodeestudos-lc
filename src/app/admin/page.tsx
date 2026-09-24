import { isAdmin } from "@/lib/admin-auth";
import {
  schoolRepository,
  storageMode,
} from "@/repositories/school-repository";
import { AdminPanel, AdminLogin } from "@/components/admin-panel";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  return (
    <AdminPanel
      initial={await schoolRepository.read()}
      storageMode={storageMode}
    />
  );
}
