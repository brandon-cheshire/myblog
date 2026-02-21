# React coding style guide

## Language

Use TypeScript for all React code. JavaScript is not allowed.

## Frontend organization

Organize the frontend by **domains**: each top-level folder under `src` is a domain (e.g. auth, posts, users). Within a domain, use subfolders such as `components`, `context`, `hooks`, and `pages` as needed.

- **Folders**: kebab-case.
- **Components**: PascalCase, one component per file, file named after the component (e.g. `MainLayout.tsx`, `ComposePost.tsx`).
- **Component-specific assets**: If a component has its own CSS or other assets, put the component in a folder named after it (e.g. `ComposePostPrompt/ComposePostPrompt.tsx` and `ComposePostPrompt.css`).

```md
packages/myblog-frontend/src
├── api
├── auth
│   ├── components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── TwoFactorAuthForm.tsx
│   │   └── TwoFactorSetup.tsx
│   ├── context
│   │   └── AuthContext.tsx
│   └── pages
│       └── AuthSection.tsx
├── common
│   ├── components
│   │   ├── Banner.tsx
│   │   ├── MainLayout.tsx
│   │   └── ScrollToTop.tsx
│   └── context
│       └── ThemeContext.tsx
├── posts
│   ├── components
│   │   ├── ComposePost.tsx
│   │   ├── ComposePostPrompt.tsx
│   │   ├── MyPosts.tsx
│   │   └── PostItem.tsx
│   ├── context
│   │   └── PostsContext.tsx
│   ├── hooks
│   │   ├── usePostOperations.ts
│   │   └── usePosts.ts
│   └── pages
│       └── PostList.tsx
└── users
    └── pages
        ├── Profile.tsx
        └── Settings.tsx
```

## Naming

### Folders

Use kebab-case for folder names.

### Files

- **Hooks**: camelCase, named after the hook (e.g. `usePosts.ts`, `usePostOperations.ts`).
- **Components**: PascalCase, named after the component (e.g. `PostItem.tsx`, `LoginForm.tsx`).

### Function and variable naming

Use prefixes to make intent clear.

**State and props**

- camelCase, descriptive.
- For booleans, use prefixes: `is`, `has`, `should`.

```typescript
const [isOverlayOpen, setIsOverlayOpen] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const { user, loading } = useAuth()
```

**Event handlers**

camelCase, prefixed with `handle` or `on`.

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  // ...
}

const handleEdit = (postId: string) => { /* ... */ }
const handleCloseOverlay = () => { /* ... */ }

// or when passing as props
<PostItem onEdit={handleEdit} onDelete={onDelete} />
```

**Utilities and custom hooks**

camelCase, with prefixes: `get`, `set`, `is`, `has`, `should`, `use`.

```typescript
const getCurrentUserQuery = tsrClient.auth.getCurrentUser.useQuery({ ... })

export function usePosts() { /* ... */ }
export function useAuth() { /* ... */ }
export function useTheme() { /* ... */ }
```

**Context**

- Provider/consumer components: PascalCase, with `Provider` or `Consumer` in the name.
- Use React Context when state is needed across the app and you want to avoid prop drilling. Prefer Context over Redux, Zustand, etc.

```typescript
export function AuthProvider({ children }: { children: ReactNode }) {
  // ...
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

## Imports

- Remove unused imports.
- Separate groups with a blank line.
- Order of groups:
  1. React (e.g. `import { useState } from 'react'`)
  2. Third-party (e.g. `import { useNavigate } from 'react-router-dom'`, `import { tsrClient } from '../../api/tsrClient'` if it’s the shared client)
  3. Application (e.g. `import { usePosts } from '../hooks/usePosts'`, `import { PostItem } from '../components/PostItem'`)

## Styling / CSS conventions

### Naming

(Define CSS class naming and structure here as needed.)
