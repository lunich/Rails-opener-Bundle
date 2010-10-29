// Main application class
function Application() {
  this.debugMessage = function (message) {
    this.debug.html(message);
  }
  
  this.runTextMate = function (cmd, callback) {
    this.tm_command = TextMate.system(cmd, callback);
    Application.instance.callback_buffer = "";
		this.tm_command.onreadoutput = function(str) {
		  Application.instance.callback_buffer += str;
		};
		this.tm_command.onreaderror = function(str) {
		  Application.instance.callback_buffer = str;
		};
		this.tm_command = null;
  }
  
  this.openFile = function () {
    var sel = Application.instance.getSelection();
    if(sel) {
      // 'ruby' \
      //   '/Library/Application\ Support/TextMate/Bundles/Rails\ opener/Support/lib/file_opener.rb' \
      //    find-model 'applhlpr'
  		var cmd = "'" + ruby_path + "'" + 
  		  " " +
  		  "'" + bundle_support + "/lib/file_opener.rb" + "'" +
  		  " " +
  		  "run-" + target +
  		  " " +
  		  "'" + sel.find("input").val() + "'";
      this.runTextMate(cmd, function (task) {
        // Application.instance.debugMessage(cmd);
        window.close();
      });
    }
  }
  
  this.processSystem = function (event) {
    switch(event.keyCode) {
    case 13: // return
      this.openFile();
      break;
    case 27: // escape
      window.close();
      break;
    }
  }

  this.initFileList = function () {
    // TODO make this work
    // this.debugMessage($(".file").length);
    // Onclick select
    $(".file.first").click(function () {
      Application.instance.setSelected($(this));
      Application.instance.search.focus();
    });
  }
  
  this.getSelection = function () {
    var res = $(".file.selected");
    if(0 == res.length) {
      res = null;
    }
    return res;
  }
  
  this.getSelectionIndex = function () {
    var sel = this.getSelection();
    if(sel) {
      return parseInt(sel.attr("id").match(/file-(\d+)/)[1]);
    } else {
      return -1;
    }
  }
  
  this.getLastIndex = function () {
    var last = $(".file.last");
    if(0 == last.length) {
      return -1;
    } else {
      return parseInt(last.attr("id").match(/file-(\d+)/)[1]);
    }
  }
  
  this.changeSelection = function (n, limit) {
    if(0 != n) {
      var current = this.getSelectionIndex();
      var total = this.getLastIndex();
      if(-1 != current && -1 != total ) {
        var new_sel = current + n;
        while(new_sel > total) {
          if(limit) {
            new_sel = total;
          } else {
            new_sel -= (total + 1);
          }
        }
        while(new_sel < 0) {
          if(limit) {
            new_sel = 0;
          } else {
            new_sel += (total + 1);
          }
        }
        this.setSelected($("#file-" + new_sel));
      }
    }
  }

  this.ensureVisible = function (sel) {
    var item_pos = sel.offset().top;
    var item_height = sel.outerHeight();
    var list_pos = this.file_list.offset().top;
    var list_scroll = this.file_list.scrollTop();

    var top_delta = (list_pos - item_pos);
    var bottom_delta = (item_pos + item_height) - (this.file_list.height() + list_pos);

    if (top_delta >= 0 ) {
      this.file_list.scrollTop(list_scroll - top_delta);
    } else if(bottom_delta >= 0) {
       this.file_list.scrollTop(list_scroll + bottom_delta);
    }
  }

  this.setSelected = function (new_sel) {
    this.getSelection().removeClass("selected");
    new_sel.addClass("selected");
    this.ensureVisible(new_sel);
  }

  this.processSelection = function (event) {
    var step = 0;
    var limit = false;
    switch(event.keyCode) {
		case 38: // up
		  step = -1;
		  break;
  	case 40: // down
		  step = 1;
		  break;
		case 33: // page up
		  step = -10; limit = true;
		  break;
		case 34: // page down
		  step = 10; limit = true;
		  break;
    }
    this.changeSelection(step, limit);
  }
  
  this.updateSearch = function () {
    if(!Application.instance.blocked) {
      var cur = Application.instance.search.val();
      if(Application.instance.search_value != cur) {
        Application.instance.search_value = cur;
        // 'ruby' \
        //   '/Library/Application\ Support/TextMate/Bundles/Rails\ opener/Support/lib/file_opener.rb' \
        //    find-model 'applhlpr'
    		var cmd = "'" + ruby_path + "'" + 
    		  " " +
    		  "'" + bundle_support + "/lib/file_opener.rb" + "'" +
    		  " " +
    		  "find-" + target +
    		  " " +
    		  "'" + cur + "'";
    		Application.instance.blocked = true;
        Application.instance.runTextMate(cmd, function(task) {
          Application.instance.file_list.html(Application.instance.callback_buffer);
          Application.instance.blocked = false;
    		});
      }
    }
  }

  this.initialize = function () {
    // Init variables
    this.header       = $("#header");
    this.file_list    = $("#files");
    this.footer       = $("#footer");
    this.search       = $("#search");
    this.tm_command   = null;
    this.search_value = "";
    this.callback_buffer = "";
    this.blocked = false;
    // debug
    this.debug = $("#search-value");
    // Go to search field
    this.search.focus();
    // Files onclick
    this.initFileList();
    // Set list size
    Application.resizeList();
    // Callbacks
    // - resizer
    $(window).resize(Application.resizeList);
    // - process search-text changes
    setInterval(this.updateSearch, 1);
    // - process keyboard events
    $(document).keydown(Application.handleKeydown);
    $(document).keyup(Application.handleKeyup);
    // this.debugMessage(this.file_list.html().length)
  }

  this.initialize();
}

Application.instance = null;

Application.setup = function () {
  Application.instance = new Application();
};

Application.resizeList = function () {
  $("#files").height($("#footer").offset().top - $("#files").offset().top);
}

Application.handleKeydown = function (event) {
	if (typeof event == "undefined") event = window.event;

	switch(event.keyCode) {
		case 80: // p
		case 78: // n
      if (!event.ctrlKey) break; // only do this for ctrl - p/n
		case 9: // tab
		case 38: // up
		case 40: // down
		case 33: // page up
		case 34: // page down
		  // Application.instance.debugMessage(event.keyCode);
		  Application.instance.processSelection(event);
		case 32: // space
		case 27: // escape
		case 13: // return/enter
      event.stopPropagation();
      event.preventDefault();  
		  break;
	}
};

Application.handleKeyup = function (event) {
	if (typeof event == "undefined") event = window.event;

	switch(event.keyCode) {
		case 27: // escape
		case 32: // space
		case 13: // return/enter
			Application.instance.processSystem(event);
			// fallthrough intentional to stop propagation
		case 9: // tab
		case 38: // up
		case 40: // down
		case 33: // page up
		case 34: // page down
			event.stopPropagation();
			event.preventDefault();
			break;
	}
};

$(function () {
  Application.setup();
});
