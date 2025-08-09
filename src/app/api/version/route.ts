import {NextResponse} from 'next/server';
import {getBuildInfo} from "@/app/_lib/version";

export async function GET() {
  const info = await getBuildInfo();
  return NextResponse.json(info);
}
