'use strict';

//todo 自动释放没人使用的房间


var request = require('request');
var fs = require('fs');
var wxApi = require ("../node_modules/hubot-weixin/src/wxApi.coffee");
var WxBot = require ("../node_modules/hubot-weixin/src/wxbot.coffee");
var scuinfoConfig = require('../scuinfo.config.json');

var wxbot = new WxBot();
wxbot.getInit();
wxbot.updateGroupList();
wxbot.updateGroupMemberList();
var groupInfo = wxbot.groupInfo;


console.log(groupInfo);
// 主动推送的群列表
//var pushRoomByName = {
//    "test":{
//        interval:1000*60*10
//    },
//    //"UGLYSHINE13":{
//    //    interval:1000*60*20
//    //}
//};

var pushRoomByName = scuinfoConfig.pushRoomByName;

var pushRoomById = {

};

Object.keys(groupInfo).forEach(function(k,v){
    Object.keys(pushRoomByName).forEach(function(k1){
        if(groupInfo[k]==k1){
            pushRoomById[k]={
                interval:pushRoomByName[k1].interval,
                name:k1
            }
        }
    })

});


var _user = {
    userId:wxbot.myUserName
};

var _queues = {
    'latest':{
        'read':[],
        'unread':[]
    }
};

Object.keys(pushRoomById).forEach(function(k, v) {
    _queues[k]={
        read:[],
        unread:[]
    };
    pushRoomById[k].roomId = k;
});

var isArray = function (o) {
    return Object.prototype.toString.call(o) === '[object Array]';
};
function clone(myObj){
    if(typeof(myObj) != 'object' || isArray(myObj) || myObj == null) return myObj;
    var newObj = new Object();
    for(var i in myObj){
        newObj[i] = clone(myObj[i]);
    }
    return newObj;
}

var getGender = function(gender){
    return (gender==1)?"男":((gender==2)?"女":"未知");
};

var pushQueue = function(origin,data){

    var _unread = origin.unread.concat();
    var _origin = origin.read.concat(_unread);
        if(_unread.length<=100) {

            for (let i = data.length - 1; i >= 0; i--) {

                if (_origin.indexOf(data[i].nickname + "(" + getGender(data[i].gender) + "):" + data[i].content) === -1) {
                    _unread.push(data[i].nickname + "(" + getGender(data[i].gender) + "):" + data[i].content);
                }
            }
            return _unread;
        }else{
            return _unread;
        }
};

var pushToRead = function(queue){
    var _queue = clone(queue);
    if(_queue.unread.length>0) {
        if (_queue.read.length < 100) {
             _queue.read.push(_queue.unread[_queue.unread.length - 1]);
            return _queue.read;

        } else {
            _queue.read.shift();
            _queue.read.push(_queue.unread[_queue.unread.length - 1]);
            return _queue.read;
        }
    }else{
        return _queue.read;
    }

}

var loadData = function(opts,cb){
    request("http://scuinfo.com/api/hot?pageSize="+opts.count,function(err,res,body){

        if(err){
            cb('网络错误');
            console.log(err);
        }else {

            if (res.statusCode == 200) {

                try {
                    var _data = JSON.parse(body);

                } catch (e) {
                    var _data = []
                }

                var data = _data.data;
                if (data.length == 0) {
                    cb('没有获取到数据');
                    return;
                } else {

                    if(opts.room){
                        //console.log('只更新了房间');
                        _queues[opts.room].unread=pushQueue(_queues[opts.room],data);
                        cb(null);
                    }else{
                        Object.keys(_queues).forEach(function(k) {
                            _queues[k].unread=pushQueue(_queues[k],data);
                        });
                        cb(null);
                        return;

                    }


                }
            } else {
                cb('获取scuinfo数据错误');
                return;
            }

        }
    });
};


//主动推送一次消息

var pushMessageOnce = function(room,content){


  if(content){
    wxApi.sendMessage(_user.userId,room.roomId,content,function(e,r){

    });
  }else{

    if(_queues[room.roomId].unread.length==0){
      //没有消息
      wxApi.sendMessage(_user.userId,room.roomId,'当前暂无未读的消息^_^',function(e,r){

      });

    }else{
      _queues[room.roomId].read =  pushToRead(_queues[room.roomId]);
      wxApi.sendMessage(_user.userId,room.roomId,_queues[room.roomId].unread.pop(),function(e,r){

      });

      if(_queues[room.roomId].unread.length == 0){
        loadData({count:20,room:room.roomId},function(e){
          if(e){
            console.log(e);
          }
        });
      }
    }


  }


};

