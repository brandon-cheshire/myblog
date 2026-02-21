import { createContext, useContext, useCallback, useState } from 'react'
import type { ReactNode } from 'react'

interface PostsContextType {
  refreshAllPosts: () => void
  refreshUserPosts: (userId?: string) => void
  allPostsRefreshKey: number
  getUserPostsRefreshKey: (userId: string) => number
}

const PostsContext = createContext<PostsContextType | undefined>(undefined)

export function PostsProvider({ children }: { children: ReactNode }) {
  // Use state-based refresh triggers instead of custom events
  const [allPostsRefreshKey, setAllPostsRefreshKey] = useState(0)
  const [userPostsRefreshKeys, setUserPostsRefreshKeys] = useState<Record<string, number>>({})

  const refreshAllPosts = useCallback(() => {
    // Increment the refresh key to trigger re-fetches in all components
    setAllPostsRefreshKey(prev => prev + 1)
  }, [])

  const refreshUserPosts = useCallback((userId?: string) => {
    if (userId) {
      // Increment the refresh key for a specific user
      setUserPostsRefreshKeys(prev => ({
        ...prev,
        [userId]: (prev[userId] || 0) + 1
      }))
    }
    // Also trigger a global refresh
    setAllPostsRefreshKey(prev => prev + 1)
  }, [])

  const getUserPostsRefreshKey = useCallback((userId: string) => {
    return userPostsRefreshKeys[userId] || 0
  }, [userPostsRefreshKeys])

  return (
    <PostsContext.Provider value={{ 
      refreshAllPosts, 
      refreshUserPosts,
      allPostsRefreshKey,
      getUserPostsRefreshKey
    }}>
      {children}
    </PostsContext.Provider>
  )
}

export function usePostsContext() {
  const context = useContext(PostsContext)
  if (context === undefined) {
    throw new Error('usePostsContext must be used within a PostsProvider')
  }
  return context
}
