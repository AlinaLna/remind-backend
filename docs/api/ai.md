# AI API Overview

This document outlines the API routes for the ReMind AI features. For detailed AI/UI integration payloads, see `docs/agents/ai-api-knowledge.md`.

---

## 1. REST Endpoints (Authentication + Active Account Required)

| Method | Path | Description |
|---|---|---|
| POST | /api/ai/chat | Stream-based AI chat conversation (Server-Sent Events) |
