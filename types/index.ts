import type { Role } from "@/config/roles";

export type RecordStatus = "active" | "inactive" | "closed" | "archived";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  status: RecordStatus;
  organization_id: string | null;
  department_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  created_at: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  target_table: string | null;
  target_id: string | null;
};
