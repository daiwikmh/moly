"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search } from "./search";

const SIDEBAR: Array<{
  label: string;
  items: Array<{
    title: string;
    href: string;
    children?: Array<{ title: string; href: string }>;
  }>;
}> = [
  {
    label: "Getting Started",
    items: [
      { title: "Overview", href: "/docs" },
      { title: "Installation", href: "/docs/setup" },
      { title: "Configuration", href: "/docs/configuration" },
      { title: "Architecture", href: "/docs/architecture" },
      {
        title: "CLI — npx @moly-mcp/lido",
        href: "/docs/cli",
        children: [
          { title: "Setup Wizard", href: "/docs/cli/setup" },
          { title: "Configuration Reference", href: "/docs/cli/configuration" },
        ],
      },
    ],
  },
  {
    label: "Tools Reference",
    items: [
      {
        title: "All Tools",
        href: "/docs/tools",
        children: [
          { title: "Read Tools", href: "/docs/tools/read" },
          { title: "Write Tools", href: "/docs/tools/write" },
          { title: "Governance", href: "/docs/tools/governance" },
          { title: "Bridge (L2)", href: "/docs/tools/bridge" },
          { title: "Bounds, Alerts & Ledger", href: "/docs/tools/management" },
        ],
      },
    ],
  },
  {
    label: "Guides",
    items: [
      { title: "Stake ETH", href: "/docs/guides/stake-eth" },
      { title: "Wrap & Unwrap", href: "/docs/guides/wrap-unwrap" },
      { title: "Withdrawals", href: "/docs/guides/withdrawals" },
      { title: "Governance Voting", href: "/docs/guides/governance" },
    ],
  },
  {
    label: "MCP Server",
    items: [
      {
        title: "Overview",
        href: "/docs/mcp-server",
        children: [
          { title: "Connect Any Agent", href: "/docs/mcp-server/connect" },
          { title: "Code Samples", href: "/docs/mcp-server/code-samples" },
        ],
      },
    ],
  },
  {
    label: "Reference",
    items: [
      { title: "Supported Chains", href: "/docs/chains" },
      { title: "FAQ", href: "/docs/faq" },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="docs-layout-v2">
      <nav className="docs-topnav">
        <div className="docs-topnav-inner">
          <div className="docs-topnav-left">
            <Link href="/" className="docs-topnav-logo">
              <Image src="/molylogo.png" alt="Moly" width={32} height={32} />
              <span>Moly</span>
            </Link>
            <span className="docs-topnav-sep">/</span>
            <span className="docs-topnav-section">Docs</span>
          </div>
          <div className="docs-topnav-right">
            <Search />
            <a
              href="https://www.npmjs.com/package/@moly-mcp/lido"
              target="_blank"
              rel="noopener noreferrer"
              className="docs-topnav-badge"
            >
              @moly-mcp/lido
            </a>
            <a
              href="https://github.com/daiwikmh/moly"
              target="_blank"
              rel="noopener noreferrer"
              className="docs-topnav-gh"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <div className="docs-body">
        <aside className="docs-sidebar-v2">
          {SIDEBAR.map((section) => (
            <div key={section.label} className="docs-sidebar-section">
              <div className="docs-sidebar-label">{section.label}</div>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className={`docs-sidebar-link ${isActive ? "docs-sidebar-link-active" : ""}`}
                    >
                      {item.title}
                    </Link>
                    {item.children && (
                      <div className="docs-sidebar-children">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`docs-sidebar-child ${pathname === child.href ? "docs-sidebar-child-active" : ""}`}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </aside>

        <main className="docs-main-v2">{children}</main>
      </div>
    </div>
  );
}
