import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import type { Post } from '../../api/tsrClient';

interface PostItemProps {
  post: Post
  onEdit: (postId: string) => void
  onDelete: (postId: string) => void
  showAuthor?: boolean
}

export function PostItem({ post, onEdit, onDelete, showAuthor = true }: PostItemProps) {
  const { user } = useAuth();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isOwnPost = user?.id && post.author?._id && user.id === post.author._id;
  const isDropdownOpen = openDropdownId === post._id;
  const postDate = new Date(post.createdAt).toLocaleString();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId === post._id && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId === post._id) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdownId, post._id]);

  const toggleDropdown = () => {
    setOpenDropdownId(isDropdownOpen ? null : post._id);
  };

  const handleEdit = () => {
    setOpenDropdownId(null);
    onEdit(post._id);
  };

  const handleDelete = () => {
    setOpenDropdownId(null);
    onDelete(post._id);
  };

  return (
    <div className="post-item">
      <div className="post-header">
        <h4>{post.title}</h4>
        {isOwnPost && (
          <div 
            className="post-menu-container"
            ref={dropdownRef}
          >
            <button
              className="post-menu-button"
              onClick={toggleDropdown}
              aria-label="Post options"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="5" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="19" r="1" fill="currentColor" />
              </svg>
            </button>
            {isDropdownOpen && (
              <div className="post-menu-dropdown">
                <button
                  className="post-menu-item"
                  onClick={handleEdit}
                >
                  Edit
                </button>
                <button
                  className="post-menu-item"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="post-meta">
        {showAuthor && post.author?._id ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link 
              to={`/${post.author.username}`}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--border-color)',
                flexShrink: 0,
                boxShadow: '0 2px 4px var(--shadow)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              >
                {post.author?.profilePicture ? (
                  <img
                    src={`/uploads/profile-pictures/${post.author.profilePicture}`}
                    alt={`${post.author.name}'s profile`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div style="width: 100%; height: 100%; background-color: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 1rem;">👤</div>';
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                  }}>
                    👤
                  </div>
                )}
              </div>
              <span style={{ cursor: 'pointer' }}>
                {post.author?.name || 'Unknown'}
              </span>
            </Link>
            <span> • {postDate}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {showAuthor && (
              <>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--border-color)',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px var(--shadow)',
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                  }}>
                    👤
                  </div>
                </div>
                <span>{post.author?.name || 'Unknown'}</span>
              </>
            )}
            <span>{showAuthor ? ' • ' : ''}Posted on: {postDate}</span>
          </div>
        )}
      </p>
      <p className="post-content">{post.content}</p>
    </div>
  );
}
