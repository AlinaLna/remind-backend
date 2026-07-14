# AI API Knowledge Base for AI Integration

**Purpose:** This document is explicitly written for AI agents and UI generators to understand the exact JSON request/response shapes, behaviors, and authorization rules for the ReMind AI features.

## Architecture Notes
- **Auth Gate:** All AI REST routes use `requireAuth` + `requireActiveUser`. Pending, rejected, banned, or otherwise inactive users receive `403`.
- **SSE Stream:** The AI Chat endpoint uses Server-Sent Events (SSE) to stream responses chunk-by-chunk. Headers sent are:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`
- **Model Engine:** Integrates with Gemini (`gemini-flash-latest`).
- **System Instruction:** Prompted to act as "ReMind AI" - a friendly, empathetic mental health support assistant, responding briefly and gently in Vietnamese. If the user exhibits crisis signs (severe depression, self-harm, suicidal thoughts), it recommends calling the hotline `1800 599 920` or contacting a professional.

---

## 🟢 1. AI Chat REST API

### 1.1 Stream AI Chat
*   **Route:** `POST /api/ai/chat`
*   **Request JSON:**
```json
{
  "prompt": "Mình cảm thấy rất lo lắng về kỳ thi sắp tới",
  "history": [
    {
      "role": "user",
      "text": "Xin chào"
    },
    {
      "role": "ai",
      "text": "Chào bạn, mình có thể giúp gì cho bạn hôm nay?"
    }
  ]
}
```
*   `prompt` (string, required): The current message from the user.
*   `history` (array of objects, optional): Chat history turns. Each turn must have:
    - `role` (string): Either `user` or `ai` (internally mapped to `model` for Gemini API).
    - `text` (string): The message content.

*   **Response SSE Format (`text/event-stream`):**
    Each chunk is sent as a Server-Sent Event formatted as:
    ```
    data: {"text": "<chunk_text>"}
    
    ```
    When the stream is successfully completed, a final `[DONE]` message is sent:
    ```
    data: [DONE]
    
    ```

    In case of errors, a JSON object containing the error description is streamed, followed by connection termination:
    ```
    data: {"error": "Error message description"}
    
    ```

*   **Example Response Stream:**
    ```
    data: {"text":"Chào"}

    data: {"text":" bạn,"}

    data: {"text":" mình"}

    data: {"text":" rất"}

    data: {"text":" tiếc"}

    data: {"text":" vì"}

    data: {"text":" nghe"}

    data: {"text":" điều"}

    data: {"text":" đó..."}

    data: [DONE]
    ```

*   **HTTP Error Responses:**
    - `400 Bad Request`: If `prompt` is missing or not a string.
      ```json
      { "error": "Prompt is required and must be a string" }
      ```
    - `500 Internal Server Error`: If the Gemini API key is missing.
      ```json
      { "error": "Gemini API key is not configured" }
      ```
