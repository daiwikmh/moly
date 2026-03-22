import { readFileSync } from 'fs';
import { join } from 'path';
import Link from 'next/link';

export const metadata = {
  title: 'Moly Skill - Lido Agent Guide',
  description: 'Mental model and operational guidelines for AI agents using Moly to interact with Lido',
};

export default function SkillPage() {
  const skillPath = join(process.cwd(), '..', '..', 'skill.md');
  const content = readFileSync(skillPath, 'utf-8');

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Moly
          </Link>
        </div>

        <article className="prose prose-invert dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return (
                  <h1 key={i} className="text-3xl font-bold mt-8 mb-4">
                    {line.replace('# ', '')}
                  </h1>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h2 key={i} className="text-2xl font-bold mt-6 mb-3">
                    {line.replace('## ', '')}
                  </h2>
                );
              }
              if (line.startsWith('### ')) {
                return (
                  <h3 key={i} className="text-xl font-bold mt-4 mb-2">
                    {line.replace('### ', '')}
                  </h3>
                );
              }
              if (line.startsWith('| ')) {
                return (
                  <div key={i} className="my-4 overflow-x-auto">
                    <table className="border-collapse border border-zinc-300 dark:border-zinc-700 w-full text-sm">
                      <tbody>
                        <tr className="bg-zinc-100 dark:bg-zinc-800">
                          {line
                            .split('|')
                            .slice(1, -1)
                            .map((cell, j) => (
                              <td key={j} className="border border-zinc-300 dark:border-zinc-700 p-2 font-semibold">
                                {cell.trim()}
                              </td>
                            ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (line.startsWith('```')) {
                return null;
              }
              if (line.startsWith('---')) {
                return <hr key={i} className="my-6 border-zinc-300 dark:border-zinc-700" />;
              }
              if (line.startsWith('- ')) {
                return (
                  <div key={i} className="ml-4 my-1">
                    • {line.slice(2)}
                  </div>
                );
              }
              if (line.trim() === '') {
                return <div key={i} className="h-2" />;
              }
              return (
                <div key={i} className="my-2">
                  {line}
                </div>
              );
            })}
          </div>
        </article>

        <div className="mt-12 p-4 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <strong>Raw markdown:</strong> <code className="bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded">/api/skill</code>
          </p>
        </div>
      </div>
    </div>
  );
}
