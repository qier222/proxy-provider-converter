# Proxy Provider Converter

一个可以将 Clash 订阅转换成 Proxy Provider 和 External Group(Surge) 的工具

[https://proxy-provider-converter.vercel.app](https://proxy-provider-converter.vercel.app)

### 什么是 Proxy Provider 和 External Group？

[Proxy Provider](https://github.com/Dreamacro/clash/wiki/configuration#proxy-providers) 是 Clash 的一项功能，可以让用户从指定路径动态加载代理服务器列表。使用这个功能你可以将 Clash 订阅里面的代理服务器提取出来，放到你喜欢的配置文件里，也可以将多个 Clash 订阅里的代理服务器混合到一个配置文件里。External Group 则是 Proxy Provider 在 Surge 里的叫法，作用是一样的。

### 怎么自己部署转换工具？

你可以根据下面步骤你可以零成本部署一个属于你的转换工具。

前期准备：你需要一个 GitHub 账号

1. 点击右上角的 Fork 按钮
2. 打开 [Vercel.com](https://vercel.com)，使用 GitHub 登录。
3. 选择 New Project，点击 proxy-provider-converter 旁边的 Import 按钮, 点击 PERSONAL ACCOUNT 旁边的 Select，最后点击 Deploy
4. 等待部署完成后点击 Vercel 项目面板上的 Visit 按钮就可以访问你部署的版本了

### 资源

- [Clash Wiki 中的 Proxy Providers 章节](https://github.com/Dreamacro/clash/wiki/configuration#proxy-providers)
- [Surge Policy Group 文档](https://manual.nssurge.com/policy/group.html)
