(function(Global) {
  var consts = {
    "stplReg": /\<(\=)([^\<\=\>]+?)\>|\<(\@)([^\<\@\=]+?)\(\s*(?:\w+)(?:\s*\,\s*(?:\w+)){0,}\s*\)/gm,
    "arrPush": Array.prototype.push
  };
  var prefix = {
    "str": "out+=\'",
    "arrKw": "out+=",
    "attr": "out+=data."
  }
  var posifix = {
    "str": "\';",
    "semicolon": ";"
  }
  function vTemplate(tpl) {
    var that = {};
    var info = {
      "tpl": tpl
    }
    that.compile = function() {
      if(typeof that.render == "function")
        return;
      var tpl = info.tpl.replace(/(\"|\')/gm, "\\$1");
      var evalString = "that.render=function(data) {var out=\"\";" + __compile__(tpl) + ";return out;}"
      // generate the render function
      eval(evalString);
    }
    return that;
  }
  function __compile__(stpl, config) {
    var stplReg = consts.stplReg;
    stplReg.lastIndex = 0;
    var step = null;
    var oldIndex = 0;
    var compiled = "";
    var ignored = config && config.ignored || [];
    while(step = stplReg.exec(stpl)) {
      compiled += prefix.str + stpl.slice(oldIndex, stplReg.lastIndex - step[0].length) + posifix.str;
      oldIndex = stplReg.lastIndex;
      if(step[1] == "\=") {
        // restore the function like arr.join("") because that.compile change the join("") to join(\"\")
        var step_2 = step[2].replace(/\\\"/gm, "\"");
        compiled += (inArray(ignored, step_2) ? prefix.arrKw : prefix.attr) + step_2 + posifix.semicolon;
      }else if(step[3] == "\@") {
        var subStpl = stpl.slice(oldIndex+1);
        var startFlag = "\<\@"+step[4]+"\(";
        var endFlag = "\<\/\@"+step[4]+"\>";
        // figure out the nex position argument and the sub-template between <@X> and </@X>
        var map = checkoutMap(startFlag, endFlag, subStpl);
        if(!map) {
          throw "Something wrong with your template"
        }
        var mapStpl = map[1];
        var match = step[0];
        // find out the helpers arguments
        var args = match.slice(match.indexOf("(")+1, match.indexOf(")")).replace(/(\w+)/gm,"\"$1\"");
        // the helpers always have the a maped template and the ignored as the last two arguments
        eval("compiled+=helpers." + step[4] + "("+ args +",mapStpl,ignored)");
        // reset the lastIndex for the next search
        stplReg.lastIndex = oldIndex = oldIndex + map[0] + 1; // the next position
      }
    }
    var tail = prefix.str+stpl.slice(oldIndex)+posifix.str;
    return compiled + tail
  }
  var helpers = {
    "count": 0,
    "each": function(name, key, value, stpl, ignored) {
      var k = "k" + helpers.count;
      var curr = "curr" + helpers.count;
      var len = "len" + helpers.count++;
      if(!value || !stpl) {
        var f = true;
        stpl = key
      }
      var _ignored = !!f ? [] : [key, value];
      consts.arrPush.apply(_ignored, ignored);
      var compiled = __compile__(stpl, {
        "ignored": _ignored
      });
      var obj = (inArray(_ignored, name) ? "" : "data.") + name;
      var ret = "for(var "+k+"=0,"+curr+"="+obj+",len="+curr+".length;"+k+"<len;"+k+"++){" +
        (
          f ? "" : "var " + key + "="+k+","+value+"="+curr+"["+k+"];"
        )
        + compiled + "}";
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
      mapIndex += index+ml;
      step = copyStr.slice(0, index);
      if(step.indexOf(src) != -1) {
        copyStr = copyStr.slice(index+ml);
      }else {
        // [0] is the length of the mapped string and [1] is the mapped string
        return [mapIndex, str.slice(0, mapIndex)]
      }
    }
    return false
  }
  Global.vTemplate = vTemplate
})(this)