import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { MyPosts } from '../../posts/components/MyPosts';
import { ComposePostPrompt } from '../../posts/components/ComposePostPrompt';
import { tsrClient } from '../../api/tsrClient';
import type { User } from '../../api/tsrClient';

export function Profile() {
  const { identifier } = useParams<{ identifier?: string }>();
  const { user: currentUser } = useAuth();

  const byUsernameQuery = tsrClient.users.getUserByUsername.useQuery({
    queryKey: ['user-by-username', identifier ?? ''],
    queryData: identifier
      ? { params: { username: identifier } }
      : ({} as { params: { username: string } }),
    enabled: !!identifier,
    staleTime: 30_000,
  });

  const profileUser: User | null = identifier
    ? (byUsernameQuery.data?.body ?? null)
    : currentUser;

  const loading = !!identifier && byUsernameQuery.isLoading;
  const error = byUsernameQuery.error
    ? (byUsernameQuery.error as Error).message
    : null;

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }
  if (error) {
    return <div className="error">Error: {error}</div>;
  }
  if (!profileUser) {
    return <div className="error">User not found</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-picture-large">
          {profileUser.profilePicture ? (
            <img
              src={`/uploads/profile-pictures/${profileUser.profilePicture}`}
              alt={`${profileUser.name}'s profile`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML =
                    '<div class="profile-placeholder-large">👤</div>';
                }
              }}
            />
          ) : (
            <div className="profile-placeholder-large">👤</div>
          )}
        </div>
        <h1 className="profile-username">{profileUser.name}</h1>
      </div>
      {currentUser && currentUser.id === profileUser.id && (
        <div style={{ marginBottom: '2rem' }}>
          <ComposePostPrompt />
        </div>
      )}
      <div className="profile-content">
        <MyPosts userId={profileUser.id} />
      </div>
    </div>
  );
}
