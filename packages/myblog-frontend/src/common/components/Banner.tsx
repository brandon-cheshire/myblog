import './Banner.css';
import { useAuth } from '../../auth/context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export function Banner() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(() => {
    // Restore state from localStorage on mount
    const saved = localStorage.getItem('navDropdownOpen');
    return saved === 'true';
  });
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const navDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  // Persist nav dropdown state to localStorage
  useEffect(() => {
    localStorage.setItem('navDropdownOpen', String(isNavDropdownOpen));
  }, [isNavDropdownOpen]);

  // Add/remove class to body when nav dropdown is open
  useEffect(() => {
    if (isNavDropdownOpen) {
      document.body.classList.add('nav-dropdown-open');
    } else {
      document.body.classList.remove('nav-dropdown-open');
    }

    return () => {
      document.body.classList.remove('nav-dropdown-open');
    };
  }, [isNavDropdownOpen]);

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleHamburgerClick = () => {
    setIsNavDropdownOpen(!isNavDropdownOpen);
    setIsProfileDropdownOpen(false);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setIsProfileDropdownOpen(false);
  };

  const handleLogoutClick = async () => {
    await logout();
    setIsProfileDropdownOpen(false);
  };

  const handleLogoClick = () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const isNavLinkActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="site-banner">
      <div className="banner-content">
        <div className="logo-section">
          {user && (
            <div className="nav-dropdown-container" ref={navDropdownRef}>
              <button
                className="hamburger-menu"
                onClick={handleHamburgerClick}
                aria-label="Toggle navigation menu"
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
              {isNavDropdownOpen && (
                <div className="nav-dropdown">
                  <nav className="nav-dropdown-nav">
                    <Link
                      to="/"
                      className={`nav-dropdown-item ${isNavLinkActive('/') ? 'active' : ''}`}
                    >
                      🏠 Home
                    </Link>
                    <Link
                      to={user?.username ? `/${user.username}` : '/profile'}
                      className={`nav-dropdown-item ${isNavLinkActive(user?.username ? `/${user.username}` : '/profile') ? 'active' : ''}`}
                    >
                      👤 My Profile
                    </Link>
                  </nav>
                </div>
              )}
            </div>
          )}
          <div
            className="logo clickable"
            onClick={handleLogoClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleLogoClick();
              }
            }}
          >
            {/* Placeholder for logo - you can replace this with an actual logo image */}
            <span className="logo-icon">📝</span>
          </div>
          <h1 className="site-name">My Blog</h1>
        </div>
        {user && (
          <div className="profile-section" ref={profileDropdownRef}>
            <div
              className="profile-picture clickable"
              onClick={handleProfileClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProfileClick();
                }
              }}
            >
              {user.profilePicture ? (
                <img
                  src={`/uploads/profile-pictures/${user.profilePicture}`}
                  alt="Profile"
                />
              ) : (
                <div className="profile-placeholder">👤</div>
              )}
            </div>
            {isProfileDropdownOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-item dropdown-item-profile">
                  <div className="profile-picture-small">
                    {user.profilePicture ? (
                      <img
                        src={`/uploads/profile-pictures/${user.profilePicture}`}
                        alt="Profile"
                      />
                    ) : (
                      <div className="profile-placeholder-small">👤</div>
                    )}
                  </div>
                  <span className="profile-username">{user.name}</span>
                </div>
                <button className="dropdown-item" onClick={handleSettingsClick}>
                  ⚙️ Settings
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    toggleTheme();
                  }}
                >
                  {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
                <button
                  className="dropdown-item dropdown-item-logout"
                  onClick={handleLogoutClick}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
