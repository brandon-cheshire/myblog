import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './auth/context/AuthContext.tsx';
import { ThemeProvider } from './common/context/ThemeContext.tsx';
import { PostsProvider } from './posts/context/PostsContext.tsx';
import { tsrClient } from './api/tsrClient';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <tsrClient.ReactQueryProvider>
        <Router>
          <ThemeProvider>
            <AuthProvider>
              <PostsProvider>
                <App />
              </PostsProvider>
            </AuthProvider>
          </ThemeProvider>
        </Router>
      </tsrClient.ReactQueryProvider>
    </QueryClientProvider>
  </StrictMode>
);
