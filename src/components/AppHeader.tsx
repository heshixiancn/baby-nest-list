"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "照护首页" },
  { href: "/care/feeding", label: "喂养尿布" },
  { href: "/care/health", label: "成长健康" },
  { href: "/care/tasks", label: "提醒待办" },
  { href: "/shopping-list", label: "采购清单" }
];

export function AppHeader() {
  const pathname = usePathname();
  const hideTopHeader = [
    "/care/feeding",
    "/care/diaper",
    "/care/temperature",
    "/care/weight",
    "/care/sleep"
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));

  return (
    <>
      {!hideTopHeader ? (
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/72 backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-6 sm:py-4 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white/70 shadow-sm ring-1 ring-slate-200/60 sm:h-12 sm:w-12">
                <Image
                  src="/baby-bottle.png"
                  alt="开心の成长记录"
                  width={36}
                  height={36}
                  priority
                />
              </span>
              <span className="apple-hello-text block text-[1.5rem] sm:text-2xl">
                开心の成长记录
              </span>
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
      ) : null}
    </>
  );
}
