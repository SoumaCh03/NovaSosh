# NOVA — API Specification (Phase 1 / MVP)

## Conventions

- **Base URL:** `https://api.nova.app/v1`
- **Auth:** `Authorization: Bearer <accessToken>` on all endpoints except
  those explicitly marked `Public`.
- **Content type:** `application/json` unless uploading raw bytes.
- **Pagination:** cursor-based on all list endpoints.
  - Request: `?limit=20&cursor=<opaque_cursor>`
  - Response: `{ "data": [...], "nextCursor": "<opaque_cursor>" | null }`
- **Error format (all non-2xx responses):**
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human-readable summary",
      "details": [{ "field": "email", "issue": "must be a valid email" }]
    }
  }
  ```
- **Rate limiting:** every response includes `X-RateLimit-Limit`,
  `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Exceeding the limit returns
  `429` with `Retry-After`.
- **Versioning:** breaking changes ship under `/v2`; `/v1` is supported for
  at least 12 months after a `/v2` launch.

---

## 1. Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create account with email/password |
| POST | `/auth/login` | Public | Exchange credentials for access+refresh tokens |
| POST | `/auth/refresh` | Public (refresh cookie) | Rotate refresh token, issue new access token |
| POST | `/auth/logout` | Required | Revoke current session's refresh token |
| POST | `/auth/logout-all` | Required | Revoke all sessions for the user |
| POST | `/auth/verify-email` | Public | Confirm email via emailed token |
| POST | `/auth/resend-verification` | Public | Resend email verification token |
| POST | `/auth/forgot-password` | Public | Send password reset email |
| POST | `/auth/reset-password` | Public | Set new password via reset token |
| GET | `/auth/sessions` | Required | List active sessions/devices |
| DELETE | `/auth/sessions/:id` | Required | Revoke a specific session |

**POST `/auth/register`**
```json
// Request
{ "email": "user@example.com", "password": "Str0ngP@ssw0rd!", "username": "janedoe" }

// 201 Response
{ "userId": "uuid", "status": "PENDING_VERIFICATION" }
```

**POST `/auth/login`**
```json
// Request
{ "email": "user@example.com", "password": "Str0ngP@ssw0rd!" }

// 200 Response
{
  "accessToken": "eyJ...",
  "expiresIn": 900,
  "user": { "id": "uuid", "username": "janedoe", "displayName": "Jane Doe" }
}
// refreshToken set as httpOnly, Secure, SameSite=Strict cookie
```

Errors: `401 INVALID_CREDENTIALS`, `403 ACCOUNT_SUSPENDED`,
`429 TOO_MANY_ATTEMPTS` (after N failed logins, with exponential backoff).

---

## 2. Users & Profiles

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Required | Current user's full profile |
| PATCH | `/users/me` | Required | Update own profile fields |
| GET | `/users/:username` | Public | Public profile by username |
| GET | `/users/:username/posts` | Public | Paginated posts by user (respects visibility/blocks) |
| POST | `/users/:id/follow` | Required | Follow (or request to follow, if private) |
| DELETE | `/users/:id/follow` | Required | Unfollow |
| GET | `/users/:id/followers` | Public | Paginated followers list |
| GET | `/users/:id/following` | Public | Paginated following list |
| POST | `/users/:id/block` | Required | Block a user |
| DELETE | `/users/:id/block` | Required | Unblock |
| POST | `/users/:id/mute` | Required | Mute a user's content |

**PATCH `/users/me`**
```json
// Request (all fields optional)
{ "displayName": "Jane D.", "bio": "Designer & coffee enthusiast", "isPrivate": false }
```

---

## 3. Posts & Feed

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/posts` | Required | Create a post |
| GET | `/posts/:id` | Public* | Get single post |
| DELETE | `/posts/:id` | Required (owner) | Soft-delete a post |
| GET | `/feed/following` | Required | Chronological feed of followed accounts |
| GET | `/feed/recommended` | Required | Ranked feed (engagement-based for MVP, ML later) |
| POST | `/posts/:id/like` | Required | Like a post |
| DELETE | `/posts/:id/like` | Required | Unlike |
| POST | `/posts/:id/comments` | Required | Comment on a post |
| GET | `/posts/:id/comments` | Public* | Paginated comments |
| DELETE | `/comments/:id` | Required (owner or moderator) | Remove a comment |
| POST | `/posts/:id/share` | Required | Share/repost |
| POST | `/posts/:id/save` | Required | Save to private collection |

*Public endpoints still enforce `visibility` and block-list rules server-side.

**POST `/posts`**
```json
// Request
{
  "type": "IMAGE",
  "caption": "Sunset at the bay #goldenhour",
  "visibility": "PUBLIC",
  "mediaIds": ["media-uuid-1", "media-uuid-2"]
}
// mediaIds come from the /media/presign + upload flow (see §6) completed beforehand

