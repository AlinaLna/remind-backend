# ADR 0001: Forum MVP Data Model Simplification

## Context
The ReMind PRD requests a forum experience where guests can browse/search, and students/experts can participate in discussions and group chats. The documentation originally referenced "topics" and "posts" somewhat interchangeably.

We needed to establish the exact schema for the first feature slice (Guest Browse & Search) and ensure it wouldn't slow down the MVP launch while remaining secure.

## Decision
1. **No separate "Topic" collection**: For the MVP, `forums` represent the high-level categories/rooms, and `forumPosts` represent the individual topics/questions.
2. **Aggregated Post Detail**: To make guest browsing immediately useful, the `GET /api/forums/posts/:postId` endpoint returns the parent post and all of its active `forumComments` in a single response, rather than requiring separate pagination for MVP.
3. **Strict Backend Filtering**: Because MongoDB stores the private `authorId` alongside content, the backend API explicitly filters out `authorId` and only returns `publicAuthorName` and `authorDisplayMode` to the client for any public reads.
4. **Independent Backend Node**: The new forum API logic is built in Express/Mongoose (`apps/api`) instead of modifying legacy Firebase functions, aligning with the platform's long-term database shift.

## Consequences
- **Positive**: Launching the guest MVP slice is significantly faster and requires fewer network requests from the client.
- **Positive**: It solidifies the vocabulary early (`Forum` -> `Forum Post` -> `Forum Comment`), avoiding future confusion.
- **Negative/Trade-off**: As discussions grow, returning all comments inside the post detail endpoint might become slow, meaning we will need to introduce pagination to the comments array in a later phase.
