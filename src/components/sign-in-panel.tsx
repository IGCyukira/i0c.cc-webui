'use client';

import { signIn } from "next-auth/react";

export function SignInPanel() {
  return (
    <div className="mx-auto mt-24 max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow">
      <h1 className="text-2xl font-semibold text-slate-900">登录 i0c.cc 配置控制台</h1>
      <p className="mt-3 text-sm text-slate-600">
        通过 GitHub OAuth 登录后即可修改 data 分支中的 redirects.json，并支持版本回滚。
      </p>
      <button
        type="button"
        onClick={() => signIn("github")}
        className="mt-6 w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        使用 GitHub 登录
      </button>
    </div>
  );
}
