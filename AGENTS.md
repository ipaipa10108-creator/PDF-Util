## 1. Project Overview
- **Tech Stack:** Next.js 15 (App Router), Tailwind CSS, TypeScript, Supabase.
- **Package Manager:** pnpm (Strictly enforce. Do not use npm or yarn).
- **Description:** A high-performance dashboard for financial compound interest calculation.

## 2. Executable Commands
<!-- 把可執行指令放在最前面，Agent 會頻繁調用這些指令來驗證它的代碼變更 -->
- **Install Dependencies:** `pnpm install`
- **Development Server:** `pnpm dev`
- **Build Project:** `pnpm build`
- **Lint / Type Check:** `pnpm lint` && `pnpm tsc --noEmit`
- **Run All Tests:** `pnpm test`
- **Run Single Test File:** `pnpm test <file-path>`

## 3. Project Architecture
<!-- 讓 Agent 迅速掌握目錄職責，避免它在錯誤的地方亂長檔案 -->
- `src/components/ui/` - Shared atomic design components (shadcn/ui).
- `src/app/` - Next.js App Router pages and layouts.
- `src/hooks/` - Reusable custom React hooks.
- `src/lib/` - Third-party SDK initializations (Supabase client, etc.).

## 4. Code Style & Engineering Conventions
<!-- 給出具體範例（Concrete Examples），LLM 對代碼範例的依從度遠高於純文字描述 -->
- Prefer functional components and named exports.
- Do NOT use default exports.
- Type Safety: Enforce strict TypeScript. Never use `any`.
- Example:
```tsx
export interface UserCardProps {
  name: string;
  role: string;
}
export function UserCard({ name, role }: UserCardProps) {
  return <div className="p-4 border">{name} ({role})</div>;
}

```

## 5. Git & Commit Conventions

* Commit message format must follow Conventional Commits: `type(scope): description` (e.g., `feat(ui): add compound interest charts`).

## 6. Explicit Boundaries (三層式約束控制)

* **ALWAYS DO:** Run `pnpm lint` and `pnpm test` before declaring a task complete.
* **ASK FIRST:** Before adding any new third-party npm package, or changing DB schema.
* **NEVER DO:** Never commit hardcoded API keys or secrets. Never refactor files outside the requested scope.
