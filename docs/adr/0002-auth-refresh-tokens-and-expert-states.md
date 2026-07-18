# ADR 0002: Auth, Refresh Tokens, and Expert States

## Context
We need a secure way to handle user authentication, password storage, and expert onboarding without relying on Firebase. Experts need to register and log in to complete onboarding but must not access paid features until approved.

## Decision
1. Use JWT with short-lived Access Tokens (e.g., 15m) and long-lived Refresh Tokens (e.g., 7d) rotated on use.
2. Google social login: frontend `@react-oauth/google` (implicit flow), backend verifies access token via `https://www.googleapis.com/oauth2/v3/userinfo`. No Passport.js or `google-auth-library`. New Google users created as `student`/`active`.
2. Hash passwords and refresh tokens in MongoDB using `bcryptjs` (cost 12).
3. Registration defaults: students become `active`, experts become `pending`. Google-login users (always `student` role) also become `active`.
4. Pending experts can log in (to complete profile) but are blocked by a new `requireActiveUser` middleware from accessing subscription/money/session token features.
5. Banned and rejected users are blocked at login.
6. Expert credential files are uploaded to MongoDB GridFS in the dedicated `credentials` bucket. The resulting `fileId` and `fileName` are stored on `user.expert.credentials`.
7. Admin approval sets `user.isValidatedExpert = true`; `POST /api/experts/:id/slots` stays blocked with `403` until that flag is true.
8. Credential files are not public assets. Admin review uses authenticated streamed downloads instead of public URLs; short-lived signed links remain a future enhancement only.

## Consequences
- **Positive**: Better security via token rotation.
- **Positive**: Clear separation of identity (`requireAuth`) vs capability (`requireActiveUser`).
- **Positive**: Credential review stays private while still allowing admins to inspect uploads.
- **Positive**: Slot publishing cannot start until an expert is verified.
