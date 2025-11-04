import axios from "axios";
import YAML from "yaml";

// 统一的中间格式，便于实现 Clash <-> Surge 双向转换
type ProxyCommon = {
  name: string;
  type: "ss" | "vmess" | "trojan";
  server: string;
  port: number;
};

type ShadowsocksExtras = {
  cipher: string;
  password: string;
  udp?: boolean;
  // obfs
  obfs?: "http" | "tls";
  obfsHost?: string;
};

type VmessExtras = {
  uuid: string; // username in Surge
  tls?: boolean;
  serverName?: string; // sni / servername
  skipCertVerify?: boolean;
  network?: "tcp" | "ws"; // 仅支持 ws/tcp
  wsPath?: string;
};

type TrojanExtras = {
  password: string;
  sni?: string;
  skipCertVerify?: boolean;
  network?: "tcp"; // 限制为 tcp（排除 grpc 等）
};

type Proxy =
  | (ProxyCommon & { type: "ss" } & ShadowsocksExtras)
  | (ProxyCommon & { type: "vmess" } & VmessExtras)
  | (ProxyCommon & { type: "trojan" } & TrojanExtras);

export async function convertFromSubscription(
  url: string,
  target: "clash" | "surge"
): Promise<string> {
  let configFile = await fetchConfig(url);
  if (configFile === null) {
    throw new Error("Unable to get config");
  }
  let source = getConfigType(configFile);

  // Clash to Clash
  if (source === "clash" && target === "clash") {
    let config = parseClashConfig(configFile);
    if (config === null) {
      throw new Error("Unable to parse config");
    }
    if (config.proxies === undefined) {
      throw new Error("No proxies in this config");
    }
    return YAML.stringify({ proxies: config.proxies });
  }

  // Surge to Surge
  if (source === "surge" && target === "surge") {
    // 提取 Surge 配置中的 [Proxy] 段落内容，并输出为 External Group 可用的节点列表
    const lines = (configFile as string).split(/\r?\n/);
    let inProxySection = false;
    const proxies: string[] = [];

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (line.startsWith("[")) {
        inProxySection = line === "[Proxy]";
        return;
      }

      if (!inProxySection) return;

      // 跳过空行与注释
      if (line.length === 0) return;
      if (line.startsWith("#") || line.startsWith(";")) return;

      // 保留原始行（去掉首尾空白），便于 Surge 直接识别
      proxies.push(line);
    });

    if (proxies.length === 0) {
      throw new Error("No proxies in this config");
    }
    return proxies.join("\n");
  }

  // Clash to Surge
  if (source === "clash" && target === "surge") {
    let config = parseClashConfig(configFile);
    if (config === null) {
      throw new Error("Unable to parse config");
    }
    if (config.proxies === undefined) {
      throw new Error("No proxies in this config");
    }
    const intermediates: Proxy[] = config.proxies
      .map((p: any) => clashProxyToIntermediate(p))
      .filter((p: Proxy | undefined) => p !== undefined) as Proxy[];

    const surgeLines = intermediates
      .map((obj) => intermediateToSurgeLine(obj))
      .filter((s: string | undefined) => s !== undefined) as string[];
    if (surgeLines.length === 0) {
      throw new Error("No supported proxies after conversion");
    }
    return surgeLines.join("\n");
  }

  // Surge to Clash
  if (source === "surge" && target === "clash") {
    const lines = (configFile as string).split(/\r?\n/);
    let inProxySection = false;
    const proxyLines: string[] = [];

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (line.startsWith("[")) {
        inProxySection = line === "[Proxy]";
        return;
      }
      if (!inProxySection) return;
      if (line.length === 0) return;
      if (line.startsWith("#") || line.startsWith(";")) return;
      proxyLines.push(line);
    });

    if (proxyLines.length === 0) {
      throw new Error("No proxies in this config");
    }

    const intermediates: Proxy[] = proxyLines
      .map((line) => surgeLineToIntermediate(line))
      .filter((p: Proxy | undefined) => p !== undefined) as Proxy[];

    if (intermediates.length === 0) {
      throw new Error("No supported proxies after conversion");
    }

    const clashProxies = intermediates
      .map((obj) => intermediateToClashProxy(obj))
      .filter((o: any | undefined) => o !== undefined);

    return YAML.stringify({ proxies: clashProxies });
  }

  throw new Error("Unsupported conversion combination");
}

