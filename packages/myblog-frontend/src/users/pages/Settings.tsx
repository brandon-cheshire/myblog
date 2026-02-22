import { useState, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { TwoFactorSetup } from '../../auth/components/TwoFactorSetup';
import { api, tsrClient } from '../../api/tsrClient';

export function Settings() {
  const { user, refreshUser } = useAuth();
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateUsernameMutation = tsrClient.users.updateUsername.useMutation({
    onSuccess: () => refreshUser(),
  });
  const turnOffTwoFactorMutation = tsrClient.auth.turnOffTwoFactor.useMutation({
    onSuccess: () => refreshUser(),
  });

  if (!user) {
    return null;
  }

  const handleProfilePictureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      await api.uploadProfilePicture(file);
      await refreshUser();
      alert('Profile picture updated successfully!');
    } catch (error) {
      alert('Failed to upload profile picture');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleUsernameUpdate = async () => {
    if (!username.trim()) {
      setUsernameError('Username cannot be empty');
      return;
    }
    setUsernameError(null);
    try {
      await updateUsernameMutation.mutateAsync({
        body: { username: username.trim() },
      });
      alert('Username updated successfully!');
    } catch (err) {
      setUsernameError(
        err instanceof Error ? err.message : 'Failed to update username'
      );
    }
  };

  return (
    <div>
      <h2>Account Settings</h2>
      <p>Manage your account preferences and security settings.</p>

      {/* Profile Picture Section */}
      <div className="settings-card">
        <h3>Profile Picture</h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid var(--border-color)',
            }}
          >
            {user.profilePicture ? (
              <img
                src={`/uploads/profile-pictures/${user.profilePicture}`}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: '2rem',
                }}
              >
                👤
              </div>
            )}
          </div>
          <div>
            <button
              onClick={triggerFileInput}
              disabled={uploading}
              className="edit-btn"
              style={{ marginBottom: '0.5rem' }}
            >
              {uploading ? 'Uploading...' : 'Change Picture'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureUpload}
              style={{ display: 'none' }}
            />
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-tertiary)',
                margin: 0,
              }}
            >
              JPG, PNG or GIF. Max size 5MB.
            </p>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>Account Information</h3>
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Member since:</strong>{' '}
          {user.createdAt
            ? new Date(user.createdAt).toLocaleDateString()
            : 'Not available'}
        </p>
      </div>

      {/* Username Section */}
      <div className="settings-card">
        <h3>Username</h3>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-tertiary)',
            marginBottom: '1rem',
            whiteSpace: 'pre-line',
          }}
        >
          Your username is used in your profile URL (e.g., /your-username).
          {'\n'}
          Must be 3-30 characters, alphanumeric with dots, hyphens, and
          underscores.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError(null);
              }}
              placeholder="Enter username"
              disabled={updateUsernameMutation.isPending}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: `1px solid ${usernameError ? 'var(--error-color)' : 'var(--border-color)'}`,
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
            {usernameError && (
              <p
                style={{
                  color: 'var(--error-color)',
                  fontSize: '0.875rem',
                  margin: '0.25rem 0 0 0',
                }}
              >
                {usernameError}
              </p>
            )}
          </div>
          <button
            onClick={handleUsernameUpdate}
            disabled={
              updateUsernameMutation.isPending ||
              username === (user.username || '')
            }
            className="edit-btn"
            style={{ whiteSpace: 'nowrap' }}
          >
            {updateUsernameMutation.isPending
              ? 'Updating...'
              : 'Update Username'}
          </button>
        </div>
      </div>

      {/* 2FA Status Section */}
      <div className="settings-card">
        <h3>Two-Factor Authentication</h3>
        <p className="settings-status-text">
          Status:{' '}
          {user.isTwoFactorEnabled ? (
            <span className="status-enabled">Enabled</span>
          ) : (
            <span className="status-disabled">Disabled</span>
          )}
        </p>

        {!user.isTwoFactorEnabled ? (
          <button onClick={() => setShowSetup2FA(true)} className="edit-btn">
            Enable 2FA
          </button>
        ) : (
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to disable 2FA?')) {
                try {
                  await turnOffTwoFactorMutation.mutateAsync({ body: {} });
                  alert('2FA has been disabled');
                } catch {
                  alert('Failed to disable 2FA');
                }
              }
            }}
            disabled={turnOffTwoFactorMutation.isPending}
            className="delete-btn"
          >
            Disable 2FA
          </button>
        )}

        {showSetup2FA && (
          <div style={{ marginTop: '15px' }}>
            <TwoFactorSetup
              onComplete={async () => {
                setShowSetup2FA(false);
                await refreshUser();
              }}
              onCancel={() => setShowSetup2FA(false)}
            />
          </div>
        )}
      </div>

      <div className="settings-card">
        <h3>Danger Zone</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Once you delete your account, there is no going back. Please be
          certain.
        </p>
        <button
          className="delete-btn"
          onClick={() => {
            if (
              window.confirm(
                'Are you sure you want to delete your account? This action cannot be undone.'
              )
            ) {
              // TODO: Wire up account deletion API when backend supports it
            }
          }}
          style={{ padding: '0.75rem 1.5rem' }}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
