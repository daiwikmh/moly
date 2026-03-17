import { NextRequest, NextResponse } from 'next/server';
import { type Mode, type Network } from '@/lib/lido-config';
import { getBalance, getProtocolStats, getProposals } from '@/lib/lido';

function getCtx(req: NextRequest) {
  const mode: Mode = req.nextUrl.searchParams.get('mode') === 'live' ? 'live' : 'simulation';
  const network: Network = req.nextUrl.searchParams.get('network') === 'mainnet' ? 'mainnet' : 'testnet';
  const chainId = req.nextUrl.searchParams.get('chainId') ?? undefined;
  return { mode, network, chainId };
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');
  const address = req.nextUrl.searchParams.get('address') as `0x${string}` | null;
  const ctx = getCtx(req);

  try {
    switch (action) {
      case 'balances': {
        if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
        const data = await getBalance(ctx, address);
        return NextResponse.json(data);
      }
      case 'stats': {
        const data = await getProtocolStats(ctx);
        return NextResponse.json(data);
      }
      case 'proposals': {
        const count = Number(req.nextUrl.searchParams.get('count') ?? 5);
        const data = await getProposals(ctx, count);
        return NextResponse.json(data);
      }
      default:
        return NextResponse.json({ error: 'Unknown action. Use: balances, stats, proposals' }, { status: 400 });
    }
  } catch (err: any) {
    console.error(`[api/lido] ${action} error:`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
