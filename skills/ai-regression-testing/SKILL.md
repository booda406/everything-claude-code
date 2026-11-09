---
name: ai-regression-testing
description: Regression testing strategies for AI-assisted development. Sandbox-mode API testing without database dependencies, automated bug-check workflows, and patterns to catch AI blind spots where the same model writes and reviews code.
origin: ECC
---

# AI Regression Testing

Testing patterns specifically designed for AI-assisted development, where the same model writes code and reviews it — creating systematic blind spots that focused automated tests can expose.

## When to Activate

- AI agent (Claude Code, Cursor, Codex) has modified API routes or backend logic
- A bug was found and fixed — need to prevent re-introduction
- Project has a sandbox/mock mode that can be leveraged for DB-free testing
- Running `/bug-check` or similar review commands after code changes
- Multiple code paths exist (sandbox vs production, feature flags, etc.)

## The Core Problem

When an AI writes code and then reviews its own work, it carries the same assumptions into both steps. This creates a predictable failure pattern:

```
AI writes fix → AI reviews fix → AI says "looks correct" → Bug still exists
```

**Illustrative failure sequence:**

```
Fix 1: Added notification_settings to API response
  → Forgot to add it to the SELECT query
  → AI reviewed and missed it (same blind spot)

Fix 2: Added it to SELECT query
  → TypeScript build error (column not in generated types)
  → AI reviewed Fix 1 but didn't catch the SELECT issue

Fix 3: Changed to SELECT *
  → Fixed production path, forgot sandbox path
  → A sandbox-only check still does not exercise the production adapter

Fix 4: A non-empty fixture and explicit contract assertions expose the missing field
```

Treat sandbox/production path inconsistency as a regression risk; its frequency depends on the project and observed failures.

## Sandbox-Mode API Testing

If the project has a sandbox/mock mode, use it for fast, DB-free tests. These tests supplement the project's TDD, integration, E2E, and coverage requirements; they do not replace them.

### Setup (Vitest + Next.js App Router)

```typescript
// vitest.sandbox.config.ts — sandbox tests only
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/sandbox/**/*.test.ts"],
    setupFiles: ["__tests__/setup.sandbox.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

```typescript
// __tests__/setup.sandbox.ts
// Force sandbox mode — no database needed
process.env.SANDBOX_MODE = "true";
process.env.NEXT_PUBLIC_SUPABASE_URL = "";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
```

### Test Helper for Next.js API Routes

```typescript
// __tests__/helpers.ts
import { NextRequest } from "next/server";

export function createTestRequest(
  url: string,
  options?: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    sandboxUserId?: string;
  },
): NextRequest {
  const { method = "GET", body, headers = {}, sandboxUserId } = options || {};
  const fullUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;
  const reqHeaders: Record<string, string> = { ...headers };

  if (sandboxUserId) {
    reqHeaders["x-sandbox-user-id"] = sandboxUserId;
  }

  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: reqHeaders,
  };

  if (body) {
    init.body = JSON.stringify(body);
    reqHeaders["content-type"] = "application/json";
  }

  return new NextRequest(fullUrl, init);
}

export async function parseResponse(response: Response) {
  const json = await response.json();
  return { status: response.status, json };
}
```

### Writing Regression Tests

Prioritize observed failures in the regression layer. New features and other changes still follow the project's test-first workflow and required coverage. For required-field and parity regression cases, seed deterministic, non-empty fixtures and assert the response status before checking its content. Test legitimate empty-query results separately with an expected zero count.

```typescript
// __tests__/sandbox/api/user/profile.test.ts
import { describe, it, expect } from "vitest";
import { createTestRequest, parseResponse } from "../../../helpers";
import { GET } from "@/app/api/user/profile/route";

// Define the contract — what fields MUST be in the response
const REQUIRED_FIELDS = [
  "id",
  "email",
  "full_name",
  "phone",
  "role",
  "created_at",
  "avatar_url",
  "notification_settings",  // ← Added after bug found it missing
];