//主动推送注册
var pushMessage = function(room){

   var timerId = setInterval(function(){

        if(_queues[room.roomId].unread.length==0){
        }else{
            _queues[room.roomId].read =  pushToRead(_queues[room.roomId]);

            wxApi.sendMessage(_user.userId,room.roomId,_queues[room.roomId].unread.pop()+"\n"+scuinfoConfig['suffix'],function(e,r){
            });

            if(_queues[room.roomId].unread.length == 0){

                loadData({count:20,room:room.roomId},function(e){
                    if(e){
                        console.log(e);
                    }
                });
            }
        }




    },room.interval);

  return timerId;
};

var updateData = function(opts,cb){

 loadData({count:opts.count},function(e){
     if(e){
       cb(e);
       return;
     }else{

         setTimeout(function(){
             updateData({
                 count:20
             },function(e){

             });
         },1000*60*10);

       cb(null);
       return;
     }
 })

};


var init = function(){
//更新数据
  updateData({
    count:20
  },function(e){
    if(e){
      console.log('初始化失败');
      console.log(e);
    }else{
      console.log('载入数据成功');
      //console.log(_queues);

      Object.keys(pushRoomById).forEach(function(k) {
        pushRoomById[k].timerId=pushMessage(pushRoomById[k]);
      });
      console.log('主动推送注册成功');
      //console.log(pushRoomById);
    }
  });
};

init();




var getScuinfoHot = function(msg){
    var text = msg.message.text?msg.message.text:"";
    var room = msg.envelope.room;
    if(_queues[room]){

        if(_queues[room].unread.length==0){
            msg.send('目前没有未读的scuinfo更新,请稍后再试^_^');
            loadData({count:20,room:room},function(e){
                if(e){
                    console.log(e);
                }
            });
        }else{
           _queues[room].read =  pushToRead(_queues[room]);
            msg.send(_queues[room].unread.pop());
            if(_queues[room].unread.length == 0){

                loadData({count:20,room:room},function(e){
                    if(e){
                        console.log(e);
                    }
                });
            }
        }

    }else{
        _queues[room]={
            read:[],
            unread:_queues['latest'].unread.concat()
        };
        _queues[room].read =  pushToRead(_queues[room]);
        msg.send(_queues[room].unread.pop());

        if(_queues[room].unread.length == 0){

            loadData({count:20,room:room},function(e){
                if(e){
                    console.log(e);
                }
            });
        }
    }

};



