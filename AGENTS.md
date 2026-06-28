@C:\Users\khiem\.codex\RTK.md

## Agent skills

### Project documentation
Use the `remind-docs` skill for fast retrieval of core project documentation, architectural decisions, and context.

### Backend feature file lookup
When implementing a new backend feature, load `remind-docs` — it traces the MVC pattern to find every related file (model, controller, route, middleware, test, API doc, ADR, DB schema, product reqs) by feature keyword. Run parallel glob/grep lookups; if a layer is missing, create it following the forum pattern.

### Issue tracker
Issues and PRDs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels
This repo uses the default five triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs
This repo uses `CONTEXT.md` as the single root for ReMind domain language, vocabulary, and roles. Architectural Decision Records are stored in the `docs/adr/` directory. See `docs/agents/domain.md`.

### Feature clarification
When a requested feature is underspecified, do not guess key product behavior. Use the `grill-with-docs` clarification skill before implementation.

Ask focused questions until the actor, user journey, MVP scope, data ownership, privacy/security impact, and acceptance criteria are clear enough to build. Record any durable product or architecture decision back into the relevant project docs.

---

# ReMind Project Context

This workspace is for ReMind, a mental-health support platform combining expert discovery, forums, AI support, and paid 1-1 consultations with psychological experts. The MVP should stay focused on the core student/expert/community experience and defer organization features, face-to-face meetings, voice/video calls, and complex payment flows until later phases.

## Primary Source Documents

- `ReMind-platformsupport.md`: product/support requirements, originally in Vietnamese text.
- `ReMind-mongodb-database-design.md`: primary MongoDB data model and collection reference.
- `ReMind-mongodb-database-design.dbml`: DBML view of the MongoDB model.
- `ReMind-mongodb-drawio.mmd`: diagram source for the MongoDB design.
- `TECHNICAL_STACK.md`: approved MongoDB, Express/Fastify, JWT, Socket.io, and deployment decisions.
- `ARCHITECTURE.md`: older Firebase-first architecture notes. Treat as legacy unless the task explicitly asks for Firebase work.
- `DESIGN.md`: frontend design system for the Expo/React Native app.
- `.scratch/remind-platform-prd/PRD.md`: current PRD.

## Current MVP Actors

The current product should focus on four main actors:

- `guest`: unauthenticated visitor.
- `student`: user receiving support.
- `expert`: psychological expert.
- `admin`: platform operator.

Future actors/features:

- `organization` and organization manager flows are future-phase features.
- `manager` exists in the MongoDB model for future organization staff accounts, but should not drive MVP scope.
- `system_manager` or advanced admin-permission management is future-phase unless needed before launch.
- AI remains a system participant for AI chat/risk detection, but it is not a primary human actor.

## Product Model

Current MVP journeys:

- Guests can search/browse experts and read/search forum content.
- Students can register, manage their own profile, use anonymous display in forums, join forum group discussions, book experts when booking/payment is enabled, and report issues.
- Experts can onboard, manage their public professional profile, participate in forum group discussions, manage availability when booking is enabled, and consult with students.
- Admins approve experts, moderate forum content/group discussions, handle reports, manage users, and review operational data.

Forum/group-chat decision:

- Do not build a separate standalone group support chat for MVP.
- Group chat should live inside the forum model as public or moderated forum group discussions.
- Students and experts can join forum group discussions.
- Guests can browse/search public forum content but should not post or join as active participants unless the product explicitly allows guest posting later.

Future product journeys:

- Organization managers can invite members, manage join codes, allocate purchased credits, and view only anonymized/aggregate organization reports.
- Face-to-face meeting scheduling and voice/video calls can be added after the booking foundation is stable.

## Technical Direction

Use MongoDB as the primary database for new backend and data-model work.

- The backend is located in `apps/api/` (Express.js + TypeScript).
- The core directory structure follows an MVC-style pattern:
  - `src/routes`: API route definitions.
  - `src/controllers`: Request handling and business logic.
  - `src/middlewares`: Authentication and role checks (e.g., `requireAuth`, `requireRole('admin')`).
  - `src/config/db.ts`: MongoDB connection setup.
- Admin MVP routes exist for expert approval/rejection (`/api/admin/experts/*`) and moderation (`/api/admin/reports/*`).
- Use MongoDB ObjectId `_id` values as primary identifiers.
- Use Mongoose or the native MongoDB driver according to the surrounding code.
- Do not store fields with `null` values; omit fields that do not apply.
- Frontends must not write directly to MongoDB.
- All creates, updates, deletes, moderation actions, and sensitive reads go through authenticated backend APIs.
- Prefer Express.js or Fastify REST APIs for the backend unless the task explicitly targets existing Firebase Cloud Functions.
- Use JWT auth with short-lived access tokens and refresh-token rotation stored in MongoDB.
- Use Socket.io plus MongoDB Change Streams for real-time forum/group discussion behavior when real-time features are implemented.
- Use GridFS for credential files, avatars, and attachments unless the task explicitly moves storage to S3 or another object store.

