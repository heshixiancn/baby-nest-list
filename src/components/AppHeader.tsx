import Link from "next/link";
import Image from "next/image";

const navItems = [
  { href: "/", label: "首页看板" },
  { href: "/shopping-list", label: "采购清单" },
  { href: "/inventory", label: "库存管理" }
];

export function AppHeader() {
  return (
    <header className="border-b border-amber-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-amber-50">
            <Image src="/baby-bottle.png" alt="开心の清单" width={34} height={34} priority />
          </span>
          <span>
            <span className="block text-lg font-semibold text-slate-900">开心の清单</span>
          </span>
        </Link>
        <nav className="flex gap-2 overflow-x-auto">
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
  );
}
