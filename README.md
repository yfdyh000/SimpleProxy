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
  - 8.4) !! add to the head means exception
    - 8.4.1) For example, !!<<example.com means matching example.com, but return to default proxy
  - 8.5) The use of * (wildcard) is not supported
