# Logging: Context and userId

How request context and `userId` are used with logging in the backend.

---

## 1. Automatic request context

Logging is configured in `packages/smartconfig-backend/src/common/utils/app-logger/log-registration.ts`. Every HTTP request gets an **enriched context** that is attached to all log entries for that request (via `nestjs-context-logger`).

### Context fields

| Field              | Source                    | Meaning                                      |
|--------------------|---------------------------|----------------------------------------------|
| `correlationId`   | Auto-generated per request | Request trace id; also sent as `x-correlation-id` header. |
| `adminUserId`     | `request.user?.userId`    | Admin user performing the request, or `'unknown'`.       |
| `chatClientUserId`| `request.user?.clientIdentifier` | Chat client identifier, or `'unknown'`.  |
| `environment`     | App config                | e.g. `local`, `development`, `production`.   |

So you **do not** need to pass a “transaction id” or the acting user’s id in every log call for that request—they are already on the context.

### Example

For an admin request, every log line in that request will include something like:

```json
{
  "correlationId": "...",
  "adminUserId": "uuid-of-admin",
  "chatClientUserId": "unknown",
  "environment": "development",
  "msg": "Creating new agent",
  "data": { "name": "...", "createdBy": "..." }
}
```

---

## 2. Explicit userId in log data

In addition to context, many log calls pass **`userId`** (and sometimes **`role`**) explicitly in the **second argument** (the `data` object) to make the log line self-explanatory: who did what, or who was affected.

### Controllers

- **Actor (who performed the action)**  
  Use `userId: requestUser.userId` and often `role: requestUser.role` for:
  - **warn**: e.g. “Unauthorized access attempt to create agent”, “Agent not found in getById endpoint”
  - **error**: in `catch` blocks, e.g. `{ userId: requestUser.userId }` or `{ agentId: params.id, userId: requestUser.userId }`

- **Actor vs target user**  
  When the operation is *on* another user (e.g. deactivate, role update, delete), use two keys so logs are unambiguous:
  - **`userId`** = the admin performing the action (`requestUser.userId`)
  - **`targetUserId`** (or **`params.userId`**) = the user being acted on

Example:

```typescript
this.logger.error(
  { message: 'Error deactivating user', error },
  { targetUserId: params.userId, userId: requestUser.userId },
);
```

### Services

Use **`userId`** (or **`params.userId`**) in the log **data** when the log is about something that happened to or for that user:

- **info**: e.g. “Confirming password for user”, “Changing password for user”, “Creating new chat” with `{ userId }` or `{ userId: params.userId, agentId }`
- **debug**: e.g. “Finding user by ID”, “Finding chats” with `{ userId: params.userId }`
- **warn**: e.g. “User not found by ID”, “Attempted to update protected user” with `{ userId }` or `{ userId: params.userId }`
- **Actor on an entity**: use names like `deletedBy`, `restoredBy`, `updatedBy`, `createdBy` when logging mutations, e.g. `{ agentId: id, deletedBy: userId }`

---

## 3. Summary

| Use case                         | Where it comes from                    |
|----------------------------------|----------------------------------------|
| Acting user on every log in request | **Context**: `adminUserId` (and `chatClientUserId`) |
| Request trace id                  | **Context**: `correlationId`           |
| Who did what in a specific log   | **Explicit**: `userId: requestUser.userId` (and often `role`) in `data` |
| User being acted on              | **Explicit**: `targetUserId` or `params.userId` in `data` |
| Subject of a service log         | **Explicit**: `userId` or `params.userId` in `data`; or `deletedBy` / `createdBy` etc. for mutations |

So **userId** and context are used in two ways: (1) **automatically** via request context (`adminUserId`, `chatClientUserId`, `correlationId`) for every log in that request, and (2) **explicitly** in the log **data** argument when you need to spell out the actor, the target user, or the subject of the operation for that specific message.
