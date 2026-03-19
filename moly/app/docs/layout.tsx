"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV } from "@/lib/docs-content";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="docs-layout">
      {/* Mobile toggle */}
      {!sidebarOpen && (
        <button className="docs-sidebar-mobile-toggle" onClick={() => setSidebarOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
      )}

      {/* Sidebar */}
      <aside className={`docs-sidebar ${sidebarOpen ? "" : "docs-sidebar-hidden"}`}>
        <div className="docs-sidebar-header">
          <Link href="/" className="docs-logo">
            <span className="docs-logo-icon">M</span>
            <span>Moly Docs</span>
          </Link>
          <button className="docs-sidebar-close" onClick={() => setSidebarOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <nav className="docs-nav">
          {NAV.map((section) => (
            <div key={section.title} className="docs-nav-section">
              <div className="docs-nav-section-title">{section.title}</div>
              {section.pages.map((page) => {
                const href = `/docs${page.slug ? `/${page.slug}` : ""}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={page.slug}
                    href={href}
                    className={`docs-nav-link ${isActive ? "docs-nav-link-active" : ""}`}
                    onClick={() => {
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                  >
                    {page.title}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="docs-sidebar-footer">
          <Link href="/" className="docs-back-link">
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="docs-main">
        {children}
      </main>
    </div>
  );
}
