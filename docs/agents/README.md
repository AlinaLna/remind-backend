# ReMind Agent Guide: API Integration & Testing

**Target Audience:** AI Agents, UI Generators, and Coders.
**Purpose:** This guide provides the operational rules, workflows, and test standards required when integrating with or modifying the ReMind API infrastructure.

---

## 1. API Knowledge & Integration Workflow

When instructed to integrate a new frontend UI or build a new API feature, agents MUST follow these architectural rules:

### 1.1 Documentation Discovery
Before modifying or integrating endpoints, check the existing agent-specific knowledge bases:
- **Forum API:** See `docs/agents/forum-api-knowledge.md` for exact JSON request/response shapes, headers, and authorization rules.
- **Domain Rules:** Review `CONTEXT.md` for global vocabularies and architectural decisions.

### 1.2 Authentication & Security Boundaries
- **JWT Middleware:** The backend uses `requireAuth` for standard users and `requireRole('admin')` for moderators. 
- **Header format:** `Authorization: Bearer <token>`
- **Separation of Concerns:** Moderation APIs (Admin) must **always** be separated from User APIs. Admin routes live in `apps/api/src/routes/admin.routes.ts` and user routes live in `apps/api/src/routes/*.routes.ts`. 

### 1.3 Data Saftey & "Soft Deletes"
- **NEVER use hard deletes** for user-generated content (posts, comments, forums).
- Use **Soft Deletes**: 
  - Posts & Comments: Update `status: "deleted"`.
  - Forums / Main Sections: Update `isActive: false`.
- **Public endpoints** must be written to automatically filter out soft-deleted data and omit private fields (like `authorId`).

### 1.4 The `authorDisplayMode` Rule
Any feature interacting with user-generated content must respect the `authorDisplayMode` field:
- `0` = Real Name (maps to `req.user.fullName`)
- `1` = Anonymous (maps to `"Anonymous"`)
The backend strictly handles this translation to prevent clients from spoofing names.

---

## 2. Testing Standards & Execution

Agents modifying the backend **MUST** write and execute tests. The backend relies on Jest, Supertest, and a live/local MongoDB instance for integration testing.

### 2.1 Test Locations & Helpers
- **Directory:** `apps/api/src/tests/`
- **Helper File:** `apps/api/src/tests/helpers.ts` provides the `signToken(id, role, status, fullName)` function. You must use this to generate JWTs for authenticated route testing.

### 2.2 Test Structure
When writing tests in ReMind, agents must:
1. **Create real documents:** Use `Model.create({...})` to set up test data. Do not use Jest mocks for Mongoose models; we run real integration tests.
2. **Authenticate Requests:** Pass the token via `.set('Authorization', \`Bearer ${token}\`)`.
3. **Verify Database State:** Do not just assert the HTTP response. You must query the database to verify the state actually changed (e.g., `const updatedPost = await ForumPost.findById(post._id); expect(updatedPost.status).toBe('deleted');`).
4. **Verify Audit Logs:** Any API that mutates state must write to the `Log` model. Your tests **MUST** assert that the log was written:
   ```typescript
   const logs = await Log.find({ action: 'post.delete' });
   expect(logs.length).toBeGreaterThan(0);
   ```

### 2.3 How to Run Tests
Always run the TypeScript compiler check first, followed by the test suite, using the `rtk` wrapper:

```bash
# Execute this exact command to verify your code:
rtk tsc --noEmit && rtk npm test
```

### 2.4 Fixing TypeScript Errors
If `tsc --noEmit` fails, **you must fix the type errors before completing the task.** 
- Common trap: Express `req.params` values are natively typed as `string | string[] | undefined` depending on the setup. Always cast or validate them as strings before passing them to Mongoose ObjectId validators (e.g., `isValidObjectId(postId as string)`).
- Common trap: Passing mongoose Documents directly to JSON responses. Always cast them `toSafeDocument(doc as any)` or call `.lean()` on the initial query.