import { PAGES, NAV } from "@/lib/docs-content";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  const params: { slug?: string[] }[] = [];
  for (const section of NAV) {
    for (const page of section.pages) {
      if (page.slug === "") {
        params.push({ slug: undefined });
      } else {
        params.push({ slug: page.slug.split("/") });
      }
    }
  }
  return params;
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params;
  const key = slug ? slug.join("/") : "";
  const page = PAGES[key];

  if (!page) notFound();

  // Find prev/next pages
  const allPages = NAV.flatMap((s) => s.pages);
  const idx = allPages.findIndex((p) => p.slug === key);
  const prev = idx > 0 ? allPages[idx - 1] : null;
  const next = idx < allPages.length - 1 ? allPages[idx + 1] : null;

  return (
    <article className="docs-article">
      <header className="docs-article-header">
        <h1 className="docs-article-title">{page.title}</h1>
        <p className="docs-article-desc">{page.description}</p>
      </header>

      <div className="docs-content">
        {page.content}
      </div>

      <footer className="docs-article-footer">
        {prev && (
          <Link href={`/docs${prev.slug ? `/${prev.slug}` : ""}`} className="docs-footer-link docs-footer-prev">
            <span className="docs-footer-label">Previous</span>
            <span className="docs-footer-title">← {prev.title}</span>
          </Link>
        )}
        {next && (
          <Link href={`/docs${next.slug ? `/${next.slug}` : ""}`} className="docs-footer-link docs-footer-next">
            <span className="docs-footer-label">Next</span>
            <span className="docs-footer-title">{next.title} →</span>
          </Link>
        )}
      </footer>
    </article>
  );
}
