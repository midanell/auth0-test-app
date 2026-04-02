import type { AppRole } from "@/types/organization";

export function userHasAdminRole(userRoles: AppRole[]): boolean {
  return userRoles.some((role) => role === "Admin");
}

export function userHasManagerRole(userRoles: AppRole[]): boolean {
  return userRoles.some((role) => role === "Manager");
}

export function userHasUserRole(userRoles: AppRole[]): boolean {
  return userRoles.some((role) => role === "User");
}

export function getHighestUserRole(userRoles: AppRole[] | undefined): AppRole {
  if (!userRoles) return "User";
  if (userHasAdminRole(userRoles)) return "Admin";
  if (userHasManagerRole(userRoles)) return "Manager";
  return "User";
}
