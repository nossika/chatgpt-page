# ChatGPT page

包含对接 ChatGPT/DeepSeek 接口的 NodeJS 服务，以及基于 Vue 的前端交互页面。

## 配置模型 API

项目根目录新建 ./secret.json 文件，文件内容:

```json
{
  "apiKey": "sk-xxxxxx", // 注册时获取的 api key
  "whiteList": ["key1", "key2"] // （可选）白名单用户，若开启，C 端页面 url 必须带上 ?key=key1 参数才允许调用接口
}
```

### openai

https://platform.openai.com/docs/api-reference/authentication

### deepseek

https://platform.deepseek.com/api_keys


## 启动服务

启动：

```bash
$ npm i
$ npm start
```

更多启动参数：

port: 服务端口

proxy-port: API 可能被墙，需要本地搭好代理服务，走代理端口请求服务

例子：

```bash
$ npm start -- --port 9999 --proxy-port 8888 
```

浏览器打开 `localhost:port` 即可访问页面使用。
