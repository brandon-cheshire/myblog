import { tsrClient } from '../../api/tsrClient'
import type { Post } from '../../api/tsrClient'
import { usePostsContext } from '../context/PostsContext'

export function usePosts() {
  const { allPostsRefreshKey } = usePostsContext()

  const query = tsrClient.posts.getPosts.useQuery({
    queryKey: ['posts', allPostsRefreshKey],
    queryData: {},
  })

  return {
    posts: (query.data?.body ?? []) as Post[],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    fetchPosts: query.refetch,
  }
}