Firebase note:

- This repo still contains Firebase-oriented code, rules, and architecture docs from earlier work.
- Do not expand Firestore/Firebase architecture for new product features unless the user specifically asks for Firebase.
- If touching existing Firebase code, preserve working behavior and call out any conflict with the MongoDB direction.

## Core Security Decisions

- Keep mental-health, credential, moderation, report, payment, and private account data behind backend authorization.
- Backend APIs must filter returned fields. Never rely on the client to hide sensitive data.
- Public expert profiles must be separated from private expert onboarding, license, certification, admin-review, and payout data.
- Public forum content must not expose private author identity when anonymous student display is enabled.
- Sensitive files require backend authorization and short-lived access; do not expose public credential-file URLs.
- Backend writes should create logs for important or sensitive changes.
- Use rate limiting, request validation, CORS allowlists, password hashing, token rotation, and NoSQL injection protections for backend endpoints.
- Organization reporting must not expose chat contents, consultation notes, crisis data, or private mental-health information when organization features are added later.

## Main Data Areas

Current/MVP data areas:

- Users, roles, account status, anonymous student display mode, and role-specific profile sections.
- Public expert profiles separated from private expert onboarding, license, and certification data.
- Expert onboarding, professional profile, specialties, education, certifications, license review, and approval.
- Forums, forum posts, forum comments, forum group discussions, moderation status, reports, and ratings.
- Expert availability, slots, appointments, payments, credit wallets, and credit transactions when booking is included.
- Notifications, uploaded files, optimized image variants, signed access for sensitive files, logs, platform settings, policy versions, user consents, and analytics summaries.

Future data areas:

- Organization subscriptions, members, invitations, join codes, redemptions, pooled credit allocation, and de-identified organization reports.
- Face-to-face meeting location details.
- Voice/video call session metadata and provider integration.

## Frontend And Mobile Direction

The main client is an Expo + React Native + TypeScript app under `apps/remind`.

- Treat Android/mobile as first-class, not as a web afterthought.
- React Native Web may be used for wider web layouts when compatible with the Expo architecture.
- Keep UI code in React Native primitives and Expo-compatible libraries.
- Do not introduce Tailwind, GSAP, or web-only component libraries inside the app unless the architecture changes deliberately.
- Keep backend/API calls outside visual-only components where practical.
- Use `DESIGN.md` and `apps/remind/src/theme/tokens.ts` as the visual source of truth.
- Preserve the ReMind feel: calm, credible, private, professional, mobile-first, accessible, and not overly decorative.

Frontend agent guidance:

- Use the `frontendReact` subagent for substantial React, TypeScript, or React Native screen/component work when delegation is useful.
- When using `frontendReact` for React Native, explicitly remind it to respect Expo and React Native constraints instead of web-only DOM assumptions.
- For visual design work, load the relevant UI skill before editing screens: `design-taste-frontend`, `high-end-visual-design`, `minimalist-ui`, or `gpt-taste` depending on the request.
- For ReMind product screens, prefer `design-taste-frontend` plus `DESIGN.md`. Use the more dramatic UI skills only when the user asks for landing pages, brand visuals, or high-end marketing surfaces.

## Fastest Deploy Path

Fastest useful deployment:

1. Guest expert search and public expert profiles.
2. Guest forum browsing/search.
3. Auth for students and experts.
4. Expert onboarding with admin approval.
5. Forum posting/comments plus forum group discussions for students and experts.
6. Basic admin moderation and report handling.

Defer for later because they add more risk and integration work:

- Payments, subscriptions, credit wallets, refunds, and payouts.
- Appointment booking and slot locking.
- AI risk/crisis escalation.
- Organization manager flows.
- Face-to-face meeting and call/video features.

## Working Notes For Agents

- Read this file before broad product, architecture, backend, or frontend work.
- Treat `ReMind-mongodb-database-design.md` as the broad schema reference, but trim MVP scope according to this context.
- Treat `DESIGN.md` as the frontend design source of truth.
- Prefer the smallest correct change that moves the MVP forward.
- If a task conflicts with Firebase-first docs or code, state the conflict and prefer MongoDB for new work unless the user says otherwise.
- Report impacts on expert performance should apply only after admin verification.

## Expert Onboarding Decision

- Expert onboarding submissions live in private backend-owned records and are reviewed through admin APIs.
- Credential files use backend-controlled access and short-lived signed URLs or streamed authorized downloads.
- Approval publishes only sanitized fields to public expert profile read models.
- Rejection or suspension keeps the expert private and records the reason for authorized users.
