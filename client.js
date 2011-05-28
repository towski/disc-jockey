(function() {
  var CONFIG, addMessage, exports, first_poll, longPoll, nicks, onConnect, outputUsers, send, showConnect, showLoad, starttime, transmission_errors, updateTitle, updateUptime, updateUsersLink, userJoin, userPart, util, who, ytswf;
  CONFIG = {
    debug: false,
    nick: "#",
    id: null,
    last_message_time: 1,
    focus: true,
    unread: 0
  };
  nicks = [];
  exports = exports ? exports : this;
  Array.prototype.remove = function(from, to) {
    var rest;
    rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
  };
  Date.prototype.toRelativeTime = function(now_threshold) {
    var conversions, delta, key, units, _i, _len;
    delta = new Date() - this;
    now_threshold = parseInt(now_threshold, 10);
    if (isNaN(now_threshold)) {
      now_threshold = 0;
    }
    if (delta <= now_threshold) {
      return 'Just now';
    }
    units = null;
    conversions = {
      millisecond: 1,
      second: 1000,
      minute: 60,
      hour: 60,
      day: 24,
      month: 30,
      year: 12
    };
    for (_i = 0, _len = conversions.length; _i < _len; _i++) {
      key = conversions[_i];
      if (delta < conversions[key]) {
        break;
      } else {
        units = key;
        delta = delta / conversions[key];
      }
    }
    delta = Math.floor(delta);
    if (delta !== 1) {
      units += "s";
    }
    return [delta, units].join(" ");
  };
  Date.fromString = function(str) {
    return new Date(Date.parse(str));
  };
  updateUsersLink = function() {
    var t;
    t = nicks.length.toString() + " user";
    if (nicks.length !== 1) {
      t += "s";
    }
    return $("#usersLink").text(t);
  };
  userJoin = function(joining, timestamp) {
    var nick, _i, _len;
    addMessage(joining, "joined", timestamp, "join");
    for (_i = 0, _len = nicks.length; _i < _len; _i++) {
      nick = nicks[_i];
      if (nick === joining) {
        return;
      }
    }
    nicks.push(joining);
    return updateUsersLink();
  };
  userPart = function(parting, timestamp) {
    var nick, _i, _len;
    addMessage(parting, "left", timestamp, "part");
    for (_i = 0, _len = nicks.length; _i < _len; _i++) {
      nick = nicks[_i];
      if (nick === parting) {
        nicks.splice(_i, 1);
        break;
      }
    }
    return updateUsersLink();
  };
  util = {
    urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,
    toStaticHTML: function(inputHtml) {
      inputHtml = inputHtml.toString();
      return inputHtml.replace(/&/g, "&amp").replace(/</g, "&lt").replace(/>/g, "&gt");
    },
    zeroPad: function(digits, n) {
      n = n.toString();
      while (n.length < digits) {
        n = '0' + n;
      }
      return n;
    },
    timeString: function(date) {
      var hours, minutes;
      minutes = date.getMinutes().toString();
      hours = date.getHours().toString();
      return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
    },
    isBlank: function(text) {
      var blank;
      blank = /^\s*$/;
      return text.match(blank) !== null;
    }
  };
  exports.scrollDown = function() {
    $('#log').scrollTop(1000000);
    return $("#entry").focus();
  };
  addMessage = function(from, text, time, _class) {
    var content, messageElement, nick_re;
    if (text === null) {
      return;
    }
    if (time === null) {
      time = new Date();
    } else if ((time instanceof Date) === false) {
      time = new Date(time);
    }
    messageElement = $(document.createElement("table"));
    messageElement.addClass("message");
    if (_class) {
      messageElement.addClass(_class);
    }
    text = util.toStaticHTML(text);
    nick_re = new RegExp(CONFIG.nick);
    if (nick_re.exec(text)) {
      messageElement.addClass("personal");
    }
    text = text.replace(util.urlRE, '<a target="_blank" href="$&">$&</a>');
    content = "<tr>\n   <td class=\"nick\" title=\"" + (util.timeString(time)) + "\">" + (util.toStaticHTML(from)) + "</td>\n   <td class=\"msg-text\">" + text + "</td>\n</tr>";
    messageElement.html(content);
    $("#log").append(messageElement);
    return scrollDown();
  };
  updateUptime = function() {
    if (starttime) {
      return $("#uptime").text(starttime.toRelativeTime());
    }
  };
  window.media_queue = new MediaQueue;
  transmission_errors = 0;
  first_poll = true;
  longPoll = function(data) {
    var message, song, _i, _len, _ref;
    if (transmission_errors > 2) {
      showConnect();
      return;
    }
    if (data && data.messages) {
      _ref = data.messages;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        message = _ref[_i];
        if (message.timestamp > CONFIG.last_message_time) {
          CONFIG.last_message_time = message.timestamp;
        }
        switch (message.type) {
          case "msg":
            if (!CONFIG.focus) {
              CONFIG.unread++;
            }
            addMessage(message.nick, message.text, message.timestamp);
            break;
          case "join":
            userJoin(message.nick, message.timestamp);
            break;
          case "part":
            userPart(message.nick, message.timestamp);
            break;
          case "youtube":
            addMessage(message.nick, "requested " + message.title, message.timestamp, "join");
            window.media_queue.queueYoutube(message);
            break;
          case "soundcloud":
            addMessage(message.nick, "requested a soundcloud link", message.timestamp, "join");
            window.media_queue.queueSoundCloud(message);
            break;
          case "upload":
            addMessage(message.nick, "uploaded " + message.title, message.timestamp, "join");
            song = window.media_queue.queueMP3(message);
            break;
          case "select":
            addMessage(message.nick, "selected " + message.title, message.timestamp, "join");
            song = window.media_queue.queueMP3(message);
        }
      }
      updateTitle();
      if (first_poll) {
        first_poll = false;
        who();
      }
    }
    return $.ajax({
      cache: false,
      type: "GET",
      url: "/recv",
      dataType: "json",
      data: {
        since: CONFIG.last_message_time,
        id: CONFIG.id
      },
      error: function() {
        addMessage("", "long poll error. trying again...", new Date(), "error");
        transmission_errors += 1;
        return setTimeout(longPoll, 10 * 1000);
      },
      success: function(data) {
        transmission_errors = 0;
        return longPoll(data);
      }
    });
  };
  send = function(msg) {
    var fun;
    if (CONFIG.debug === false) {
      fun = function() {};
      return jQuery.get("/send", {
        id: CONFIG.id,
        text: msg
      }, fun, "json");
    }
  };
  showConnect = function() {
    $("#connect").show();
    return $("#nickInput").focus();
  };
  showLoad = function() {
    $("#connect").hide();
    return $("#toolbar").hide();
  };
  exports.showChat = function(nick) {
    $("#toolbar").show();
    $("#entry").focus();
    $("#entry").show();
    $("#connect").hide();
    return scrollDown();
  };
  updateTitle = function() {
    if (CONFIG.unread) {
      return document.title = "(" + CONFIG.unread.toString() + ") dj the world";
    } else {
      return document.title = "dj the world";
    }
  };
  starttime = null;
  ytswf = null;
  onConnect = function(session) {
    if (session.error) {
      $('toolbar').show();
      return;
    }
    CONFIG.nick = session.nick;
    CONFIG.id = session.id;
    starttime = new Date(session.starttime);
    showChat(CONFIG.nick);
    $(window).bind("blur", function() {
      CONFIG.focus = false;
      return updateTitle();
    });
    return $(window).bind("focus", function() {
      CONFIG.focus = true;
      CONFIG.unread = 0;
      return updateTitle();
    });
  };
  outputUsers = function() {
    var nick_string;
    nick_string = nicks.length > 0 ? nicks.join(", ") : "(none)";
    addMessage("users:", nick_string, new Date(), "notice");
    return false;
  };
  who = function() {
    return jQuery.get("/who", {}, function(data, status) {
      if (status !== "success") {
        return;
      }
      nicks = data.nicks;
      return outputUsers();
    }, "json");
  };
  $(document).ready(function() {
    var ajax_params, atts, params;
    $("#entry").keypress(function(e) {
      var msg;
      if (e.keyCode !== 13) {
        return;
      }
      msg = $("#entry").attr("value").replace("\n", "");
      if (!util.isBlank(msg)) {
        send(msg);
      }
      return $("#entry").attr("value", "");
    });
    $("#usersLink").click(outputUsers);
    $("#connectButton").click(function() {
      var ajax_params, nick;
      showLoad();
      nick = $("#nickInput").attr("value");
      if (nick.length > 50) {
        alert("Nick too long. 50 character max.");
        showConnect();
        return false;
      }
      if (/[^\w_\-^!]/.exec(nick)) {
        alert("Bad character in nick. Can only have letters, numbers, and '_', '-', '^', '!'");
        showConnect();
        return false;
      }
      ajax_params = {
        cache: false,
        type: "GET",
        dataType: "json",
        url: "/join",
        data: {
          nick: nick
        },
        error: function(response) {
          alert(JSON.parse(response.response).error);
          $('#toolbar').show();
          return $('#connect').show();
        },
        success: onConnect
      };
      $.ajax(ajax_params);
      return false;
    });
    $("#youtube_form").submit(function() {
      var ajax_params;
      try {
        ajax_params = {
          cache: false,
          type: "POST",
          dataType: "json",
          url: "/submit_youtube_link",
          data: $("#youtube_form").serialize(),
          success: function() {}
        };
        $.ajax(ajax_params);
      } catch (error) {
        alert(error);
      }
      return false;
    });
    $("#soundcloud_form").submit(function() {
      var ajax_params;
      try {
        ajax_params = {
          cache: false,
          type: "POST",
          dataType: "json",
          url: "/submit_soundcloud_link",
          data: $("#soundcloud_form").serialize(),
          success: function() {}
        };
        $.ajax(ajax_params);
      } catch (error) {
        alert(error);
      }
      return false;
    });
    ajax_params = {
      cache: false,
      type: "get",
      dataType: "json",
      url: "/files",
      success: function(response) {
        var song, songs, _i, _len, _ref, _results;
        songs = response.files.sort(function(obj1, obj2) {
          if (obj1.artist === obj2.artist) {
            if (obj1.album > obj2.album) {
              return 1;
            } else {
              return -1;
            }
          } else if (obj1.artist > obj2.artist) {
            return 1;
          } else {
            return -1;
          }
        });
        _ref = response.files;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          song = _ref[_i];
          _results.push($('#song_selection').append("<option value='" + (escape(song.file)) + "'>" + song.artist + " - " + song.album + " - " + song.title + "</option>"));
        }
        return _results;
      }
    };
    $.ajax(ajax_params);
    $("#submit_song").submit(function() {
      ajax_params = {
        type: "post",
        dataType: "json",
        url: "/submit_file",
        data: $("#submit_song").serialize(),
        success: function(response) {
          return console.log(response);
        }
      };
      return $.ajax(ajax_params);
    });
    params = {
      allowScriptAccess: "always"
    };
    atts = {
      id: "myytplayer"
    };
    swfobject.embedSWF("http://www.youtube.com/apiplayer?enablejsapi=1&version=3", "ytapiplayer", "425", "356", "8", null, null, params, atts);
    if (CONFIG.debug) {
      $("#connect").hide();
      scrollDown();
      return;
    }
    $("#log table").remove();
    longPoll();
    showConnect();
    if (Cookie.get("session_id")) {
      $.ajax({
        type: "get",
        dataType: "json",
        url: "/check_session",
        success: function(response) {
          if (response.success) {
            return showChat();
          }
        }
      });
    }
    $('#youtube_toggle').click();
    return $('#search_youtube_toggle').click();
  });
  $(window).unload(function() {
    return jQuery.get("/part", {
      id: CONFIG.id
    }, (function(data) {}), "json");
  });
}).call(this);