async function fetchConfig(url: string): Promise<string | null> {
  const result = await axios({
    url,
    headers: {
      "User-Agent":
        "ClashX Pro/1.72.0.4 (com.west2online.ClashXPro; build:1.72.0.4; macOS 12.0.1) Alamofire/5.4.4",
    },
  });

  return (result.data || null) as string | null;
}

function getConfigType(config: string): "clash" | "surge" {
  if (config.includes("[Proxy Group]")) {
    return "surge";
  }
  return "clash";
}

function parseClashConfig(config: string): { proxies: any[] } | null {
  return YAML.parse(config);
}

function parseSurgeConfig(config: string): { proxies: any[] } | null {
  return YAML.parse(config);
}

// 将 Clash 的 proxy 对象转换为中间格式
function clashProxyToIntermediate(proxy: any): Proxy | undefined {
  if (!proxy || !proxy.type || !proxy.name || !proxy.server || !proxy.port) {
    return undefined;
  }
  if (!["ss", "vmess", "trojan"].includes(proxy.type)) {
    return undefined;
  }

  if (proxy.type === "ss") {
    // 不支持 v2ray-plugin 的 SS
    if (proxy.plugin === "v2ray-plugin") return undefined;
    const base: ProxyCommon = {
      name: proxy.name,
      type: "ss",
      server: String(proxy.server),
      port: Number(proxy.port),
    } as const;
    const extras: ShadowsocksExtras = {
      cipher: proxy.cipher,
      password: proxy.password,
      udp: proxy.udp,
    };
    if (proxy.plugin === "obfs") {
      const mode = proxy?.["plugin-opts"]?.mode;
      const host = proxy?.["plugin-opts"]?.host;
      if (mode === "http" || mode === "tls") {
        extras.obfs = mode;
      }
      if (typeof host === "string" && host.length > 0) {
        extras.obfsHost = host;
      }
    }
    return { ...base, ...extras } as Proxy;
  }

  if (proxy.type === "vmess") {
    // 过滤不支持的 network
    if (["h2", "http", "grpc"].includes(proxy.network)) return undefined;
    const base: ProxyCommon = {
      name: proxy.name,
      type: "vmess",
      server: String(proxy.server),
      port: Number(proxy.port),
    } as const;
    const extras: VmessExtras = {
      uuid: proxy.uuid,
      tls: Boolean(proxy.tls),
      serverName: proxy.servername,
      skipCertVerify: Boolean(proxy["skip-cert-verify"]),
      network: proxy.network === "ws" ? "ws" : "tcp",
      wsPath: proxy["ws-path"],
    };
    return { ...base, ...extras } as Proxy;
  }

  if (proxy.type === "trojan") {
    // 过滤不支持的 network（如 grpc）
    if (proxy.network && proxy.network !== "tcp") return undefined;
    const base: ProxyCommon = {
      name: proxy.name,
      type: "trojan",
      server: String(proxy.server),
      port: Number(proxy.port),
    } as const;
    const extras: TrojanExtras = {
      password: proxy.password,
      sni: proxy.sni,
      skipCertVerify: Boolean(proxy["skip-cert-verify"]),
      network: "tcp",
    };
    return { ...base, ...extras } as Proxy;
  }

  return undefined;
}

// 中间格式 -> Surge 的单行节点定义
function intermediateToSurgeLine(obj: Proxy): string | undefined {
  const common = `${obj.name} = ${obj.type}, ${obj.server}, ${obj.port}`;

  if (obj.type === "ss") {
    let result = `${common}, encrypt-method=${obj.cipher}, password=${obj.password}`;
    if (obj.obfs) {
      result = `${result}, obfs=${obj.obfs}`;
      if (obj.obfsHost) {
        result = `${result}, obfs-host=${obj.obfsHost}`;
      }
    }
    if (typeof obj.udp === "boolean") {
      result = `${result}, udp-relay=${obj.udp}`;
    }
    return result;
  }

  if (obj.type === "vmess") {
    let result = `${common}, username=${obj.uuid}`;
    if (typeof obj.skipCertVerify === "boolean") {
      result = `${result}, skip-cert-verify=${obj.skipCertVerify}`;
    }
    if (obj.serverName) {
      result = `${result}, sni=${obj.serverName}`;
    }
    if (typeof obj.tls === "boolean") {
      result = `${result}, tls=${obj.tls}`;
    }
    if (obj.network === "ws") {
      result = `${result}, ws=true`;
    }
    if (obj.wsPath) {
      result = `${result}, ws-path=${obj.wsPath}`;
    }
    return result;
  }

  if (obj.type === "trojan") {
    let result = `${common}, password=${obj.password}`;
    if (typeof obj.skipCertVerify === "boolean") {
      result = `${result}, skip-cert-verify=${obj.skipCertVerify}`;
    }
    if (obj.sni) {
      result = `${result}, sni=${obj.sni}`;
    }
    return result;
  }

  return undefined;
}

