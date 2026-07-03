"use client";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: Array<{
    label: string;
    value: string;
    options: readonly string[];
    onChange: (value: string) => void;
  }>;
}

export function FilterBar({ search, onSearchChange, filters }: FilterBarProps) {
  return (
    <div className="panel p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
          搜索
          <input
            className="field"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="物品名称 / 品牌型号"
          />
        </label>
        {filters.map((filter) => (
          <label key={filter.label} className="flex flex-col gap-1 text-sm font-medium text-slate-600">
            {filter.label}
            <select
              className="field"
              value={filter.value}
              onChange={(event) => filter.onChange(event.target.value)}
            >
              <option value="">全部</option>
              {filter.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
