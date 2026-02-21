import { type ReactNode, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Banner } from './Banner';

interface MainLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const mainContentRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    // Reset scroll position when route changes
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div className="dashboard-layout">
      <Banner />

      {/* Scrollable Main Content */}
      <main ref={mainContentRef} className="main-content">
        {(title || subtitle) && (
          <div className="content-header">
            {title && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
}
