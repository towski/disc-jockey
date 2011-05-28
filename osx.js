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
		  if(youtubePlaying){
		    var position = ['100','690'];
	    } else {
	      var position = ['100'];
      }
			$("#osx-modal-content").modal({
				overlayId: 'osx-overlay',
				containerId: 'osx-container',
				closeHTML: null,
				minHeight: 400,
				opacity: 65, 
				position: position,
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
				var h = $("#osx-modal-data", self.container).height() +
				  $("#search-results", self.container).height() +
					+ title.height()
					+ 20; // padding
				$("#osx-container").height(h)
				$("div.close", self.container).show();
				$("#osx-modal-data", self.container).show();
		}
	};
	
	window.search = function(params){
	  if(params == undefined){
	    params = {};
    }
  	$.ajax({url: "/search", data: params, dataType: 'json',
      success:function(data) {
        $('#search-results').html(tmpl("data_tmpl",{data: data}));
        $('#next_page').click(function(){
          if(params.type){
            var query = {type:params.type, page_start: data[data.length-1]._id};
          }else{
            var query = {page_start: data[data.length-1]._id}
          }
          search(query);
        });
    	  OSX.init();
      }
    })
  }
	
	$("#open_search").click(function(e) {
    search();
  })
	
	$("#youtube_search").submit(function(e) {
	  $('#search-results').html("");
	  $("#osx-modal-data-list").children().remove();
	  var search = $('#youtube_search_text').attr('value');
	  var provider = $('input:radio[name=group1]:checked').val()
	  if(provider == "youtube"){
	    $.ajax({url: "http://gdata.youtube.com/feeds/api/videos", data: { v: 2, alt: "json", q: search }, dataType: 'jsonp', 
        success:function(data) {
          var items = data.feed.entry; 
          for(var i = 0; i < items.length; i++){
            var description = items[i].media$group.media$description.$t;
            description = description.replace(/\"/g, "&quot;");
            $("#osx-modal-data-list").append('<li><p><a title="'+description+'" href="' + items[i].link[0].href + '" class="youtube_link">' + items[i].title.$t + "</a></p></li>")
          } 
          $('.youtube_link').click(function(event){
            $.ajax({url: "/submit_youtube_link", type: "POST", data: {youtube_link: event.target.href}});
            $.modal.close();
            return false;
          });
      		OSX.init();
        }
      })
    }else if(provider == "soundcloud"){
      $.ajax({url: "http://api.soundcloud.com/tracks.json", data: { q: search , consumer_key: "keHOFdLJaAAm9mGxgUxYw"}, dataType: 'jsonp',
        success:function(data) {
          for(var i = 0; i < data.length; i++){
            var description = data[i].description.replace(/\"/g, "&quot;");
            $("#osx-modal-data-list").append('<li><a href="' + data[i].permalink_url + '" title="'+ description +'" class="soundcloud_link">' + data[i].title +  "</a> <span style='font-size:8px'>"+ data[i].tag_list +"</span></li>")
          } 
          $('.soundcloud_link').click(function(event){
            $.ajax({url: "/submit_soundcloud_link", type: "POST", data: {soundcloud_link: event.target.href}});
            $.modal.close();
            return false;
          });
      		OSX.init();
        }
      })
    }
		return false;
	});
  
});