describe("GET /api/user/profile", () => {
  it("returns all required fields", async () => {
    const req = createTestRequest("/api/user/profile");
    const res = await GET(req);
    const { status, json } = await parseResponse(res);

    expect(status).toBe(200);
    for (const field of REQUIRED_FIELDS) {
      expect(json.data).toHaveProperty(field);
    }
  });

  // Regression test for a required field
  it("notification_settings is not undefined (BUG-R1 regression)", async () => {
    const req = createTestRequest("/api/user/profile");
    const res = await GET(req);
    const { status, json } = await parseResponse(res);

    expect(status).toBe(200);
    expect("notification_settings" in json.data).toBe(true);
    const ns = json.data.notification_settings;
    expect(ns === null || typeof ns === "object").toBe(true);
  });
});
```

### Testing Sandbox and Production-Adapter Contracts

Run the same contract separately against the real sandbox handler and the real production adapter/serializer, with their external dependencies replaced by local fixtures. Do not call a production service or database. Use a separate test project/setup for the production adapter so the global sandbox setup above cannot route both cases through the sandbox branch. If the application cannot inject its data source, isolate that boundary before claiming parity.

The following shared assertion is runnable JavaScript. Expected rows belong to the test fixture, not to the handler response. For this seeded case, an empty response, wrong status, duplicate/missing row, or missing field must fail. This does not prohibit legitimate empty results in a separate empty-query test:

```javascript
// __tests__/contracts/messages.mjs
import assert from "node:assert/strict";

export async function assertMessagesContract(handler, expectedRows) {
  assert.ok(Array.isArray(expectedRows) && expectedRows.length > 0,
    "Seed a non-empty expected fixture");
  const response = await handler(new Request("http://localhost/api/user/messages"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body.data));
  assert.equal(body.data.length, expectedRows.length);
  for (const row of body.data) {
    assert.equal(typeof row.id, "string");
    assert.ok(Object.hasOwn(row, "partner_name"));
    assert.equal(typeof row.partner_name, "string");
    assert.ok(row.partner_name.length > 0);
  }
  assert.deepEqual(
    body.data.map(({ id, partner_name }) => ({ id, partner_name })),
    expectedRows.map(({ id, partner_name }) => ({ id, partner_name })),
  );
}
```

Adapt these factory/fixture imports to the application's actual interfaces; they are illustrative project boundaries, not Next.js or Vitest APIs:

```typescript
import { it } from "vitest";
import { assertMessagesContract } from "../contracts/messages.mjs";
import { createSandboxGET } from "@/app/api/user/messages/sandbox";
import { createProductionGET } from "@/app/api/user/messages/production";
import { createLocalMessagesDb } from "../fixtures/local-messages-db";

const expectedRows = [{ id: "message-001", partner_name: "Example partner" }];

it("sandbox handler satisfies the non-empty contract", async () => {
  const handler = createSandboxGET({ messages: structuredClone(expectedRows) });
  await assertMessagesContract(handler, expectedRows);
});

it("production adapter satisfies the contract with a local data source", async () => {
  const db = createLocalMessagesDb({ rows: [
    { message_id: "message-001", display_name: "Example partner" },
  ] }); // Raw local rows; the production adapter maps them to the API contract.
  const handler = createProductionGET({ db });
  await assertMessagesContract(handler, expectedRows);
});
```

The production fixture must honor the adapter's requested SELECT columns and return query errors when injected. Do not feed the same prebuilt response fake into both cases. Verify that omitting a required column breaks the production-adapter test, and that a query error produces the project's error response rather than an empty successful list. A local fixture checks the exercised mapping and contract; real database permissions, joins, and deployment behavior need separate integration evidence.

## Integrating Tests into Bug-Check Workflow

### Custom Command Definition

```markdown
<!-- .claude/commands/bug-check.md -->
# Bug Check

## Step 1: Automated Tests (mandatory, cannot skip)

Run these commands FIRST before any code review:

    npm run test       # Vitest test suite
    npm run build      # TypeScript type check + build

- If tests fail → report as highest priority bug
- If build fails → report type errors as highest priority
- Only proceed to Step 2 if both pass

## Step 2: Code Review (AI review)

1. Sandbox / production path consistency
2. API response shape matches frontend expectations
3. SELECT clause completeness
4. Error handling with rollback
5. Optimistic update race conditions

## Step 3: For each bug fixed, propose a regression test
```

### The Workflow

```
User: "バグチェックして" (or "/bug-check")
  │
  ├─ Step 1: npm run test
  │   ├─ FAIL → Bug found mechanically (no AI judgment needed)
  │   └─ PASS → Continue
  │
  ├─ Step 2: npm run build
  │   ├─ FAIL → Type error found mechanically
  │   └─ PASS → Continue
  │
  ├─ Step 3: AI code review (with known blind spots in mind)
  │   └─ Findings reported
  │
  └─ Step 4: For each fix, write a regression test
      └─ Next bug-check catches if fix breaks
