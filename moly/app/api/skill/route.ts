import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const skillPath = join(process.cwd(), 'public', 'skill.md');
    const content = readFileSync(skillPath, 'utf-8');

    return new Response(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response('Skill document not found', { status: 404 });
  }
}
