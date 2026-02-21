import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthSection } from './auth/pages/AuthSection';
import { useAuth } from './auth/context/AuthContext';
import { PostList } from './posts/pages/PostList';
import { MainLayout } from './common/components/MainLayout';
import { Settings } from './users/pages/Settings';
import { Profile } from './users/pages/Profile';
import { ScrollToTop } from './common/components/ScrollToTop';      

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <ScrollToTop />
      <Routes>
        <Route 
          path="/" 
          element={
            user ? (
              <MainLayout>
                <PostList />
              </MainLayout>
            ) : (
              <AuthSection />
            )
          } 
        />
        <Route 
          path="/profile" 
          element={
            user ? (
              <MainLayout>
                <Profile />
              </MainLayout>
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/settings" 
          element={
            user ? (
              <MainLayout>
                <Settings />
              </MainLayout>
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        {/* Profile route by username - must be last to avoid conflicts */}
        <Route 
          path="/:identifier" 
          element={
            user ? (
              <MainLayout>
                <Profile />
              </MainLayout>
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
      </Routes>
    </div>
  );
}

export default App;