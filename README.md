#Simple Proxy


##How to use

- 0) Simple Proxy will not override proxy settings of Firefox 
- 1) Support file extension with alphabet only
  - 1.1) Full compatibility with Auto-proxy Rulelist (branch 1.x)
  - 1.2) Use ".simple" file extension to specify General Purpose Matching Rules (higher priority, since branch 2.x)
    - 1.2.1) Read 8) for more detail
- 2) Server must match the form of server protocol::server adress::server port
  - 2.1) For example, socks::127.0.0.1::1080
  - 2.2) Supported protocol: http, socks, socks4
    - 2.2.1) http support both HTTP and HTTPS protocol
    - 2.2.2) socks support SOCKS V5 protocol
    - 2.2.3) socks4 support SOCKS V4 protocol
- 3) Use remote address http:// or https:// to subscribe proxy list, compatible with base64 encoding
  - 3.1) For example, https://github.com/gfwlist/gfwlist/raw/master/gfwlist.txt
  - 3.2) Subscription(s) will be updated in 4 days
- 4) You can address absolute path using "Browse..." button in about:addons
- 5) You can address relative path using file.txt@profile to access the rulelist in Profile\SimpleProxy\file.txt
  - 5.1) profile stands for Profile\SimpleProxy\
  - 5.2) firefox stands for Mozilla Firefox\browser\SimpleProxy\
  - 5.3) winuser stands for %UserProfile%\SimpleProxy\
- 6) You can modify your rules by click "Edit: Rulelist **"
  - 6.1) You need to click "save" before you close the "editor" if any modification has been done
  - 6.2) Subscription(s) can not be modified
- 7) You can clear the profile which is no longer in use by press "Clear: Profile **"
- 8) For example, target url "http://www.example.com/this/is/an/example.html"
  - 8.1) <<example.com means search example.com in the host "www.example.com" (return true)
  - 8.2) >>an/example means search an/example in the path "/this/is/an/example.html" (return true)
  - 8.3) <>com.this.is means search com.this.is in the whole address (return false)
  - 8.4) The use of * (wildcard) is not supported

==

## 使用说明

- 0） Simple Proxy 不会覆盖 Firefox 本身的代理设置
- 1） 仅支持以字母作为文件后缀
  - 1.1） 完全兼容 Auto-proxy 规则列表 （仅限 1.x 分支）
  - 1.2） 使用文件后缀 ".simple" 来调用General Purpose Matching Rules （优先级更高, 2.x 分支以后）
    - 1.2.1) 详情请阅读 8)
- 2) 服务器必须满足 类型::地址::端口 的格式
  - 2.1) 例如 socks::127.0.0.1::1080
  - 2.2) 支持的协议类型 http, socks, socks4
    - 2.2.1) http 支持 HTTP 及 HTTPS 协议
    - 2.2.2) socks 支持 SOCKS V5 协议
    - 2.2.3) socks4 支持 SOCKS V4 协议
- 3） 可以通过添加 http:// 或 https:// 远程连接来订阅远程规则，支持base64编码的文件
  - 3.1） 例如 https://github.com/gfwlist/gfwlist/raw/master/gfwlist.txt
  - 3.2） 订阅规则每4天自动更新一次
- 4） 可以通过 about:addons 设置界面的 “浏览...” 按钮来指定绝对路径中的文件
- 5） 可以通过 file.txt@profile 这样的格式来访问相对路径 Profile\SimpleProxy\file.txt 中的规则
  - 5.1) profile 代表 Profile\SimpleProxy\
  - 5.2) firefox 代表 Mozilla Firefox\browser\SimpleProxy\
  - 5.3) winuser 代表 %UserProfile%\SimpleProxy\
- 6) 可以通过点击 编辑：规则** 来修改你的规则
  - 6.1) 如果你有修改规则，你需要先点击 保存 按钮，然后再关闭 编辑器 窗口
  - 6.2) 订阅规则无法被修改
- 7） 你可以通过点击 清除：档案** 来清理掉不再使用的档案
- 8） 例如, 目标链接 "http://www.example.com/this/is/an/example.html"
  - 8.1） <<example.com 意味着于主机 "www.example.com" 中搜索 example.com (结果true)
  - 8.2） >>an/example 意味着于地址 "/this/is/an/example.html" 中搜索 an/example (结果true)
  - 8.3） <>com.this.is 意味着于整个网址中搜索 com.this.is (结果false)
  - 8.4） 不支持 * (通用匹配符)
