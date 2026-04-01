export interface Organization {
  id: string;
  name: string;
  display_name: string;
}

export interface OrgMember {
  user_id: string;
  name: string;
  email: string;
  picture: string;
  role?: string;
}

export type AppRole = "Admin" | "Manager" | "User";

export interface TenantRole {
  id: string;
  name: string;
}

export interface OrgConnection {
  connection_id: string;
  name: string;
  requires_username: boolean;
}
