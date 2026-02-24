import { useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { usePostsContext } from '../context/PostsContext';
import { ComposePost } from './ComposePost';
import { PostItem } from './PostItem';
import { usePostOperations } from '../hooks/usePostOperations';
import { tsrClient } from '../../api/tsrClient';
import type { Post } from '../../api/tsrClient';
import './ComposePostPrompt.css';

interface MyPostsProps {
  userId?: string;
}

export function MyPosts({ userId }: MyPostsProps) {
  const { user: currentUser } = useAuth();
  const { allPostsRefreshKey, getUserPostsRefreshKey } = usePostsContext();

  const targetUserId = userId || currentUser?.id;
  const userPostsRefreshKey = targetUserId
    ? getUserPostsRefreshKey(targetUserId)
    : 0;

  const postsQuery = tsrClient.users.getUserPosts.useQuery({
    queryKey: [
      'user-posts',
      targetUserId ?? '',
      allPostsRefreshKey,
      userPostsRefreshKey,
    ],
    queryData: targetUserId
      ? { params: { userId: targetUserId } }
      : ({} as { params: { userId: string } }),
    enabled: !!targetUserId,
    staleTime: 30_000,
  });

  const [isNewPost, setIsNewPost] = useState(false);

  const {
    isOverlayOpen,
    editingPostId,
    handleEdit,
    handleNewPost: handleNewPostFromHook,
    handleDelete,
    handleCloseOverlay,
    handleUnsavedChangesChange,
    handlePostSaved,
  } = usePostOperations({
    onPostSaved: () => postsQuery.refetch(),
  });

  const posts = (postsQuery.data?.body ?? []) as Post[];
  const loading = postsQuery.isLoading;
  const error = postsQuery.error ? (postsQuery.error as Error).message : null;
  const isOwnProfile = !userId || userId === currentUser?.id;

  const onEdit = (postId: string) => {
    if (postId) {
      setIsNewPost(false);
      handleEdit(postId);
    }
  };

  const onDelete = (postId: string) => {
    handleDelete(postId, () => postsQuery.refetch());
  };

  const handleNewPost = () => {
    setIsNewPost(true);
    handleNewPostFromHook();
  };

  const handleCloseOverlayWithNewPost = () => {
    setIsNewPost(false);
    handleCloseOverlay();
  };

  const handleOverlayClickWithNewPost = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (e.target === e.currentTarget) {
      handleCloseOverlayWithNewPost();
    }
  };

  const handlePostSavedWithNewPost = () => {
    setIsNewPost(false);
    handlePostSaved();
  };

  if (loading) {
    return <div className="loading">Loading posts...</div>;
  }
  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="my-posts">
      {posts.length === 0 ? (
        <div className="empty-state">
          <p>
            {isOwnProfile
              ? "You haven't created any posts yet."
              : "This user hasn't created any posts yet."}
          </p>
          {isOwnProfile && (
            <button onClick={handleNewPost} className="primary-btn">
              Create Your First Post
            </button>
          )}
        </div>
      ) : (
        <div className="posts-feed">
          {posts
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((post) => (
              <PostItem
                key={post._id}
                post={post}
                onEdit={onEdit}
                onDelete={onDelete}
                showAuthor={true}
              />
            ))}
        </div>
      )}

      {isOverlayOpen && (
        <div
          className="compose-overlay"
          onClick={handleOverlayClickWithNewPost}
        >
          <div className="compose-overlay-content">
            <div className="compose-overlay-header">
              <h2>{isNewPost ? 'Compose Post' : 'Edit Post'}</h2>
              <button
                className="close-overlay-btn"
                onClick={handleCloseOverlayWithNewPost}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="compose-overlay-body">
              <ComposePost
                editPostId={editingPostId ?? undefined}
                onClose={handlePostSavedWithNewPost}
                onHasUnsavedChanges={handleUnsavedChangesChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
