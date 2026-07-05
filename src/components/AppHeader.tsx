import Image from "next/image";
import Link from "next/link";

const navItems = [
  { href: "/", label: "首页看板" },
  { href: "/shopping-list", label: "采购清单" }
];

export function AppHeader() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-amber-100/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-amber-50 ring-1 ring-amber-100">
              <Image src="/baby-bottle.png" alt="开心の清单" width={38} height={38} priority />
            </span>
            <span className="block text-xl font-semibold text-slate-900 sm:text-lg">开心の清单</span>
          </Link>

          <nav className="hidden gap-2 overflow-x-auto md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-amber-50 hover:text-amber-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-slate-600 transition active:bg-amber-50 active:text-amber-700"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
