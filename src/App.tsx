import { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast, { Toaster } from "react-hot-toast";

import { ChevronUpDownIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'


export default function App() {
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState("clash");

  const convertedUrl = `${window.location.origin}/api/convert?url=${encodeURIComponent(
    url
  )}&target=${target}`;

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch (error) {
    // ignore
  }

  const copiedToast = () =>
    toast("已复制", {
      position: "bottom-center",
    });

  const clashConfig = `# Clash 配置格式

proxy-groups:
  - name: UseProvider
    type: select
    use:
      - ${hostname || "provider1"}
    proxies:
      - Proxy
      - DIRECT

proxy-providers:
  ${hostname || "provider1"}:
    type: http
    url: ${convertedUrl}
    interval: 3600
    path: ./${hostname || "provider1"}.yaml
    health-check:
      enable: true
      interval: 600
      # lazy: true
      url: http://www.gstatic.com/generate_204
`;

  const surgeConfig = `# Surge 配置格式

[Proxy Group]
${hostname || "External Group"} = select, policy-path=${convertedUrl}
`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <main className="flex flex-col items-start flex-1 max-w-4xl px-4 py-8 md:py-12">
        <div className="flex flex-col items-start md:items-center md:flex-row">
          <img src="/logo.svg" alt="Logo" className="md:mr-4 h-28" />
          <div>
            <h1 className="text-2xl font-extrabold text-black md:text-5xl">
              Proxy Provider Converter
            </h1>
            <p className="mt-2 md:text-lg text-gray-600">
              一个可以将Clash/Surge订阅转换成Proxy Provider和External
              Group(Surge)的工具
            </p>
          </div>
        </div>
        <div className="mt-12 text-gray-900">
          <h3 className="text-lg md:text-xl font-bold">
            介绍
          </h3>
          <p className="mt-2">
            本工具可以从其他订阅自动获取和更新代理节点，支持将整个订阅拆分成可复用的节点清单、把多个订阅合并到一起统一管理，并让节点来源与规则设置分离——你可以使用他人分享的订阅节点，同时保持自己的规则策略不变。
          </p>
        </div>
        <div className="w-full text-gray-900 mt-14">
          <h3 className="text-lg md:text-xl font-bold">开始使用</h3>
          <div className="flex w-full gap-4 mt-4 flex-col md:flex-row">
            <input
              className="w-full h-full p-4 text-lg bg-white rounded-xl focus:outline-2 focus:outline-offset-2 focus:outline-yellow-500"
              placeholder="粘贴Clash或Surge订阅链接到这里"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div className="relative">
              <select
                className="w-full md:w-max py-3 pl-4 pr-10 text-lg bg-white rounded-xl appearance-none focus:outline-2 focus:outline-offset-2 focus:outline-yellow-500"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="clash">转换到 Clash</option>
                <option value="surge">转换到 Surge</option>
              </select>
              <ChevronUpDownIcon className="absolute h-6 top-3.5 right-3 text-gray-300" />
            </div>
          </div>
        </div>
        {url && (
          <div className="break-all p-3 mt-4 rounded-lg text-gray-100 bg-gray-900 shadow-sm w-full">
            {convertedUrl}
            <CopyToClipboard text={convertedUrl} onCopy={() => copiedToast()}>
              <div className="flex items-center text-sm mt-4 text-gray-400  cursor-pointer  hover:text-gray-300 transition duration-200 select-none">
                <ClipboardDocumentIcon className="h-5 w-5 mr-1 inline-block" />
                点击复制
              </div>
            </CopyToClipboard>
          </div>
        )}
        {url && (
          <div className="w-full p-4 mt-4 text-gray-100 bg-gray-900 rounded-lg hidden md:block">
            {target !== "surge" && (
              <pre className="whitespace-pre-wrap">{clashConfig}</pre>
            )}
            {target === "surge" && <pre>{surgeConfig}</pre>}
            <CopyToClipboard
              text={target === "surge" ? surgeConfig : clashConfig}
              onCopy={() => copiedToast()}
            >
              <div className="flex items-center text-sm mt-4 text-gray-400 cursor-pointer hover:text-gray-300 transition duration-200 select-none">
                <ClipboardDocumentIcon className="h-5 w-5 mr-1 inline-block" />
                点击复制
              </div>
            </CopyToClipboard>
          </div>
        )}
        <div className="w-full text-gray-900 mt-14">
          <h3 className="text-lg md:text-xl font-bold">
            自己部署转换工具
          </h3>
          <p className="mt-2">
            使用工具时，{window.location.origin}
            的拥有者将会有权限查看到你的订阅链接，如果你不想让给他人这种权限，你可以根据下面步骤你可以零成本部署一个属于你的转换工具。
          </p>
          <p className="mt-2">
            前期准备：你需要一个
            <a
              href="https://github.com"
              target="_blank"
              className="text-yellow-600 transition hover:text-yellow-500"
            >
              GitHub
            </a>
            账号
          </p>
          <ul className="mt-1">
            <li>
              1. 打开
              <a
                href="https://github.com/qier222/proxy-provider-converter"
                target="_blank"
                className="text-yellow-600 transition hover:text-yellow-500"
              >
                https://github.com/qier222/proxy-provider-converter
              </a>
            </li>
            <li>2. 点右上角 Fork，把项目复制到你的 GitHub</li>
            <li>
              3. 打开
              <a
                href="https://vercel.com"
                target="_blank"
                className="text-yellow-600 transition hover:text-yellow-500"
              >
                Vercel.com
              </a>
              ，使用GitHub登录。
            </li>
            <li>
              4. 选择 New Project → 找到 proxy-provider-converter → Import → 选择账号 → Deploy
            </li>
            <li>
              5. 等待部署完成后，点 Visit 访问你的专属工具
            </li>
          </ul>
        </div>
      </main>

      <Toaster />
    </div>
  );
}


