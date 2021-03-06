/*
* @Author: NickHopps
* @Last Modified by:   NickHopps
* @Last Modified time: 2019-01-18 19:39:58
* @Description: 蚂蚁森林操作集
*/

function Ant_forest(automator, unlock, config) {
  const _automator = automator;
  const _unlock = unlock;
  const _config = config;

  let _pre_energy = 0,        // 记录收取前能量值
      _post_energy = 0,       // 记录收取后能量值
      _timestamp = 0,         // 记录获取自身能量倒计时
      _min_count_down = 0,    // 最小可收取倒计时
      _current_time = 0,      // 当前收集次数
      _fisrt_running = true,  // 是否第一次进入蚂蚁森林
      _has_next = true;       // 是否下一次运行

  // 构建下一次运行
  const _generate_next = function() {
    if (_min_count_down && _min_count_down <= _config.max_collect_wait_time) _has_next = true;
    else _has_next = false;
  }

  // 同步获取蚂蚁森林中 toast 内容
  const _get_toast_sync = function(filter, object) {
    filter = (typeof filter == null) ? "" : filter;
    let messages = threads.disposable();
    let result;
    // 在新线程中开启监听
    let thread = threads.start(function(){
      let temp = [];
      let counter = 0;
      // 监控 toast
      events.onToast(function(toast) {
        if (toast.getPackageName().indexOf(filter) >= 0) temp.push(toast.getText());
        if (counter == object.length) messages.setAndNotify(temp);
      });
      // 触发 toast
      object.forEach(function(obj) {
        _automator.clickCenter(obj);
        counter++;
      });
    });
    // 获取结果
    result = messages.blockedGet();
    thread.interrupt();
    return result;
  }

  // 获取自己的能量球中可收取倒计时的最小值
  const _get_min_count_down_own = function() {
    const package_name = "com.eg.android.AlipayGphone";
    const energy_ball = className("Button").descMatches(/\s/).find();
    // 如果存在能量球则通过 toast 记录收取倒计时
    if (energy_ball.length > 0) {
      let temp = [];
      let toasts = _get_toast_sync(package_name, energy_ball);
      toasts.forEach(function(obj) {
        let count_down = obj.match(/\d+/g);
        temp.push(count_down[0] * 60 - (-count_down[1]));
      });
      _min_count_down = Math.min.apply(null, temp);
      _timestamp = new Date();
    } else {
      _min_count_down = null;
      log("无可收取能量");
    }
  }

  // 确定下一次收取倒计时
  const _get_min_count_down = function() {
    let temp = [];
    if (_min_count_down && _timestamp instanceof Date) {
      let interval = (new Date() - _timestamp) / 1000;
      if (interval > 30) temp.push(_min_count_down--);
    }
    if (descEndsWith("’").exists()) {
      descEndsWith("’").untilFind().forEach(function(obj) {
        let count_down = parseInt(obj.desc().match(/\d+/));
        temp.push(count_down);
      });
    }
    if (!_min_count_down && !descEndsWith("’").exists()) {
      _min_count_down = null;
      return;
    }
    _min_count_down = Math.min.apply(null, temp);
  }

  // 显示文字悬浮窗
  const _show_floaty = function(text) {
    let window = floaty.window(
      <card cardBackgroundColor = "#aa000000" cardCornerRadius = "20dp">
        <horizontal w = "250" h = "40" paddingLeft = "15" gravity="center">
          <text id = "log" w = "180" h = "30" textSize = "12dp" textColor = "#ffffff" layout_gravity="center" gravity="left|center"></text>
          <card id = "stop" w = "30" h = "30" cardBackgroundColor = "#fafafa" cardCornerRadius = "15dp" layout_gravity="right|center" paddingRight = "-15">
            <text w = "30" h = "30" textSize = "16dp" textColor = "#000000" layout_gravity="center" gravity="center">×</text>
          </card>
        </horizontal>
      </card>
    );
    window.stop.on("click", () => {
      engines.stopAll();
    });
    setInterval(()=>{
      ui.run(function(){
        window.log.text(text)
      });
    }, 0);
  }

  // 按分钟延时
  const _delay = function(minutes) {
    minutes = (typeof minutes != null) ? minutes : 0;
    for (let i = 0; i < minutes; i++) {
      log("距离下次运行还有 " + (minutes - i) + " 分钟");
      sleep(60000);
    }
  }

  // 进入蚂蚁森林主页
  const _start_app = function() {
    app.startActivity({        
      action: "VIEW",
      data: "alipays://platformapi/startapp?appId=60000002",    
    });
  }

  // 收取能量
  const _collect = function() {
    if (descEndsWith("克").exists()) {
      descEndsWith("克").find().forEach(function(obj) {
        _automator.clickCenter(obj);
        sleep(500);
      });
    }
  }

  // 记录当前能量
  const _get_current_energy = function() {
    if (descEndsWith("背包").exists()) {
      return parseInt(descEndsWith("g").findOne().desc().match(/\d+/));
    }
  }

  // 记录初始能量值
  const _get_pre_energy = function() {
    if (_fisrt_running && _has_next) {
      _pre_energy = _get_current_energy();
      log("当前能量：" + _pre_energy);
    }
  }

  // 记录最终能量值
  const _get_post_energy = function() {
    if (!_fisrt_running && !_has_next) {
      if (descEndsWith("返回").exists()) descEndsWith("返回").findOne().click();
      descEndsWith("背包").waitFor();
      _post_energy = _get_current_energy();
      log("当前能量：" + _post_energy);
      _show_floaty("共收取：" + (_post_energy - _pre_energy) + "g 能量");
    }
    if (descEndsWith("关闭").exists()) descEndsWith("关闭").findOne().click();
    home();
  }

  // 识别可收取标志并收取能量
  const _find_and_collect = function() {
    while (true) {
      var pos = images.findMultiColors(captureScreen(), _config.discern.prime, _config.discern.extra);
      while (pos) {
        _automator.click(pos.x, pos.y + 20);
        descEndsWith("浇水").waitFor();
        _collect();
        _automator.back();
        while(!textContains("好友排行榜").exists()) sleep(1000);
        pos = images.findMultiColors(captureScreen(), _config.discern.prime, _config.discern.extra);
      }
      if (descEndsWith("没有更多了").exists() && descEndsWith("没有更多了").findOne().bounds().centerY() < device.height) break;
      scrollDown();
      sleep(1000);
    }
  }

  // 收取自己的能量
  const _collect_own = function() {
    log("开始收集自己能量");
    if (!textContains("蚂蚁森林").exists()) _start_app();
    descEndsWith("背包").waitFor();
    _get_pre_energy();
    _collect();
    _get_min_count_down_own();
    _fisrt_running = false;
  }

  // 收取好友的能量
  const _collect_friend = function() {
    log("开始收集好友能量");
    descEndsWith("查看更多好友").findOne().click();
    while(!textContains("好友排行榜").exists()) sleep(1000);
    _find_and_collect();
    _get_min_count_down();
    _generate_next();
    _get_post_energy();
  }

  return {
    exec: function() {
      // 开启 toast 监听
      let thread = threads.start(function(){
        events.observeToast();
      });
      while (true) {
        _delay(_min_count_down);
        log("第 " + (_current_time + 1) + " 次运行");
        _unlock.exec();
        _collect_own();
        _collect_friend();
        if (_current_time++ > _config.max_collect_repeat || _has_next == false) break;
      }
      thread.interrupt();
    }
  }
}

module.exports = Ant_forest;