// 201 Response
{ "id": "post-uuid", "createdAt": "2026-06-23T10:00:00Z", "media": [...] }
```

**GET `/feed/recommended`**
```json
// 200 Response
{
  "data": [
    {
      "id": "post-uuid",
      "author": { "id": "uuid", "username": "janedoe", "avatarUrl": "..." },
      "caption": "...",
      "media": [{ "url": "...", "type": "IMAGE", "width": 1080, "height": 1350 }],
      "likeCount": 42,
      "commentCount": 5,
      "viewerHasLiked": false,
      "createdAt": "..."
    }
  ],
  "nextCursor": "opaque-cursor-string"
}
```

---

## 4. Stories

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/stories` | Required | Create a story (expires in 24h) |
| GET | `/stories/feed` | Required | Active stories from followed accounts, grouped by author |
| GET | `/stories/:id` | Required | Get a single story (records a view) |
| GET | `/stories/:id/viewers` | Required (owner) | Who viewed this story |
| DELETE | `/stories/:id` | Required (owner) | Remove a story early |

---

## 5. Messaging

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/conversations` | Required | List conversations, sorted by latest activity |
| POST | `/conversations` | Required | Start a direct or group conversation |
| GET | `/conversations/:id/messages` | Required (participant) | Paginated message history |
| POST | `/conversations/:id/messages` | Required (participant) | Send a message (REST fallback; primary path is WS) |
| POST | `/conversations/:id/read` | Required (participant) | Mark conversation read up to a message ID |
| POST | `/conversations/:id/participants` | Required (admin/owner) | Add participant to group |
| DELETE | `/conversations/:id/participants/:userId` | Required (admin/owner or self) | Remove participant / leave |

**POST `/conversations`**
```json
// Request (direct)
{ "type": "DIRECT", "participantIds": ["other-user-uuid"] }

// Request (group)
{ "type": "GROUP", "title": "Weekend Trip", "participantIds": ["uuid1", "uuid2", "uuid3"] }
```

### WebSocket events (`/messaging` namespace, Socket.io)

Handshake auth: `{ token: "<accessToken>" }`

| Event (client → server) | Payload | Description |
|---|---|---|
| `message:send` | `{ conversationId, type, content, mediaUrl? }` | Send a message |
| `typing:start` / `typing:stop` | `{ conversationId }` | Typing indicator |
| `message:read` | `{ conversationId, messageId }` | Mark read up to message |

| Event (server → client) | Payload | Description |
|---|---|---|
| `message:new` | full message object | New message in a joined conversation |
| `message:read:ack` | `{ conversationId, userId, messageId }` | Read receipt broadcast |
| `typing:update` | `{ conversationId, userId, isTyping }` | Typing indicator broadcast |
| `presence:update` | `{ userId, isOnline, lastSeenAt }` | Online/offline status |

---

## 6. Media

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/media/presign` | Required | Get a presigned upload URL + asset ID |
| GET | `/media/:id/status` | Required | Poll processing status (`PENDING`/`PROCESSING`/`READY`/`FAILED`) |

**POST `/media/presign`**
```json
// Request
{ "type": "IMAGE", "contentType": "image/jpeg", "sizeBytes": 2048000 }

// 200 Response
{
  "mediaId": "media-uuid",
  "uploadUrl": "https://r2.../presigned...",
  "expiresIn": 300
}
```
Client `PUT`s raw bytes to `uploadUrl` directly, then references `mediaId` in
the subsequent `POST /posts` or `POST /stories` call.

---

## 7. Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Required | Paginated notifications |
| POST | `/notifications/:id/read` | Required | Mark one as read |
| POST | `/notifications/read-all` | Required | Mark all as read |
| GET | `/notifications/unread-count` | Required | Badge count |

Delivered in realtime via the `/notifications` Socket.io namespace
(`notification:new` event) in addition to the REST list above.

---

## 8. Search

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search?q=&type=` | Required | Unified search; `type` ∈ `users,posts,hashtags` |
| GET | `/search/hashtags/:tag` | Public | Posts under a hashtag |

MVP search is backed by PostgreSQL full-text search (`tsvector` columns on
`Profile.username/displayName` and `Post.caption`); migrating to OpenSearch
is a Phase 2 item once query volume/relevance demands it.

---

## 9. Trust & Safety

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reports` | Required | Report a post, comment, user, message, or story |
| GET | `/admin/reports` | Admin | Reports queue, filterable by status/type |
| POST | `/admin/reports/:id/action` | Admin | Take a moderation action on a report |

**POST `/reports`**
```json
{ "targetType": "POST", "targetId": "post-uuid", "reason": "Spam or scam content" }
```

---

## 10. Standard Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body failed schema validation |
| `UNAUTHENTICATED` | 401 | Missing/invalid/expired access token |
| `INVALID_CREDENTIALS` | 401 | Login failed |
| `FORBIDDEN` | 403 | Authenticated but not permitted (e.g. private account, not owner) |
| `ACCOUNT_SUSPENDED` | 403 | Account in suspended/banned state |
| `NOT_FOUND` | 404 | Resource doesn't exist or is hidden by visibility/block rules |
| `CONFLICT` | 409 | e.g. username already taken |
| `TOO_MANY_ATTEMPTS` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unhandled server error (logged, not exposed in detail to client) |
