/*
 * SimpleModal OSX Style Modal Dialog
 * http://www.ericmmartin.com/projects/simplemodal/
 * http://code.google.com/p/simplemodal/
 *
 * Copyright (c) 2010 Eric Martin - http://ericmmartin.com
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Revision: $Id: osx.js 238 2010-03-11 05:56:57Z emartin24 $
 */

jQuery(function ($) {
	var OSX = {
		container: null,
		init: function () {
			$("#osx-modal-content").modal({
				overlayId: 'osx-overlay',
				containerId: 'osx-container',
				closeHTML: null,
				minHeight: 400,
				opacity: 65, 
				position: ['0',],
				overlayClose: true,
				onOpen: OSX.open
			});
		},
		open: function (d) {
			var self = this;
			self.container = d.container[0];
				$("#osx-modal-content", self.container).show();
				var title = $("#osx-modal-title", self.container);
				title.show();
				d.container.show()
				var h = $("#osx-modal-data", self.container).height()
					+ title.height()
					+ 20; // padding
				$("#osx-container").height(h)
				$("div.close", self.container).show();
				$("#osx-modal-data", self.container).show();
		}
	};
	
	$("#youtube_search").submit(function(e) {
	  $("#osx-modal-data-list").children().remove();
	  $.ajax({url: "http://gdata.youtube.com/feeds/api/videos", data: { v: 2, alt: "json", q: $('#youtube_search_text').attr('value')}, dataType: 'jsonp', 
      success:function(data) {
        var items = data.feed.entry; 
        for(var i = 0; i < items.length; i++){
          console.log(items[i]);
          $("#osx-modal-data-list").append('<li><a href="' + items[i].link[0].href + '" class="youtube_link">' + items[i].title.$t + "</li>")
        } 
        $('.youtube_link').click(function(event){
          $.ajax({url: "/submit_youtube_link", type: "POST", data: {youtube_link: event.target.href}});
          $.modal.close();
          return false;
        });
    		OSX.init();
      }
    })
		return false;
	});
  
});