var subscribeScuinfo = function(msg){

  var text = msg.message.text?msg.message.text:"";
  var roomId = msg.envelope.room;
  var params = text.split(" ");
  var interval = params[3];
  if(interval){
    if(parseFloat(interval)>0.5){

      if(!groupInfo[roomId]){

        var wxbot1 = new WxBot();
        wxbot1.getInit();
        wxbot1.updateGroupList();
        wxbot1.updateGroupMemberList();
        groupInfo = wxbot1.groupInfo;
      }

      if(groupInfo[roomId]){
        if(pushRoomById[roomId]){
          //更新推送的room
          scuinfoConfig.pushRoomByName[groupInfo[roomId]]={
            interval:interval*1000*60
          };
          pushRoomById[roomId].interval=parseFloat(interval*1000*60);
          clearInterval(pushRoomById[roomId].timerId);
          var timerId = pushMessage(pushRoomById[roomId]);
          pushRoomById[roomId].timerId=timerId;
          fs.writeFileSync('./scuinfo.config.json',JSON.stringify(scuinfoConfig));

          console.log('更新主动推送');
          console.log(pushRoomById);
          pushMessageOnce(pushRoomById[roomId],"["+groupInfo[roomId]+']群订阅信息更改成功!推送间隔为'+interval+"分钟一次,没有更新则不推送.");
          msg.send(_queues[roomId].unread.pop()+'\n'+scuinfoConfig.suffix);
        }else{
          //新建推送的room

          pushRoomById[roomId]={
            interval:parseFloat(interval*1000*60),
            name:groupInfo[roomId],
            roomId:roomId
          };
          var timerId = pushMessage(pushRoomById[roomId]);
          pushRoomById[roomId].timerId=timerId;

          scuinfoConfig.pushRoomByName[groupInfo[roomId]]={
            interval:interval*1000*60
          };

          fs.writeFileSync('./scuinfo.config.json',JSON.stringify(scuinfoConfig));


          if(_queues[roomId]){

            if(_queues[roomId].unread.length==0){
              msg.send('目前没有未读的scuinfo更新,请稍后再试^_^'+'\n'+scuinfoConfig.suffix);
              loadData({count:20,room:roomId},function(e){
                if(e){
                  console.log(e);
                }
              });
            }else{
              _queues[roomId].read =  pushToRead(_queues[roomId]);
              msg.send(_queues[roomId].unread.pop()+'\n'+scuinfoConfig.suffix);
              if(_queues[roomId].unread.length == 0){

                loadData({count:20,room:roomId},function(e){
                  if(e){
                    console.log(e);
                  }
                });
              }
            }

          }else{
            _queues[roomId]={
              read:[],
              unread:_queues['latest'].unread.concat()
            };
            _queues[roomId].read =  pushToRead(_queues[roomId]);
            msg.send(_queues[roomId].unread.pop()+'\n'+scuinfoConfig.suffix);

            if(_queues[roomId].unread.length == 0){

              loadData({count:20,room:roomId},function(e){
                if(e){
                  console.log(e);
                }
              });
            }
          }

          console.log('更新主动推送');
          console.log(pushRoomById);
          pushMessageOnce(pushRoomById[roomId],"["+groupInfo[roomId]+']群订阅scuinfo成功!推送间隔为'+interval+"分钟一次,没有更新则不推送,取消订阅请回复:bot 取消订阅 scuinfo,更新推送间隔请回复:bot 订阅 scuinfo 10");


        }

      }else{
        //不存在该房间

        console.log('不存在该房间');

        msg.send('该群有问题,创建不了主动推送');
      }




    }else{
      console.log('你设定的推送频率太快了');
      msg.send('你设定的推送频率太快了');

    }

  }else{

    console.log('缺少订阅的间隔');
    msg.send('缺少订阅的间隔');

  }

};

var cancelSubscribeScuinfo = function(msg){
  var text = msg.message.text?msg.message.text:"";
  var room = msg.envelope.room;
  //console.log(room);
  if(pushRoomById[room]){
    //存在该订阅
    //console.log(pushRoomById);
    //console.log('取消定时器');
    //console.log(pushRoomById[room].timerId);
    clearInterval(pushRoomById[room].timerId);

    delete(pushRoomById[room].timerId);
    delete scuinfoConfig.pushRoomByName[groupInfo[room]];

    //console.log(pushRoomById);

    //console.log(scuinfoConfig);
    fs.writeFileSync('./scuinfo.config.json',JSON.stringify(scuinfoConfig));

      delete pushRoomById[room];


    msg.send('成功取消订阅 scuinfo 的推送');
  }else{
    //不存在该订阅
    console.log('没有该订阅');
    msg.send('你们群本来就没有订阅');
  }

};


var scuinfoHelp = function(msg){

  msg.send(`目前有3个口令\n
  bot s  (获取一条scuinfo的热门帖子)\n
  bot 订阅 scuinfo 10 (为本群订阅或更新一个间隔10分钟的scuinfo热门帖子推送)\n
  bot 取消订阅 scuinfo (取消订阅scuinfo的热门推送)
  `)
};

module.exports = function(robot) {

  robot.respond(/scuinfo help$/i,function (msg){

    scuinfoHelp(msg);
  });
    robot.respond(/s$|i$|info$|scuinfo$/i, function (msg) {
        getScuinfoHot(msg);
    });

    robot.respond(/订阅 scuinfo.*/i,function (msg){

        subscribeScuinfo(msg);
    });

  robot.respond(/取消订阅 scuinfo.*/i,function (msg){

    cancelSubscribeScuinfo(msg);
  });



};

