import { ManagementClient } from "auth0";
import type { Organization } from "@/types/organization";

const PAGE_SIZE = 50;

function createManagementClient(): ManagementClient {
  const {
    AUTH0_DOMAIN,
    AUTH0_MANAGEMENT_CLIENT_ID,
    AUTH0_MANAGEMENT_CLIENT_SECRET,
  } = process.env;
  if (
    !AUTH0_DOMAIN ||
    !AUTH0_MANAGEMENT_CLIENT_ID ||
    !AUTH0_MANAGEMENT_CLIENT_SECRET
  ) {
    throw new Error("Missing Management API environment variables.");
  }
  return new ManagementClient({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_MANAGEMENT_CLIENT_ID,
    clientSecret: AUTH0_MANAGEMENT_CLIENT_SECRET,
  });
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const client = createManagementClient();
  const page = await client.organizations.list({ take: PAGE_SIZE });
  return page.data.map((org) => ({
    id: org.id ?? "",
    name: org.name ?? "",
    display_name: org.display_name ?? org.name ?? "",
  }));
}
