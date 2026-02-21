import { usePosts } from '../hooks/usePosts';
import { ComposePostPrompt } from '../components/ComposePostPrompt';
import { ComposePost } from '../components/ComposePost';
import { PostItem } from '../components/PostItem';
import { usePostOperations } from '../hooks/usePostOperations';
import '../components/ComposePostPrompt.css';

export function PostList() {
  const { posts, loading, error, fetchPosts } = usePosts();
  const {
    isOverlayOpen,
    editingPostId,
    handleEdit,
    handleDelete,
    handleCloseOverlay,
    handleOverlayClick,
    handleUnsavedChangesChange,
    handlePostSaved,
  } = usePostOperations({ onPostSaved: fetchPosts });

  const onDelete = (postId: string) => {
    handleDelete(postId, fetchPosts);
  };

  return (
    <div className="card">
      <div className="feed-container">
        <ComposePostPrompt />
        {error && (
          <p style={{ color: 'var(--error-color)' }}>
            Error: {error}
          </p>
        )}
        {!loading && !error && posts.length === 0 && (
          <p style={{ color: 'var(--success-color)', marginTop: '10px' }}>
            No posts in database yet.
          </p>
        )}
      </div>
      {!loading && posts.length > 0 && (
        <div className="posts-feed">
          {[...posts]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(post => (
              <PostItem
                key={post._id}
                post={post}
                onEdit={handleEdit}
                onDelete={onDelete}
                showAuthor={true}
              />
            ))}
        </div>
      )}

      {isOverlayOpen && (
        <div className="compose-overlay" onClick={handleOverlayClick}>
          <div className="compose-overlay-content">
            <div className="compose-overlay-header">
              <h2>Edit Post</h2>
              <button
                className="close-overlay-btn"
                onClick={() => handleCloseOverlay()}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="compose-overlay-body">
              <ComposePost 
                editPostId={editingPostId || undefined}
                onClose={handlePostSaved}
                onHasUnsavedChanges={handleUnsavedChangesChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