// 解析 Surge 的单行节点为中间格式
function surgeLineToIntermediate(line: string): Proxy | undefined {
  // 形如：Name = type, server, port, k=v, k=v ...
  const eqIndex = line.indexOf("=");
  if (eqIndex === -1) return undefined;
  const name = line.slice(0, eqIndex).trim();
  const rest = line.slice(eqIndex + 1).trim();
  const parts = rest
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 3) return undefined;
  const type = parts[0] as "ss" | "vmess" | "trojan";
  if (!["ss", "vmess", "trojan"].includes(type)) return undefined;
  const server = parts[1];
  const port = Number(parts[2]);
  if (!server || Number.isNaN(port)) return undefined;

  const kv: Record<string, string> = {};
  for (let i = 3; i < parts.length; i++) {
    const p = parts[i];
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    kv[k] = v;
  }

  if (type === "ss") {
    const cipher = kv["encrypt-method"];
    const password = kv["password"];
    if (!cipher || !password) return undefined;
    const obj: Proxy = {
      name,
      type: "ss",
      server,
      port,
      cipher,
      password,
      udp: kv["udp-relay"]
        ? kv["udp-relay"].toLowerCase() === "true"
        : undefined,
      obfs: kv["obfs"] as any,
      obfsHost: kv["obfs-host"],
    };
    return obj;
  }

  if (type === "vmess") {
    const uuid = kv["username"];
    if (!uuid) return undefined;
    const obj: Proxy = {
      name,
      type: "vmess",
      server,
      port,
      uuid,
      tls: kv["tls"] ? kv["tls"].toLowerCase() === "true" : undefined,
      serverName: kv["sni"],
      skipCertVerify: kv["skip-cert-verify"]
        ? kv["skip-cert-verify"].toLowerCase() === "true"
        : undefined,
      network: kv["ws"] && kv["ws"].toLowerCase() === "true" ? "ws" : "tcp",
      wsPath: kv["ws-path"],
    };
    return obj;
  }

  if (type === "trojan") {
    const password = kv["password"];
    if (!password) return undefined;
    const obj: Proxy = {
      name,
      type: "trojan",
      server,
      port,
      password,
      sni: kv["sni"],
      skipCertVerify: kv["skip-cert-verify"]
        ? kv["skip-cert-verify"].toLowerCase() === "true"
        : undefined,
      network: "tcp",
    };
    return obj;
  }

  return undefined;
}

// 中间格式 -> Clash proxy 对象
function intermediateToClashProxy(obj: Proxy): any | undefined {
  if (obj.type === "ss") {
    const clash: any = {
      name: obj.name,
      type: "ss",
      server: obj.server,
      port: obj.port,
      cipher: obj.cipher,
      password: obj.password,
    };
    if (typeof obj.udp === "boolean") {
      clash.udp = obj.udp;
    }
    if (obj.obfs) {
      clash.plugin = "obfs";
      clash["plugin-opts"] = {
        mode: obj.obfs,
        host: obj.obfsHost,
      };
    }
    return clash;
  }

  if (obj.type === "vmess") {
    const clash: any = {
      name: obj.name,
      type: "vmess",
      server: obj.server,
      port: obj.port,
      uuid: obj.uuid,
    };
    if (typeof obj.tls === "boolean") clash.tls = obj.tls;
    if (obj.serverName) clash.servername = obj.serverName;
    if (typeof obj.skipCertVerify === "boolean")
      clash["skip-cert-verify"] = obj.skipCertVerify;
    if (obj.network === "ws") {
      clash.network = "ws";
      if (obj.wsPath) clash["ws-path"] = obj.wsPath;
    }
    return clash;
  }

  if (obj.type === "trojan") {
    const clash: any = {
      name: obj.name,
      type: "trojan",
      server: obj.server,
      port: obj.port,
      password: obj.password,
    };
    if (obj.sni) clash.sni = obj.sni;
    if (typeof obj.skipCertVerify === "boolean")
      clash["skip-cert-verify"] = obj.skipCertVerify;
    return clash;
  }

  return undefined;
}
