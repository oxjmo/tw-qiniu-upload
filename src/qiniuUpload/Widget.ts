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
    containerElement.innerHTML = '<svg t="1729218583617" class="icon tc-image-save-button-dynamic tc-image-button" viewBox="0 0 1532 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4477" width="200" height="200"><path d="M0.303407 0h28.065186c15.094519 3.792593 29.354667 10.998519 39.215407 23.286519 86.243556 100.200296 194.484148 181.134222 314.481778 236.430222-5.840593-50.669037-12.743111-101.262222-18.280297-152.007111 33.754074-3.489185 70.618074 12.667259 82.223408 46.497185 15.701333 48.165926 26.851556 97.697185 41.111704 146.318222 173.624889 54.46163 363.254519 57.268148 537.941333 5.840593 169.832296-49.379556 324.342519-149.276444 439.789037-283.230815 9.784889-12.212148 23.969185-19.342222 38.987852-23.134815h27.989333c-49.910519 147.683556-149.655704 276.631704-272.914963 371.067259-199.793778 154.055111-472.860444 204.344889-715.207111 135.243852 28.292741 101.869037 56.357926 203.813926 85.257482 305.531259 5.461333 31.706074 27.45837 62.881185 61.819259 65.384297 58.102519 1.972148 116.356741 0.075852 174.459259 0.910222 28.368593 1.744593 59.088593-13.50163 69.025185-41.263408 18.583704-55.978667 28.444444-114.915556 50.744889-169.680592 27.685926-63.563852 96.104296-104.296296 165.281185-98.531556-11.757037 98.910815-23.286519 197.82163-35.877926 296.580741-11.301926 78.051556-71.149037 154.282667-154.510222 158.757926H611.51763c-92.690963-5.082074-152.917333-96.331852-157.847704-182.423704-15.701333-129.554963-31.706074-259.034074-47.786667-388.513185C220.122074 360.978963 68.114963 196.835556 0.303407 0z" p-id="4478"></path></svg>'
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
        const options = [
          {label: "华东-浙江", value: "http://up-z0.qiniup.com"},
          {label: "华东-浙江2", value: "http://up-cn-east-2.qiniup.com"},
          {label: "华北-河北", value: "http://up-z1.qiniup.com"},
          {label: "华南-广东", value: "http://up-z2.qiniup.com"},
          {label: "北美-洛杉矶", value: "http://up-na0.qiniup.com"},
          {label: "亚太-新加坡", value: "http://up-as0.qiniup.com"},
          {label: "亚太-河内", value: "http://up-ap-southeast-2.qiniup.com"},
          {label: "亚太-胡志明", value: "http://up-ap-southeast-3.qiniup.com"},
        ].map(({label, value}) => $tw.utils.domMaker("option", {
          attributes: Object.assign({value}, qiniuConfig[key] === value ? {selected: true} : {}),
          text: label
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
  if(!qiniuConfigJSON) return notifier("''🔔 先配置七牛云 🔔''")
  const qiniuConfig = JSON.parse(qiniuConfigJSON) as {[key in typeof configkeys[number]]: string}
  if(configkeys.some((key) => !qiniuConfig[key])) return notifier("''🔔 全部配置都不能为空 🔔''");
  const {accessKey, secretkey, region} = qiniuConfig
  const bucketName = qiniuConfig.bucketName
  const targetPath = qiniuConfig.targetPath
  const token = getQiniuToken({accessKey, secretkey, scope: `${bucketName}:${targetPath}`})
  const formData = new FormData();
  formData.append("file", file)
  formData.append("key", targetPath)
  formData.append("token", token)
  formData.append("options.force", "true")
  const response = await fetch(region, {method: "post", body: formData})
  if(response.ok) {
    notifier("''🎉 上传成功 🎉 ''")
  }else {
    notifier(`''🔔 上传失败 🔔''\n\n错误码：${response.status}`)
  }
}

async function notifier(message: string) {
  const tiddler = $tw.wiki.getTiddler("$:/language/Buttons/Upload/notifier")!
  $tw.wiki.addTiddler(new $tw.Tiddler(tiddler, {text: message}))
  $tw.notifier.display("$:/language/Buttons/Upload/notifier")
}

declare let exports: {
  QiniuUploadWidget: typeof QiniuUploadWidget
  QiniuConfigWidget: typeof QiniuConfigWidget
};

exports.QiniuUploadWidget = QiniuUploadWidget
exports.QiniuConfigWidget = QiniuConfigWidget