import Link from "next/link";

interface CareModulePageProps {
  eyebrow: string;
  title: string;
  description: string;
  records: Array<{
    title: string;
    description: string;
    fields: string[];
  }>;
  reminders: string[];
  children?: React.ReactNode;
}

export function CareModulePage({
  eyebrow,
  title,
  description,
  records,
  reminders,
  children
}: CareModulePageProps) {
  return (
    <main className="page-shell space-y-5">
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-sm font-medium text-amber-700">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row">
          <Link className="btn h-10 w-full sm:w-auto" href="/">
            返回照护首页
          </Link>
        </div>
      </section>

      {children}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4 sm:grid-cols-2">
          {records.map((record) => (
            <article key={record.title} className="panel p-4">
              <h2 className="font-semibold text-slate-950">{record.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {record.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {record.fields.map((field) => (
                  <span
                    key={field}
                    className="badge bg-slate-100 text-slate-600"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <aside className="panel p-4">
          <h2 className="font-semibold text-slate-950">提醒规则</h2>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            {reminders.map((reminder) => (
              <li key={reminder} className="rounded-lg bg-slate-50 p-3">
                {reminder}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}
