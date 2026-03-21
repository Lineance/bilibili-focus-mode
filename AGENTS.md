# AGENTS.md - Bilibili Focus Mode

## Project Overview

Bilibili Focus Mode is a Chrome extension for intentional time management on Bilibili. Built with React 18 + TypeScript + Vite, using Manifest V3.

## Build Commands

```bash
# Development (with HMR support)
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Run all tests
npm run test

# Run single test file
npm run test -- src/core/services/PermissionService.test.ts

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

## Code Style Guidelines

### TypeScript

- Enable strict mode in `tsconfig.json`
- Use explicit return types for public functions
- Prefer `interface` over `type` for object shapes
- Use `readonly` for immutable arrays/objects
- Avoid `any` - use `unknown` with type guards

### Naming Conventions

- **Files**: PascalCase for components (`BlockOverlay.tsx`), camelCase for utilities (`debtTracker.ts`)
- **Components**: PascalCase (`LimboReview`, `DebtDashboard`)
- **Hooks**: camelCase starting with `use` (`useStorage`, `usePermission`)
- **Services**: PascalCase ending with `Service` (`PermissionService`, `ExpirationService`)
- **Types/Interfaces**: PascalCase (`VideoMetadata`, `CoolingItem`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **CSS**: kebab-case class names (`.block-overlay`, `.purify-hidden`)

### Imports

Order imports in this sequence:

1. React/External libraries
2. Internal core modules (`@core/*`)
3. Hooks (`@hooks/*`)
4. Components (`@components/*`)
5. Utils/Types
6. Styles

```typescript
import { useState, useEffect } from 'react';
import { sendMessage } from 'webext-bridge/content-script';

import { PermissionService } from '@core/services/PermissionService';
import { useStorage } from '@hooks/useStorage';
import { BlockOverlay } from '@components/BlockOverlay';
import type { VideoMetadata } from '@core/types';

import './purify.css';
```

### Error Handling

- Use custom error classes extending `Error`
- Always handle async errors with try/catch
- Log errors with context using `console.error('[ModuleName]', error)`
- Never swallow errors silently

```typescript
class PermissionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

try {
  const result = await service.check(bvid);
} catch (error) {
  console.error('[PermissionService]', error);
  throw new PermissionError('Failed to check permission', 'CHECK_FAILED');
}
```

### State Management

- Use Zustand for global state
- Use `useSyncExternalStore` for reactive storage
- Keep component state minimal
- Prefer computed values over derived state

### Testing

- Unit tests in `src/test/unit/**/*.test.{ts,tsx}`
- Integration tests in `src/test/integration/**/*.test.ts`
- E2E tests in `src/test/e2e/**/*.spec.ts`
- Test pure logic in `core/` layer
- Mock Chrome APIs in tests
- Use descriptive test names: `should calculate debt correctly when watching entertainment`

```typescript
// Example test structure
describe('PermissionService', () => {
  describe('check', () => {
    it('should allow permanent group videos', () => {
      // Arrange
      const service = new PermissionService();
      
      // Act
      const result = service.check('BV1xx', { permanentGroups: [...] });
      
      // Assert
      expect(result.allowed).toBe(true);
    });
  });
});
```

**Test File Organization**:

```
src/test/
├── unit/                    # Unit tests
│   ├── core/
│   │   └── services/        # Service unit tests
│   ├── content/             # Content Script tests
│   ├── background/          # Background tests
│   ├── hooks/               # React hooks tests
│   ├── manager/             # Manager component tests
│   └── popup/               # Popup component tests
├── integration/             # Integration tests
│   └── PermissionFlow.test.ts
└── e2e/                     # E2E tests
    └── video-blocking.spec.ts
```

### Extension-Specific Rules

- Content Scripts: Use `document_start` for CSS injection to prevent flicker
- Background: Keep service worker lightweight, use alarms for scheduling
- Storage: Always use async storage APIs, never sync
- Communication: Use `webext-bridge` for type-safe messaging
- CSP: No inline scripts, no `eval()`, configure `inlineDynamicImports: false`

### File Organization

```
src/
├── background/        # Service Worker (MV3)
├── content/           # Content Scripts
├── manager/           # Options Page (React app)
├── popup/             # Popup (optional)
├── core/              # Pure logic (testable)
│   ├── conditions/    # Permission strategies
│   ├── services/      # Business logic
│   └── types/         # TypeScript definitions
├── hooks/             # Shared React hooks
├── components/        # Shared React components
└── manifest.json      # Extension manifest
```

### Comments

- Use JSDoc for public APIs
- Explain "why", not "what"
- Keep comments up-to-date with code changes

```typescript
/**
 * Calculate fuse code length based on recent application frequency.
 * Increases length to prevent fatigue-based bypass attempts.
 */
function calculateFuseLength(recentApps: number): number {
  // Implementation
}
```

## Extension Loading

1. Run `npm run dev` or `npm run build`
2. Open `chrome://extensions/`
3. Enable Developer mode
4. Load unpacked → Select `dist/` folder
5. HMR auto-refreshes on code changes

## Key Dependencies

- `react` / `react-dom`: UI framework
- `zustand`: State management
- `webext-bridge`: Cross-context messaging
- `@crxjs/vite-plugin`: Build tooling
- `vitest`: Testing framework
- `tailwindcss`: Styling
- `date-fns`: Date utilities

## Notes for AI Agents

- This is a personal productivity tool - prioritize user experience over strict security
- The "soft lock" design is intentional - users can technically bypass, but psychological mechanisms enforce compliance
- Debt system is core to the product - always maintain accurate time tracking
- SPA navigation on Bilibili requires `MutationObserver` for Content Script stability
