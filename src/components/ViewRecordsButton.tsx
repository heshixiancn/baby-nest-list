import Link from "next/link";
export function ViewRecordsButton({ type }: { type: string }) { return <Link href={`/care/health?type=${type}`} className="flex h-12 w-[48%] items-center justify-center rounded-full bg-gradient-to-r from-slate-200/90 via-blue-200/90 to-indigo-200/90 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-white/90 transition active:scale-95">查看记录</Link>; }
