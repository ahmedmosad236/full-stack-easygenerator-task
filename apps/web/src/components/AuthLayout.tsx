import React from 'react';

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps): React.ReactElement {
  return (
    <div className="page-shell">
      <main className="auth-card">
        <header className="auth-header">
          <div className="brand-badge" aria-hidden="true">
            EG
          </div>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
        </header>
        <section className="auth-content">{children}</section>
        {footer && <footer className="auth-footer">{footer}</footer>}
      </main>
    </div>
  );
}
