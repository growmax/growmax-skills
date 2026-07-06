# Security Model

TenantDesk is a multi-tenant SaaS application. The security model rests on two
guarantees:

1. **Tenant isolation.** All data access is tenant-isolated by `organizationId`.
   A request authenticated as a member of org A can never read or write data that
   belongs to org B. Every data-access path filters by the caller's
   `organizationId`, which is taken from the verified JWT and never from client
   input.

2. **Token lifecycle.** JWTs expire after 1 hour and are validated on every
   request. An expired token is rejected, and the client must obtain a fresh token
   via the refresh endpoint. Refresh checks that the presented token is still valid
   before issuing a replacement.

## Roles

Authorization is role-based. The `admin` role is required for report exports and
org administration; the `member` role is the default and is scoped to projects and
tasks within its own organization.

## Reporting a vulnerability

Email security@tenantdesk.example.
