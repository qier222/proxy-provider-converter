# Proxy Provider Converter

一个把 Clash/Surge 订阅转换成 Proxy Provider（Clash）或 External Group（Surge）的工具。

访问地址：`https://proxy-provider-converter.vercel.app`

## 它能帮你做什么

- **拆分订阅为节点列表**：将整个 Clash 订阅转换为可复用的节点清单，方便在配置文件中引用。
- **合并多个订阅**：汇总多个订阅的节点，实现统一管理。
- **兼容 Clash 与 Surge**：一键生成 Clash 的 Proxy Provider 或 Surge 的 External Group。
- **订阅与规则解耦**：节点来源可使用他人订阅（通过 Provider/External Group 引用），规则策略可在配置中自由编写和维护。

## 快速使用

1. 打开网站：`https://proxy-provider-converter.vercel.app`
2. 粘贴你的 Clash 或 Surge 订阅链接
3. 选择输出类型：Clash Proxy Provider 或 Surge External Group
4. 点击转换，复制结果到你的配置文件中即可

## 自己部署

使用公共站点时，站点拥有者可能看到你的订阅地址；如不希望暴露，可按下列步骤零成本自建你的专属转换工具。

前提：需要一个 GitHub 账号。

1. 点右上角 Fork，把项目复制到你的 GitHub
2. 登录 [Vercel](https://vercel.com) 并关联 GitHub
3. 选择 New Project → 找到 `proxy-provider-converter` → Import → 选择账号 → Deploy
4. 部署完成后，点 Visit 访问你的专属工具
