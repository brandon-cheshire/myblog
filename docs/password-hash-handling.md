# Password Hash Handling Across Three-Layer Architecture

A guide to handling password hashes so they stay internal to the backend and never cross API or shared-type boundaries.

---

## Principle

**Plain passwords exist only at the edge (request body) and briefly in the service for hashing/verification. Hashed passwords are an internal implementation detail: stored in the database, used only for verification, and never exposed in API responses or shared domain types.**

---

## Layer Responsibilities

### 1. Controller (API / Presentation)

- **Accepts:** Plain `password` (and optionally `currentPassword`, `newPassword`) in request bodies only.
- **Returns:** Domain entities (e.g. `User`) that **do not** include any password or hash field.
- **Rule:** Controllers never read, write, or forward `passwordHash`. They only pass through plain passwords for auth flows (login, confirm, change password, reset).

**Contract:** The public API type for “user” (e.g. `User`, `UserResponse`) must not have a `passwordHash` (or similar) field. That keeps the contract stable and prevents accidental exposure.

---

### 2. Service (Business Logic)

**Verification (login, change password):**

- Load the user from the data layer in a form that includes the hash (e.g. `UserWithPasswordHash`).
- Compare the plain password from the request with the stored hash using a constant-time compare (e.g. bcrypt compare).
- Before returning a user to the controller, **strip the hash** and return only the public user type (e.g. `User`). The hash is used only for the comparison and must not be returned.

**Writing (set password, confirm, change password, reset):**

- Validate the plain password (length, complexity, etc.) if applicable.
- Hash the plain password once (e.g. bcrypt with a salt) in the service layer.
- Pass only the **hash** to the data layer (e.g. `passwordHash`). The data layer should never receive plain passwords.
- After the write, return the same public user type (no hash).

**Scoping the hash:**

- Define an internal type that extends the public user type with `passwordHash` (e.g. `UserWithPasswordHash`).
- Use this type only inside the backend (e.g. in auth and user services and repositories). Services that need to verify a password load this type; after verification they return the public type without the hash.
- Services that don’t need the hash (e.g. “get user by id for display”) should call data access that returns the public user type only, so the hash is never loaded or passed around unnecessarily.

---

### 3. Repository / Data Access

- **Storage:** Persist the hash in a single column (e.g. `password_hash`). Use your normal naming convention (e.g. snake_case for DB columns).
- **Reads:**
  - For auth flows (login, change password): return the entity **with** the hash (e.g. map `password_hash` → `passwordHash` on an internal type). No other layer needs to see this except the service that performs verification.
  - For all other reads (list user, get user by id for profile, etc.): return the entity **without** the hash. Use a mapping step that omits the password column from the returned type so the hash never leaves the data layer for those use cases.
- **Writes:** Accept only the hash (e.g. `passwordHash`) in update/create payloads, never plain passwords. Persist it to the password column (e.g. `password_hash`).

Optional: you can support “update only if provided” (e.g. only set `password_hash` when the update payload includes it) so one update method can handle both password and non-password updates safely.

---

## Data Flow Summary

| Flow              | Controller      | Service                          | Repository / DB        |
|-------------------|-----------------|----------------------------------|------------------------|
| **Login**         | Sends `password`| Loads user with hash, compares, returns user without hash | Read: returns row with `password_hash` for auth only |
| **Set/Change pwd**| Sends `password` (or `newPassword`) | Validates, hashes, passes hash only | Write: receives and stores `password_hash` only |
| **Get user (API)**| Returns `User`  | Returns `User` (no hash)        | Read: returns row without hash (or maps to type without hash) |

---

## Type and Naming Conventions

- **Public / shared type:** e.g. `User` — no `passwordHash` (or `password`) field. Used in API responses and anywhere the “user” is exposed.
- **Internal type:** e.g. `UserWithPasswordHash` — same as `User` plus `passwordHash: string | null`. Used only in backend code paths that need to verify or write a password.
- **DB column:** e.g. `password_hash` — single column storing the hash. Nullable if you support users without a password (e.g. unverified or SSO-only).

Use one hashing algorithm (e.g. bcrypt) with a salt; hash in the service layer and compare there. Keep hashing/compare helpers in a single place (e.g. `hashData`, `compareHashedData`) so you can change algorithm or options in one spot.

---

## Security Checklist

- [ ] Plain password appears only in request body and briefly in service (hash/compare).
- [ ] API and shared types never include `passwordHash` or `password`.
- [ ] Data layer never receives plain password; it only reads/writes the hash.
- [ ] Hash is loaded only when needed (auth flows); other reads omit it.
- [ ] After verification, the service returns the public user type with the hash stripped.
- [ ] Passwords are validated (e.g. strength) before hashing where applicable.
- [ ] Compare function is constant-time (e.g. bcrypt compare), not a plain string compare.

Using this structure in another codebase will keep password handling consistent and prevent hashes from leaking across layers or APIs.
