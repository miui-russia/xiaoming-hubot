# 小明机器人


使用hubot官方的开源代码+hubot微信

目前只集成了微信

hubot: http://hubot.github.com

generator-hubot: https://github.com/github/generator-hubot

hubot-weixin:https://github.com/KasperDeng/Hubot-WeChat

运行前请自行安装好redis

### 本地运行

    git clone https://github.com/xiaomingplus/xiaoming-hubot.git
    
    cd xiaoming-hubot/
    
    npm i
    
### 配置

Hubot-weixin适配器提供了一个config.yaml文件，用来配置你的适配器，大部分配置项用于启动时登录所用。
众所周知，目前微信网页版的登录是通过扫描二维码的方式。目前这部分工作需要用户手工来做。

- 用chrome或者firefox的调试模式，扫描微信的二维码登录网页版一次。在调试模式下，从webwxinit api 抓取以下数据


	  baseUrl
		cookie
		Uin
		Sid
		Skey
		DeviceId
		imageDir //填写图片存放的地址
	

抓取到的数据填到node_modules/hubot-weixin/config.yaml对应的配置项。
注意： 配置项里面有以下baseUrl的配置。你要根据Hubot登录的最终Url来配置。 因为微信的服务器对登录的微信号有分流。目前主要在wx或wx2上。
https://wx.qq.com/cgi-bin/mmwebwx-bin
https://wx2.qq.com/cgi-bin/mmwebwx-bin

配置好了之后就可以运行了

    bin/hubot -a weixin


输入 `bot help`.可以看到

    bot> bot help
    bot animate me <query> - The same thing as `image me`, except adds [snip]
    bot help - Displays all of the help commands that bot knows about.
    ...



