# tw-qiniu-upload

## 介绍
* 该项目使用[Modern.TiddlyDev](https://github.com/tiddly-gittly/Modern.TiddlyDev)开发
* 该项目为tiddlywiki插件，用于一键七牛云上传 [前往预览](http://cloud.oxjmo.top/wiki/index.html)。
* 使用这个项目，只需要填写完配置项，就可以直接打包上传到七牛云，无需再做其他多余操作。
  * 相当于把七牛云作为服务器了，每次上传会覆盖之前的文件，达到实时更新的效果。
  * 麻烦的是每台电脑都需要配置七牛云配置。

## 准备
* 需要注册一个七牛云账号。
* 新建对象存储，新建空间，需要绑定域名哦。
* 前往密钥管理创建新的密钥。
* 设置域名管理-缓存配置-缓存时间 设置为 5分钟。

## 打包插件
```bash
# 安装依赖
npm i

# 开发调试
npm run dev

# 打开
npm run build
```

## 插件配置介绍
* `accessKey` 密钥管理的 accessKey
* `secretkey` 密钥管理的 secretkey
* `bucketName` 空间名称
* `targetPath` 文件路径例如 test/index.html
* `region` 选择空间