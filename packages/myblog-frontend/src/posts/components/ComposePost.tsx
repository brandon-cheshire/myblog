import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { FormEvent } from 'react';
import { tsrClient } from '../../api/tsrClient';

interface ComposePostProps {
  onClose?: (force?: boolean) => void;
  onHasUnsavedChanges?: (hasChanges: boolean) => void;
  editPostId?: string;
}

export function ComposePost({
  onClose,
  onHasUnsavedChanges,
  editPostId,
}: ComposePostProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = editPostId || searchParams.get('edit');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [initialTitle, setInitialTitle] = useState('');
  const [initialContent, setInitialContent] = useState('');

  const getPostQuery = tsrClient.posts.getPost.useQuery({
    queryKey: ['post', editId ?? ''],
    queryData: editId
      ? { params: { id: editId } }
      : ({} as { params: { id: string } }),
    enabled: !!editId,
  });

  const createMutation = tsrClient.posts.createPost.useMutation();
  const updateMutation = tsrClient.posts.updatePost.useMutation();

  const editingPost = getPostQuery.data?.body;
  const loading = createMutation.isPending || updateMutation.isPending;
  const error = getPostQuery.error
    ? 'Failed to load post for editing'
    : createMutation.error || updateMutation.error
      ? ((createMutation.error as Error)?.message ??
        (updateMutation.error as Error)?.message ??
        'Failed to save post')
      : null;

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title);
      setContent(editingPost.content);
      setInitialTitle(editingPost.title);
      setInitialContent(editingPost.content);
    } else if (!editId) {
      setTitle('');
      setContent('');
      setInitialTitle('');
      setInitialContent('');
    }
  }, [editId, editingPost]);

  useEffect(() => {
    const hasChanges =
      title.trim() !== initialTitle || content.trim() !== initialContent;
    onHasUnsavedChanges?.(hasChanges);
  }, [title, content, initialTitle, initialContent, onHasUnsavedChanges]);

  useEffect(() => {
    const hasChanges =
      title.trim() !== initialTitle || content.trim() !== initialContent;
    if (hasChanges) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () =>
        window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [title, content, initialTitle, initialContent]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      return;
    }

    const postData = { title: title.trim(), content: content.trim() };

    try {
      if (editingPost) {
        await updateMutation.mutateAsync({
          params: { id: editingPost._id },
          body: postData,
        });
      } else {
        await createMutation.mutateAsync({ body: postData });
      }

      setInitialTitle(postData.title);
      setInitialContent(postData.content);
      onHasUnsavedChanges?.(false);

      if (onClose) {
        onClose(true);
      } else {
        navigate('/profile');
      }
    } catch {
      // Error state from mutation
    }
  };

  return (
    <div className="compose-post">
      <form onSubmit={handleSubmit} className="post-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post content..."
            rows={10}
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button
            type="button"
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                navigate(editingPost ? '/profile' : '/');
              }
            }}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="submit-btn">
            {loading
              ? 'Saving...'
              : editingPost
                ? 'Update Post'
                : 'Publish Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
