import {IChangedTiddlers} from "tiddlywiki"
import {widget as Widget} from "$:/core/modules/widgets/widget.js"
import getQiniuToken from "./getQiniuToken.js";

const configkeys = ["accessKey", "secretkey", "bucketName", "targetPath", "region"] as const

class QiniuUploadWidget extends Widget {
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }
  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const containerElement = $tw.utils.domMaker("div", {});
    containerElement.innerHTML = '<svg class="icon tc-image-save-button-dynamic tc-image-button" viewBox="0 0 1532 1024" xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M0 0h28c15 4 30 11 40 23a929 929 0 0 0 314 237l-18-152c34-4 70 12 82 46 16 48 27 98 41 147a926 926 0 0 0 978-277c10-13 24-20 39-24h28a820 820 0 0 1-988 506l85 306c5 32 27 63 62 65 58 2 116 0 174 1 29 2 59-13 69-41 19-56 29-115 51-170 28-63 96-104 165-98-11 99-23 197-36 296-11 78-71 155-154 159H612c-93-5-153-96-158-182l-48-389A811 811 0 0 1 0 0z"/></svg>'
    containerElement.addEventListener("click", upload)
    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(parent.appendChild(containerElement))
  }
}

class QiniuConfigWidget extends Widget {
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }
  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const containerElement = createForm();
    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(parent.appendChild(containerElement))
  }
}

function createForm() {
  const qiniuConfig = (() => {
    const qiniuConfigJSON = localStorage.getItem("qiniu_config")
    if(!qiniuConfigJSON) return {}
    return JSON.parse(qiniuConfigJSON)
  })();
  const formItems = configkeys.map((key, keyIndex) => {
    const formValue = (() => {
      if(key === "region") {
        const optionsMap = {
          "华东-浙江": "http://up-z0.qiniup.com",
          "华东-浙江2": "http://up-cn-east-2.qiniup.com",
          "华北-河北": "http://up-z1.qiniup.com",
          "华南-广东": "http://up-z2.qiniup.com",
          "北美-洛杉矶": "http://up-na0.qiniup.com",
          "亚太-新加坡": "http://up-as0.qiniup.com",
          "亚太-河内": "http://up-ap-southeast-2.qiniup.com",
          "亚太-胡志明": "http://up-ap-southeast-3.qiniup.com"
        } as const
        const options = Object.keys(optionsMap).map((keyItem) => $tw.utils.domMaker("option", {
          attributes: Object.assign({value: optionsMap[keyItem as keyof typeof optionsMap]}, qiniuConfig[key] === optionsMap[keyItem as keyof typeof optionsMap] ? {selected: true} : {}),
          text: keyItem
        }))
        return $tw.utils.domMaker("select", {children: options})
      }
      return $tw.utils.domMaker("input", {attributes: {type: ["bucketName", "targetPath"].includes(key) ? "text" : "password", value: qiniuConfig[key] || ""}})
    })();
    return $tw.utils.domMaker("p", {
      attributes: {id: `qiniu_upload_${key}`},
      children: [$tw.utils.domMaker("div", {text: `${["🔑", "🔑", "🏆", "🎲", "👑"][keyIndex]} ${key}: `}), formValue]
    })
  })

  const saveButton = $tw.utils.domMaker("button", {text: "保存"})
  saveButton.onclick = () => {
    const value = configkeys.reduce((value, key) => {
      const dom = document.querySelector(`#qiniu_upload_${key}`)
      const input = dom?.querySelector("input")
      const select = dom?.querySelector("select")
      return Object.assign(value, {[key]: input?.value || select?.value || ""})
    }, {})
    localStorage.setItem("qiniu_config", JSON.stringify(value))
    notifier("''🎉 设置成功 🎉 ''")
  }
  return $tw.utils.domMaker("div", {children: [...formItems, saveButton]})
}

async function upload() {
  const pages = $tw.wiki.renderTiddler("text/plain","$:/plugins/tiddlywiki/tiddlyweb/save/offline")
  const blob = new Blob([pages], { type: 'text/html' });
  const file = new File([blob], "index.html", { type: 'text/html' });
  const qiniuConfigJSON = localStorage.getItem("qiniu_config")
  if(!qiniuConfigJSON) {
    navigateTiddler("$:/plugins/oxjmo/qiniuUpload")
    return notifier("''🔔 先配置七牛云 🔔''")
  }
  const qiniuConfig = JSON.parse(qiniuConfigJSON) as {[key in typeof configkeys[number]]: string}
  if(configkeys.some((key) => !qiniuConfig[key])) {
    navigateTiddler("$:/plugins/oxjmo/qiniuUpload")
    return notifier("''🔔 全部配置都不能为空 🔔''");
  }
  const {accessKey, secretkey, region} = qiniuConfig
  const bucketName = qiniuConfig.bucketName
  const targetPath = qiniuConfig.targetPath
  const token = getQiniuToken({accessKey, secretkey, scope: `${bucketName}:${targetPath}`})
  const formData = new FormData();
  formData.append("file", file)
  formData.append("key", targetPath)
  formData.append("token", token)
  formData.append("options.force", "true")
  try {
    await fileUpload(region, formData)
    await new Promise(resolve => setTimeout(resolve, 1000))
    notifier(`''🎉 上传成功 🎉'' 文件大小：${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }catch(error: any){
    if(error instanceof Error) {
      notifier(`''🔔 上传失败 🔔''  错误信息：${error.message}`)
    }
    if("status" in error) {
      notifier(`''🔔 上传失败 🔔''  错误码：${error.status}`)
    }
    notifier(`''🔔 上传失败 🔔'''  未知错误`)
  }
}

async function fileUpload(url: string, formData: FormData) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.upload.onprogress = function(event) {
      if(!event.lengthComputable) return
      const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
      notifier(`上传进度：${percentComplete}%`)
    }
    xhr.onload = async function() {
      if (xhr.status === 200) {
        resolve(true)
      } else {
        reject({status: xhr.status})
      }
    }
    xhr.send(formData);
  })
}

async function notifier(message: string) {
  const tiddler = $tw.wiki.getTiddler("$:/language/Buttons/Upload/notifier")!
  $tw.wiki.addTiddler(new $tw.Tiddler(tiddler, {text: message}))
  $tw.notifier.display("$:/language/Buttons/Upload/notifier")
}

async function navigateTiddler(title: string) {
  const story = new $tw.Story()
  story.navigateTiddler(title)
}

declare let exports: {
  QiniuUploadWidget: typeof QiniuUploadWidget
  QiniuConfigWidget: typeof QiniuConfigWidget
};

exports.QiniuUploadWidget = QiniuUploadWidget
exports.QiniuConfigWidget = QiniuConfigWidget