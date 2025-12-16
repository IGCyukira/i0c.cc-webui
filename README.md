## 项目简介

i0c.cc WebUI 是一个基于 Next.js 14 的管理面板，用于通过 GitHub OAuth 登录后在线编辑 `redirects.json`。保存修改时会调用 GitHub Contents API，对目标仓库的指定分支创建提交并保留历史记录。

## 快速开始

1. 复制示例环境变量：

	```bash
	cp .env.example .env.local
	```

2. 在 GitHub 创建 OAuth App，回调地址填写 `http://localhost:3000/api/auth/callback/github`，然后将 `Client ID`、`Client Secret` 写入 `.env.local` 的 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`。

3. 设置目标仓库信息（默认为 `IGCyukira/i0c.cc` 的 `data` 分支，可根据需要修改以下变量）：

	```dotenv
	GITHUB_REPO_OWNER="IGCyukira"
	GITHUB_REPO_NAME="i0c.cc"
	GITHUB_TARGET_BRANCH="data"
	GITHUB_CONFIG_PATH="redirects.json"
	```

4. 生成 `NEXTAUTH_SECRET`（例如 `openssl rand -base64 32`）并写入 `.env.local`。开发环境可将 `NEXTAUTH_URL` 设为 `http://localhost:3000`。

5. 安装依赖并启动开发服务器：

	```bash
	npm install
	npm run dev
	```

6. 打开 [http://localhost:3000](http://localhost:3000)，使用拥有仓库写入权限的 GitHub 账号登录后即可编辑 `redirects.json`。

## 功能概览

- GitHub OAuth 登录，自动获取访问令牌并保存在会话中。
- 在线编辑、格式化、校验 `redirects.json`（内置同项目的 Schema 校验）。
- 保存时调用 GitHub Contents API，创建带提交说明的 commit。
- 展示最近的提交历史并可跳转到 GitHub 查看详情。

## 注意事项

- OAuth 应用需要 `repo` 权限才能写入私有仓库。
- 若目标仓库为私有，请确认登录账号具备相应写权限。
- 生产环境部署时务必将 `.env.local` 中的凭据配置到对应平台的环境变量管理中。
