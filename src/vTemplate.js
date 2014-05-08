(function(Global) {
  var randomNum = Math.random().toString(32).slice(2);
  var consts = {
    "stplReg": /\<%(\=)\s*([a-zA-Z_$].*?)\s*\%\>|\<\%(\@)\s*([a-zA-Z_$]\w*?)\(\s*([^\r\n]*?)\s*\)\s*\%\>/gm,
    "word": /((\w+)(?:\.\w+)*)/gm,
    "arrPush": Array.prototype.push,
    "keywords": [
      "alert", "break", "case", "catch", "continue", "debugger", "default", "delete",
      "do", "eval", "else", "finally", "for", "function", "if", "in", "instanceof",
      "new", "return", "switch", "this", "throw", "try", "typeof", "var", "void",
      "while", "with", "Object", "prototype", "Array", "Number", "String", "Boolean",
      "Null", "Undefined", "RegExp", "Function", "window", "console", "arguments",
      "setTimeout", "setInterval", "clearTimeout", "clearInterval"
    ],
    "randomNum": randomNum,
    "vtpl_ret": "vtpl_" + randomNum + "_ret",
    "vtpl_data": "vtpl_" + randomNum + "_data"
  };
  var keyString = {
    "renderPrefix": "that.render=function("+consts.vtpl_data+") {var " + consts.vtpl_ret + "=\"\";",
    "renderPostfix": ";return " + consts.vtpl_ret + "}",
    "retPlus": consts.vtpl_ret + "+=",
    "data_getter": consts.vtpl_data+".",
    "quote": "\'",
    "semicolon": ";",
    "close": "%>",
    "start": "<%",
    "end": "<%/",
    "func": "@",
    "echo": "="
  };
  function vTemplate(tpl) {
    var that = {};
    var info = {
      "tpl": tpl.replace(/(\"|\')/gm, "\\$1").replace(/[\r\n]/gm, "")
    }
    that.compile = function() {
      if(typeof that.render == "function") return;
      var evalString = keyString.renderPrefix + __compile__(info.tpl) + keyString.renderPostfix;
      // generate the render function
      eval(evalString);
    }
    return that
  }
  function __compile__(stpl, config) {
    var stplReg = consts.stplReg, step = null, oldIndex = 0, compiled = "", adding = "";
    stplReg.lastIndex = 0;
    var ignored = config && config.ignored || [];
    consts.arrPush.apply(ignored, consts.keywords);
    var subStpl = "", startFlag = "", endFlag = "", map = null, args = "";
    while(step = stplReg.exec(stpl)) {
      adding = stpl.slice(oldIndex, stplReg.lastIndex - step[0].length);
      compiled += keyString.retPlus+keyString.quote+adding+keyString.quote+keyString.semicolon;
      oldIndex = stplReg.lastIndex;
      if(step[1] == "\=") {
        // restore the function like arr.join("") because that.compile change the join("") to join(\"\")
        step[2]=step[2].replace(/\\\"/gm, "\"");
        var kw = step[2].split(".")[0];
        compiled += keyString.retPlus + (inArray(ignored, kw) ? "" : keyString.data_getter) + step[2] + keyString.semicolon;
      }else if(step[3] == "\@") {
        subStpl = stpl.slice(oldIndex);
        startFlag = keyString.start+keyString.func+step[4];
        endFlag = keyString.end+keyString.func+step[4]+keyString.close;
        // figure out the nex position argument and the sub-template between <@X> and </@X>
        map = checkoutMap(startFlag, endFlag, subStpl);
        if(!map) throw "Something wrong with your template";
        var mapStpl = map[1];
        // find out the helpers arguments
        if(step[4] == "if") args = "\"" + step[5] + "\"";
        else args = step[5].replace(consts.word,"\"$1\"");
        // the helpers always have the a maped template and the ignored as the last two arguments
        eval("compiled+=helpers." + step[4] + "("+ args +",mapStpl,ignored)");
        // reset the lastIndex for the next search
        stplReg.lastIndex = oldIndex = oldIndex + map[0]; // the next position
      }
    }
    var tail = keyString.retPlus+keyString.quote+stpl.slice(oldIndex)+keyString.quote+keyString.semicolon;
    return compiled + tail
  }
  var helpers = {
    "count": 0,
    "k": "vtpl_k_" + consts.randomNum,
    "c": "vtpl_c_" + consts.randomNum,
    "l": "vtpl_l_" + consts.randomNum,
    "each": function(obj, key, value, stpl, ignored) {
      var k = helpers.k + helpers.count;
      var curr = helpers.c + helpers.count;
      var len = helpers.l + helpers.count++;
      if(!value || !stpl) {
        var f = true; // means each(obj, stpl), usually used by array
        stpl = key
      }
      var _ignored = !!f ? [] : [key, value];
      consts.arrPush.apply(_ignored, ignored);
      var compiled = __compile__(stpl, {
        "ignored": _ignored
      });
      var obj = (inArray(_ignored, obj) ? "" : keyString.data_getter) + obj;
      var ret = "for(var "+k+"=0,"+curr+"="+obj+",len="+curr+".length;"+k+"<len;"+k+"++){" +
        (
          f ? "" : "var " + key + "="+k+","+value+"="+curr+"["+k+"];"
        )
        + compiled + "}";
      return ret
    },
    "if": function(condition, stpl, ignored) {
      var _ignored = [];
      consts.arrPush.apply(_ignored, ignored);
      var word = /((\w+)(?:\.\w+)*)|((\"|\')[^"']*?\4)/gm;
      condition = condition.replace(word, function(m0, m1, m2, m3) {/*debugger;*/
        return !inArray(_ignored, m2) && !/^\d+$/.test(m2) && !m3 ? keyString.data_getter + m0 : m0
      });
      var compiled = __compile__(stpl, {
        "ignored": ignored
      });
      var ret = "if(" + condition +"){" + compiled + "}";
      return ret
    }
  }
  function inArray(arr, i) {
    if("indexOf" in arr) {
      return -1 !== arr.indexOf(i)
    }
    for(var k = arr.length; k;) {
      if(arr[--k] == i)
        return true
    }
    return false
  }
  function checkoutMap(src, map, str) {
    var step, index, mapIndex = 0;
    var sl = src.length, ml = map.length;
    var copyStr = str;
    while((index = copyStr.indexOf(map)) != -1) {
      step = copyStr.slice(0, index);
      mapIndex += index+ml;
      if(step.indexOf(src) != -1) {
        copyStr = copyStr.slice(index+ml);
      }else {
        // [0] is the length of the mapped string and [1] is the mapped string
        return [mapIndex, str.slice(0, mapIndex - ml)]
      }
    }
    return false
  }
  Global.vTemplate = vTemplate
})(this)