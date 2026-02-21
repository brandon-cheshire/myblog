import { useState } from 'react';
import { tsrClient } from '../../api/tsrClient';
import { usePostsContext } from '../context/PostsContext';

interface UsePostOperationsOptions {
  onPostSaved?: () => void;
}

export function usePostOperations({
  onPostSaved,
}: UsePostOperationsOptions = {}) {
  const { refreshAllPosts } = usePostsContext();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const deleteMutation = tsrClient.posts.deletePost.useMutation({
    onSuccess: () => {
      refreshAllPosts();
    },
  });

  const handleEdit = (postId: string) => {
    setEditingPostId(postId);
    setIsOverlayOpen(true);
    setHasUnsavedChanges(false);
  };

  const handleNewPost = () => {
    setEditingPostId(null);
    setIsOverlayOpen(true);
    setHasUnsavedChanges(false);
  };

  const handleDelete = async (postId: string, onRefresh?: () => void) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ params: { id: postId } });
      onRefresh?.();
    } catch {
      alert('Error deleting post');
    }
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
    setEditingPostId(null);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseOverlay();
    }
  };

  const handleUnsavedChangesChange = (hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  };

  const handlePostSaved = () => {
    setHasUnsavedChanges(false);
    setIsOverlayOpen(false);
    setEditingPostId(null);
    refreshAllPosts();
    onPostSaved?.();
  };

  return {
    isOverlayOpen,
    editingPostId,
    handleEdit,
    handleNewPost,
    handleDelete,
    handleCloseOverlay,
    handleOverlayClick,
    handleUnsavedChangesChange,
    handlePostSaved,
  };
}
