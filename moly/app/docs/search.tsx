"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NAV } from "@/lib/docs-content";

const pages = NAV.flatMap((s) =>
  s.pages.map((p) => ({
    title: p.title,
    path: p.slug === "" ? "/docs" : `/docs/${p.slug}`,
    keywords: `${s.title.toLowerCase()} ${p.title.toLowerCase()}`,
  }))
);

export function Search() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const results =
    query.length > 0
      ? pages.filter(
          (p) =>
            p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.keywords.includes(query.toLowerCase())
        )
      : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div ref={ref} className="docs-search-wrap">
      <button onClick={() => setOpen(true)} className="docs-search-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="docs-search-placeholder">Search...</span>
        <kbd className="docs-search-kbd">Ctrl+K</kbd>
      </button>

      {open && (
        <div className="docs-search-dropdown">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs..."
            className="docs-search-input"
          />
          <div className="docs-search-results">
            {results.length > 0 ? (
              results.map((r) => (
                <button
                  key={r.path}
                  onClick={() => {
                    router.push(r.path);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="docs-search-result"
                >
                  {r.title}
                </button>
              ))
            ) : query.length > 0 ? (
              <div className="docs-search-empty">No results</div>
            ) : (
              pages.map((r) => (
                <button
                  key={r.path}
                  onClick={() => {
                    router.push(r.path);
                    setOpen(false);
                  }}
                  className="docs-search-result"
                >
                  {r.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
