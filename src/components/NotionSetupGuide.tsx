"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SetupResponse {
  error?: string;
  alreadyConfigured?: boolean;
  databaseIds?: {
    shopping: string;
    purchaseRecords: string;
  };
}

export function NotionSetupGuide() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [parentPage, setParentPage] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [settingUp, setSettingUp] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setSettingUp(true);

    try {
      const response = await fetch("/api/notion/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, parentPage })
      });
      const payload = (await response.json()) as SetupResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Notion 初始化失败。");
      }

      setSuccessMessage(payload.alreadyConfigured ? "Notion 已配置完成。" : "Notion 数据库已创建并写入本地配置。");
      setToken("");
      startTransition(() => router.refresh());
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Notion 初始化失败。");
    } finally {
      setSettingUp(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="panel overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-sm font-medium text-amber-700">首次使用</p>
          <h1 className="mt-2 text-xl font-semibold text-slate-950">连接 Notion 后开始使用开心の清单</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            已检测到当前项目还没有完整的 Notion 数据库配置。完成下面三步后，应用会自动创建需要的数据库并写入本地配置。
          </p>
        </div>

        <div className="grid gap-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <a
              className="btn h-11 w-full"
              href="https://www.notion.so/my-integrations"
              target="_blank"
              rel="noreferrer"
            >
              打开 Notion
            </a>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:col-span-2">
              在 Notion 创建 Internal Integration，复制 token；再新建或选择一个父页面，把该页面分享给这个 Integration。
            </div>
          </div>

          <form className="grid gap-3" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
              Integration Token
              <input
                className="field"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="secret_xxx 或 ntn_xxx"
                type="password"
                autoComplete="off"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
              父页面链接或 ID
              <input
                className="field"
                value={parentPage}
                onChange={(event) => setParentPage(event.target.value)}
                placeholder="https://www.notion.so/..."
                required
              />
            </label>

            {error ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn btn-primary h-11 w-full sm:w-auto" type="submit" disabled={settingUp || isPending}>
                {settingUp ? "正在配置..." : "创建数据库并写入配置"}
              </button>
              <button className="btn h-11 w-full sm:w-auto" type="button" onClick={() => router.refresh()}>
                重新检测
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
