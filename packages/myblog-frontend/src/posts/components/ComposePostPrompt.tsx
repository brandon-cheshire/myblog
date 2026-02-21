import { useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { usePostsContext } from '../context/PostsContext';
import { ComposePost } from './ComposePost';
import './ComposePostPrompt.css';

export function ComposePostPrompt() {
  const { user } = useAuth();
  const { refreshAllPosts, refreshUserPosts } = usePostsContext();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handlePromptClick = () => {
    setIsOverlayOpen(true);
    setHasUnsavedChanges(false);
  };

  const handleCloseOverlay = (force?: boolean) => {
    if (!force && hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close? Your changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    setIsOverlayOpen(false);
    setHasUnsavedChanges(false);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Close overlay if clicking on the backdrop
    if (e.target === e.currentTarget) {
      handleCloseOverlay();
    }
  };

  const handleUnsavedChangesChange = (hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  };

  const handlePostSaved = (force?: boolean) => {
    handleCloseOverlay(force ?? true);
    // Refresh all posts (home page) and user posts (profile page)
    refreshAllPosts();
    if (user?.id) {
      refreshUserPosts(user.id);
    }
  };

  return (
    <>
      <div className="compose-post-prompt" onClick={handlePromptClick}>
        <div className="prompt-profile-picture">
          {user?.profilePicture ? (
            <img
              src={`/uploads/profile-pictures/${user.profilePicture}`}
              alt={`${user.name}'s profile`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML =
                    '<div class="profile-placeholder">👤</div>';
                }
              }}
            />
          ) : (
            <div className="profile-placeholder">👤</div>
          )}
        </div>
        <input
          type="text"
          className="prompt-input"
          placeholder="What do you want to write about?"
          readOnly
        />
      </div>

      {isOverlayOpen && (
        <div className="compose-overlay" onClick={handleOverlayClick}>
          <div className="compose-overlay-content">
            <div className="compose-overlay-header">
              <h2>Compose Post</h2>
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
                onClose={handlePostSaved}
                onHasUnsavedChanges={handleUnsavedChangesChange}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
