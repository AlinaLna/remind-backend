# Expert Verification & Slot Gating API Overview

This document covers expert credential upload, admin credential review, and the slot-publishing gate. For the broader booking flow, see `docs/api/appointments.md`.

## Workflow
- Expert registers and remains `pending` until admin approval.
- Expert uploads a credential file with `POST /api/experts/me/credentials`.
- The file is stored in MongoDB GridFS bucket `credentials` and the resulting `fileId` / `fileName` / `uploadedAt` entries are saved on `user.expert.credentials`.
- Admin lists pending experts, streams the credential for review, then approves or rejects.
- Approval sets `user.status = 'active'` and `user.isValidatedExpert = true`; rejection sets `user.status = 'rejected'`.
- Approval/rejection also creates an expert-facing notification and emits a realtime status update.
- `POST /api/experts/:id/slots` returns `403` until `isValidatedExpert` is true.

## MVC Trace
| Layer | File | Responsibility |
|---|---|---|
| Model | `src/models/user.model.ts` | Adds `isValidatedExpert` and `expert.credentials` |
| Model | `src/models/notification.model.ts` | Adds `EXPERT_APPROVED` / `EXPERT_REJECTED` notification types |
| Service | `src/services/gridfs.service.ts` | GridFS helpers over `mongoose.connection.db` |
| Controller | `src/controllers/expert.controller.ts` | `uploadCredential` and slot-creation gate |
| Controller | `src/controllers/admin.controller.ts` | `downloadExpertCredential` and expert review notifications |
| Route | `src/routes/expert.routes.ts` | `POST /api/experts/me/credentials` |
| Route | `src/routes/admin.routes.ts` | `GET /api/admin/experts/:id/credential/:fileId` |

## 1. Expert Credential Upload
- `POST /api/experts/me/credentials`
- Multipart form-data upload; file field is `file`.
- Stores the upload in GridFS bucket `credentials`.
- Keeps credential files private; no public file URL is generated.

## 2. Admin Review
- `GET /api/admin/experts/pending` — pending experts now include `expert.credentials`.
- `GET /api/admin/experts/:id/credential/:fileId` — authenticated admin-only streamed download.
- `POST /api/admin/experts/:id/approve` — sets expert active and validated, then notifies the expert.
- `POST /api/admin/experts/:id/reject` — requires a reason, then notifies the expert.

## 3. Expert Review Notifications
- Notification types: `EXPERT_APPROVED`, `EXPERT_REJECTED`.
- Approved content: `Hồ sơ chuyên gia của bạn đã được phê duyệt. Bạn có thể sử dụng đầy đủ tính năng chuyên gia.`
- Rejected content: `Hồ sơ chuyên gia của bạn đã bị từ chối. Lý do: <reason>`
- Socket.io emits `expert:status-updated` globally with `{ expertId, status }` so the expert client can update immediately; it complements the existing admin-facing `admin:new-expert` event.

## 4. Slot Publishing Gate
- `POST /api/experts/:id/slots` — blocked with `403` unless `isValidatedExpert=true`.
- The gate prevents unverified experts from publishing bookable slots.

## Security Notes
- Credential files are not exposed via public URLs.
- Admin download is authenticated with `requireAuth` + `requireRole('admin')` and streamed from GridFS.
- Short-lived signed download links can be added later if the product wants expiring links; current implementation uses backend-streamed access.
