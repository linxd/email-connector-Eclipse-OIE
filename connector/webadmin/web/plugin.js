// 邮件读取器源连接器（POP3 和 IMAP）- Web 管理器设置面板。
// 引擎托管的插件作为单个 blob 模块加载，因此仅有裸 @oie/*
// 导入（通过页面的 import map 解析）可用。表单
// 构建块来自 @oie/web-ui；React 来自平台对象。
import {
  ConnectorForm,
  PollSection,
  YES_NO,
  asBool,
  requireFields,
  defaultSourceProperties,
  defaultPollProperties
} from "@oie/web-ui";

const PROPERTIES_CLASS = "com.mirth.connect.connectors.email.shared.EmailReceiverProperties";
const CONNECTOR_NAME = "邮件读取器";

const isImap = (p) => p.mailProtocol === "IMAP";

// 995/110 (POP3) 和 993/143 (IMAP) 根据协议和 SSL 选择而定；自定义端口保持不变。
const DEFAULT_PORTS = { POP3: { true: "995", false: "110" }, IMAP: { true: "993", false: "143" } };
const isDefaultPort = (port) => ["110", "143", "993", "995"].includes(String(port ?? "").trim());
function syncPort(properties) {
  if (isDefaultPort(properties.port)) {
    properties.port = DEFAULT_PORTS[isImap(properties) ? "IMAP" : "POP3"][String(asBool(properties.useSsl))];
  }
}

export function createEmailReader(platform) {
  return {
    defaults(version) {
      return {
        "@class": PROPERTIES_CLASS,
        "@version": version,
        pluginProperties: null,
        // 引擎默认的 5 秒对邮箱来说太频繁了。
        pollConnectorProperties: { ...defaultPollProperties(version), pollingFrequency: 60000 },
        sourceConnectorProperties: defaultSourceProperties(version),
        mailProtocol: "POP3",
        host: "",
        port: "995",
        useSsl: true,
        username: "",
        password: "",
        deleteAfterFetch: false,
        folder: "INBOX",
        unreadOnly: true,
        markAsRead: true
      };
    },

    component({ properties, onChange }) {
      // platform.React 由外壳在启动时设置，因此在渲染时读取。
      const React = platform.React;
      return React.createElement(
        "div",
        null,
        React.createElement(PollSection, { properties, onChange }),
        React.createElement(ConnectorForm, {
          properties,
          onChange,
          fields: [
            { section: "邮件服务器设置" },
            {
              key: "mailProtocol",
              label: "协议",
              type: "select",
              width: "110px",
              options: ["POP3", "IMAP"],
              refresh: true,
              onSet: syncPort,
              tooltip: "POP3 下载邮箱中的所有邮件。IMAP 可以读取单个文件夹并跟踪已读邮件。"
            },
            { key: "host", label: "主机", type: "text", width: "220px", tooltip: "邮件服务器的主机名，例如 pop.provider.com 或 imap.provider.com" },
            { key: "port", label: "端口", type: "number", width: "90px", tooltip: "POP3：995 (SSL) 或 110。IMAP：993 (SSL) 或 143。" },
            { key: "useSsl", label: "使用 SSL", type: "radio", options: YES_NO, onSet: syncPort, tooltip: "POP3S / IMAPS（加密连接）" },
            { key: "username", label: "用户名", type: "text", width: "220px" },
            { key: "password", label: "密码", type: "password", width: "220px" },
            { key: "folder", label: "文件夹", type: "text", width: "220px", visible: isImap, tooltip: "要读取的 IMAP 文件夹，例如 INBOX" },
            {
              key: "unreadOnly",
              label: "仅未读",
              type: "radio",
              options: YES_NO,
              visible: isImap,
              tooltip: "仅获取未标记为已读的邮件。选择"否"时，每次轮询都会重新发送文件夹中的每封邮件（除非已被删除）。"
            },
            {
              key: "markAsRead",
              label: "标记为已读",
              type: "radio",
              options: YES_NO,
              visible: (p) => isImap(p) && !asBool(p.deleteAfterFetch),
              tooltip: "邮件传递给通道后标记为已读。与"仅未读"配合使用，确保每封邮件只被获取一次。"
            },
            {
              key: "deleteAfterFetch",
              label: "获取后删除",
              type: "radio",
              options: YES_NO,
              refresh: true,
              tooltip: "邮件传递给通道后从服务器删除。POP3：选择"否"时，每次轮询都会重新发送邮箱中的每封邮件。"
            }
          ]
        })
      );
    },

    // 对应 Swing 面板 (EmailReader.checkProperties)。
    validate(properties) {
      const errors = requireFields(properties, [
        { key: "host", label: "主机" },
        { key: "port", label: "端口" },
        { key: "username", label: "用户名" },
        { key: "folder", label: "文件夹", when: isImap }
      ]);
      const port = Number(String(properties.port ?? "").trim());
      if (!errors.some((e) => e.key === "port") && !(Number.isInteger(port) && port >= 1 && port <= 65535)) {
        errors.push({ key: "port", label: "端口 (1-65535)" });
      }
      return errors;
    }
  };
}

export function register(platform) {
  platform.registerConnectorPanel(CONNECTOR_NAME, "SOURCE", createEmailReader(platform));
}