```

## Common AI Regression Patterns

### Pattern 1: Sandbox/Production Path Mismatch

**Risk**: Multiple branches can drift when only one path is changed.

```typescript
// FAIL: AI adds field to production path only
if (isSandboxMode()) {
  return { data: { id, email, name } };  // Missing new field
}
// Production path
return { data: { id, email, name, notification_settings } };

// PASS: Both paths must return the same shape
if (isSandboxMode()) {
  return { data: { id, email, name, notification_settings: null } };
}
return { data: { id, email, name, notification_settings } };
```

**Test to catch it**: Run the non-empty shared contract above separately against the sandbox handler and production adapter. A sandbox-only test cannot establish the production response contract.

### Pattern 2: SELECT Clause Omission

**Frequency**: Common with Supabase/Prisma when adding new columns

```typescript
// FAIL: New column added to response but not to SELECT
const { data } = await supabase
  .from("users")
  .select("id, email, name")  // notification_settings not here
  .single();

return { data: { ...data, notification_settings: data.notification_settings } };
// → notification_settings is always undefined

// PASS: Select the contract's required fields inside an authenticated handler.
// userId must already be resolved and authorized by the application.
const { data, error } = await supabase
  .from("users")
  .select("id, email, name, notification_settings")
  .eq("id", userId)
  .single();

if (error || !data) {
  // Use the project's error/status mapping; never expose the database error.
  return Response.json({ error: { code: "profile_query_failed" } }, { status: 500 });
}
return Response.json({ data }, { status: 200 });
```

### Pattern 3: Error State Leakage

**Frequency**: Moderate — when adding error handling to existing components

```typescript
// FAIL: Error state set but old data not cleared
catch (err) {
  setError("Failed to load");
  // reservations still shows data from previous tab!
}

// PASS: Clear related state on error
catch (err) {
  setReservations([]);  // Clear stale data
  setError("Failed to load");
}
```

### Pattern 4: Optimistic Update Without Proper Rollback

```typescript
// FAIL: No rollback on failure
const handleRemove = async (id: string) => {
  setItems(prev => prev.filter(i => i.id !== id));
  await fetch(`/api/items/${id}`, { method: "DELETE" });
  // If API fails, item is gone from UI but still in DB
};

// PASS: Capture previous state and rollback on failure
const handleRemove = async (id: string) => {
  const prevItems = [...items];
  setItems(prev => prev.filter(i => i.id !== id));
  try {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("API error");
  } catch {
    setItems(prevItems);  // Rollback
    alert("削除に失敗しました");
  }
};
```

## Strategy: Prioritize the Regression Layer

Add a reproducer before fixing an observed bug, then rerun that same target after the fix. Prioritize API branches, authentication boundaries, and state transitions where failures have occurred. Continue to write test-first coverage for new features and required critical flows even if no bug has been recorded there.

A regression test protects the inputs, paths, and assertions it exercises; it does not prove that a bug can never recur or that untested paths are correct. Record fixture and integration limits alongside the result.

## Quick Reference

| AI Regression Pattern | Test Strategy | Priority |
|---|---|---|
| Sandbox/production mismatch | Run a non-empty contract against both independently exercised paths |  High |
| SELECT clause omission | Assert all required fields in response |  High |
| Error state leakage | Assert state cleanup on error |  Medium |
| Missing rollback | Assert state restored on API failure |  Medium |
| Type cast masking null | Assert field is not undefined |  Medium |

## DO / DON'T

**DO:**
- Write the regression reproducer before the fix, following the project's RED/GREEN requirements
- Test the API response shape, not the implementation
- Run tests as the first step of every bug-check
- Keep tests fast (< 1 second total with sandbox mode)
- Name tests after the bug they prevent (e.g., "BUG-R1 regression")

**DON'T:**
- Treat regression prioritization as permission to skip new-feature TDD or required critical-flow tests
- Trust AI self-review as a substitute for automated tests
- Skip sandbox path testing because "it's just mock data"
- Write integration tests when unit tests suffice
- Treat a coverage percentage alone as regression prevention or use this skill to lower the project's coverage requirements
