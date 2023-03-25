# ChatGPT page

包含对接 ChatGPT 接口的 NodeJS 服务，以及基于 Vue 的前端交互页面。

## 配置 openAI 密钥

按官方文档注册好账号，并获取到专属的 apiKey 和 organization。

https://platform.openai.com/docs/api-reference/authentication

新建 secret.json 文件到项目根目录，文件内容:

```json
{
  "key": "your apiKey",
  "org": "your organization"
}
```

## 启动服务

启动：

```bash
$ npm i
$ npm start
```

更多启动参数：

port: 服务端口

proxy-port: openAI 接口可能被墙，需要本地搭好代理服务，走代理端口请求 openAI

例子：

```bash
$ npm start -- --proxy-port 8888 --port 9999
```

浏览器打开 `localhost:port` 即可访问页面使用。
