(function(Global) {
  var consts = {
    "stplReg": /\<(\=)([^\<\=\>]+?)\>|\<(\@)([^\<\@\=]+?)\(\s*(?:[^\s\,]+)(?:\s*\,\s*(?:[^\s\,]+)){0,}\s*\)/gm,
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
      var tpl = info.tpl.replace(/\"|\'/gm, "\\\"");
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
        var endFlag = "\<\/\@"+step[4]+"\>";
        // find the @X end flag position
        var endIndex = subStpl.indexOf(endFlag);
        // extract the sub-template between <@X> and </@X>
        subStpl = subStpl.slice(0, endIndex);
        // figure out the next position
        var lastIndex = oldIndex + subStpl.length + endFlag.length + 1;
        var match = step[0];
        // find out the helpers arguments, the helpers always have the a template as the last argument
        var args = match.slice(match.indexOf("(")+1, match.indexOf(")")).replace(/(\w+)/gm,"\"$1\"");
        eval("compiled+=" + step[4] + "("+ args +",subStpl)");
        // reset the lastIndex for the next search
        stplReg.lastIndex = oldIndex = lastIndex;
      }
    }
    var tail = prefix.str+stpl.slice(oldIndex)+posifix.str;
    return compiled + tail
  }
  function each(name, key, value, stpl) {
    if(!value || !stpl) {
      var f = true;
      stpl = key
    }
    var compiled = __compile__(stpl, {
      "ignored": !!f ? [] : [key, value]
    });
    var ret = "for(var k=0,curr=data."+name+",len=curr.length;k<len;k++){" +
      (
        f ? "" : "var " + key + "=k,"+value+"=curr[k];"
      )
      + compiled + "}";
    return ret
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
  Global.vTemplate = vTemplate
})(this)