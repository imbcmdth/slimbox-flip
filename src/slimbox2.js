/*!
	Slimbox v2.04 - The ultimate lightweight Lightbox clone for jQuery
	(c) 2007-2010 Christophe Beyls <http://www.digitalia.be>
	MIT-style license.
*/

(function($) {

	// Global variables, accessible to Slimbox only
	var win = $(window), options, images, activeImage = -1, activeURL, prevImage, nextImage, compatibleOverlay, middle, centerWidth, centerHeight,
		ie6 = !window.XMLHttpRequest, hiddenElements = [], documentElement = document.documentElement,

	// Preload images
	preload = {}, preloadPrev = new Image(), preloadNext = new Image(), preloadFlip = new Image(),

	// DOM elements
	overlay, center, image, sizer, flipLink, prevLink, nextLink, bottomContainer, bottom, caption, number, loading = false;

	/*
		Initialization
	*/

	$(function() {
		// Append the Slimbox HTML code at the bottom of the document
		$("body").append(
			$([
				overlay = $('<div id="lbOverlay" />')[0],
				center = $('<div id="lbCenter" />')[0],
				bottomContainer = $('<div id="lbBottomContainer" />')[0]
			]).css("display", "none")
		);

		image = $('<div id="lbImage" />').appendTo(center).append(
			sizer = $('<div style="position: relative;" />').append([
				prevLink = $('<a id="lbPrevLink" href="#" />').click(previous)[0],
				nextLink = $('<a id="lbNextLink" href="#" />').click(next)[0]
			])[0]
		)[0];

		bottom = $('<div id="lbBottom" />').appendTo(bottomContainer).append([
			$('<a id="lbCloseLink" href="#" />').add(overlay).click(close)[0],
			flipLink = $('<a id="lbFlipLink" href="#" />').add(overlay).click(flip)[0],
			caption = $('<div id="lbCaption" />')[0],
			number = $('<div id="lbNumber" />')[0],
			$('<div style="clear: both;" />')[0]
		])[0];
	});


	/*
		API
	*/

	// Open Slimbox with the specified parameters
	$.slimbox = function(_images, startImage, _options) {
		options = $.extend({
			do3DFlip:false,
			loop: false,				// Allows to navigate between first and last images
			overlayOpacity: 0.8,			// 1 is opaque, 0 is completely transparent (change the color in the CSS file)
			overlayFadeDuration: 300,		// Duration of the overlay fade-in and fade-out animations (in milliseconds)
			resizeDuration: 400,			// Duration of each of the box resize animations (in milliseconds)
			resizeEasing: "swing",			// "swing" is jQuery's default easing
			initialWidth: 250,			// Initial width of the box (in pixels)
			initialHeight: 250,			// Initial height of the box (in pixels)
			imageFadeDuration: 400,			// Duration of the image fade-in animation (in milliseconds)
			captionAnimationDuration: 200,		// Duration of the caption animation (in milliseconds)
			counterText: "Image {x} of {y}",	// Translate or change as you wish, or set it to false to disable counter text for image groups
			counterFrontText: "(front)",    // Appended to counter when the front-side of a two-sided "flippable" image is displayed
			counterBackText: "(back)",      // Appended to counter when the back-side of a two-sided "flippable" image is displayed
			closeKeys: [27, 88, 67],		// Array of keycodes to close Slimbox, default: Esc (27), 'x' (88), 'c' (67)
			previousKeys: [37, 80],			// Array of keycodes to navigate to the previous image, default: Left arrow (37), 'p' (80)
			nextKeys: [39, 78],			// Array of keycodes to navigate to the next image, default: Right arrow (39), 'n' (78)
			flipKeys: [9, 70],			// Array of keycodes to navigate to the flipped image, default: Tab (9), 'f' (70)
			animateType: "both"   // Type of resize animation to play. "hw": height resized then width; "wh" width resized then height; "both" resize width and height simultaneously; 
		}, _options);

		// The function is called for a single image, with URL and Title as first two arguments
		if (typeof _images == "string") {
			_images = [[_images, startImage, null]];
			startImage = 0;
		}

		middle = win.scrollTop() + (win.height() / 2);
		centerWidth = options.initialWidth;
		centerHeight = options.initialHeight;
		$(center).css({top: Math.max(0, middle - (centerHeight / 2)), width: centerWidth, height: centerHeight, marginLeft: -centerWidth/2}).show();
		compatibleOverlay = ie6 || (overlay.currentStyle && (overlay.currentStyle.position != "fixed"));
		if (compatibleOverlay) overlay.style.position = "absolute";
		$(overlay).css("opacity", options.overlayOpacity).fadeIn(options.overlayFadeDuration);
		position();
		setup(1);

		images = _images;
		options.loop = options.loop && (images.length > 1);
		return changeImage(startImage);
	};

	/*
		options:	Optional options object, see jQuery.slimbox()
		linkMapper:	Optional function taking a link DOM element and an index as arguments and returning an array containing 3 elements:
				the image URL, the image caption (may contain HTML), and an alternate image URL (for flip)
		linksFilter:	Optional function taking a link DOM element and an index as arguments and returning true if the element is part of
				the image collection that will be shown on click, false if not. "this" refers to the element that was clicked.
				This function must always return true when the DOM element argument is "this".
	*/
	$.fn.slimbox = function(_options, linkMapper, linksFilter) {
		linkMapper = linkMapper || function(el) {
			return [el.href, el.title, (el.rev==""?null:el.rev)];
		};

		linksFilter = linksFilter || function() {
			return true;
		};

		var links = this;

		return links.unbind("click").click(function() {
			// Build the list of images that will be displayed
			var link = this, startIndex = 0, filteredLinks, i = 0, length;
			filteredLinks = $.grep(links, function(el, i) {
				return linksFilter.call(link, el, i);
			});

			// We cannot use jQuery.map() because it flattens the returned array
			for (length = filteredLinks.length; i < length; ++i) {
				if (filteredLinks[i] == link) startIndex = i;
				filteredLinks[i] = linkMapper(filteredLinks[i], i);
			}

			return $.slimbox(filteredLinks, startIndex, _options);
		});
	};


	/*
		Internal functions
	*/

	function position() {
		var l = win.scrollLeft(), w = win.width();
		$([center, bottomContainer]).css("left", l + (w / 2));
		if (compatibleOverlay) $(overlay).css({left: l, top: win.scrollTop(), width: w, height: win.height()});
	}

	function setup(open) {
		if (open) {
			$("object").add(ie6 ? "select" : "embed").each(function(index, el) {
				hiddenElements[index] = [el, el.style.visibility];
				el.style.visibility = "hidden";
			});
		} else {
			$.each(hiddenElements, function(index, el) {
				el[0].style.visibility = el[1];
			});
			hiddenElements = [];
		}
		var fn = open ? "bind" : "unbind";
		win[fn]("scroll resize", position);
		$(document)[fn]("keydown", keyDown);
	}

	function keyDown(event) {
		var code = event.keyCode, fn = $.inArray;
		// Prevent default keyboard action (like navigating inside the page)
		return (fn(code, options.closeKeys) >= 0) ? close()
			: (fn(code, options.nextKeys) >= 0) ? next()
			: (fn(code, options.previousKeys) >= 0) ? previous()
			: (fn(code, options.flipKeys) >= 0) ? flip()
			: true; // Allow all other key codes to continue on
	}

	function previous() {
		return changeImage(prevImage);
	}

	function next() {
		return changeImage(nextImage);
	}

	function flip() {
		if(!loading && activeImage >= 0 && images[activeImage][2]) {
			loading = true;
			
			if(activeURL === images[activeImage][2]){
				activeURL = images[activeImage][0];
			}else{
				activeURL = images[activeImage][2];
			}
			stop(true);
						
			preload = new Image();
			
			if(options.do3DFlip){
				preload.onload = function(){flipBox();};
			} else {
				preload.onload = function(){animateBox(true);};
			}
			
			preload.src = activeURL;
		}
		return false;
	}

	function changeImage(imageIndex) {
		if (!loading && imageIndex >= 0) {
			loading = true;
			activeImage = imageIndex;
			activeURL = images[activeImage][0];
			prevImage = (activeImage || (options.loop ? images.length : 0)) - 1;
			nextImage = ((activeImage + 1) % images.length) || (options.loop ? 0 : -1);

			stop();
			center.className = "lbLoading";

			preload = new Image();
			preload.onload = function(){animateBox();};
			preload.src = activeURL;
		}

		return false;
	}

	function flipBox() {
		center.className = "";

		$(caption).html(images[activeImage][1] || "");
		
		if (prevImage >= 0) preloadPrev.src = images[prevImage][0];
		if (nextImage >= 0) preloadNext.src = images[nextImage][0];
		if(images[activeImage][2] != null) { 
			if(activeURL === images[activeImage][0]) {
				preloadFlip.src = images[activeImage][2]; 
			}	else {
				preloadFlip.src = images[activeImage][0]; 
			}
		}

		resizeBox(true);
		
		var top = Math.max(0, middle - (centerHeight / 2));
		$(center).queue(function() {
			$(sizer).width(preload.width);
			$([sizer, prevLink, nextLink]).height(preload.height);

			$(image).flip({
				speed: (options.imageFadeDuration),
				direction:(activeURL === images[activeImage][2])?"rl":"lr",
				dontChangeColor: true,
				bgColor:"#777",
				midColor:"#555",
				toColor:"#777",
				onBefore:function(){
					$(image).css({backgroundImage: "url(" + activeURL + ")", visibility: "hidden", display: ""});
				},
				onAnimation:function(){
					$(number).html((((images.length > 1) && options.counterText) || "").replace(/{x}/, activeImage + 1).replace(/{y}/, images.length)+((images[activeImage][2]!==null)?" "+((activeURL === images[activeImage][2])?options.counterBackText:options.counterFrontText):"") );
				},
				onEnd:function(){
					$(image).css({display: "none", visibility: "", opacity: ""}).show();
					loading = false;
				}
			});			
		});
	}

	function animateBox(isFlipping) {
		center.className = "";
		$(image).fadeTo(options.imageFadeDuration, 0, function(){
			$(image).css({backgroundImage: "url(" + activeURL + ")", visibility: "hidden", display: ""});
			$(sizer).width(preload.width);
			$([sizer, prevLink, nextLink]).height(preload.height);
	
			$(caption).html(images[activeImage][1] || "");
			
			$(number).html((((images.length > 1) && options.counterText) || "").replace(/{x}/, activeImage + 1).replace(/{y}/, images.length)+((images[activeImage][2]!==null)?" "+((activeURL === images[activeImage][2])?options.counterBackText:options.counterFrontText):"") );
	
			if (prevImage >= 0) preloadPrev.src = images[prevImage][0];
			if (nextImage >= 0) preloadNext.src = images[nextImage][0];
			if(images[activeImage][2] != null) { 
				if(activeURL === images[activeImage][0]) {
					preloadFlip.src = images[activeImage][2]; 
				}	else {
					preloadFlip.src = images[activeImage][0]; 
				}
			}

			resizeBox(isFlipping);
			
			var top = Math.max(0, middle - (centerHeight / 2));
			if(!isFlipping){
				$(center).queue(function() {
					$(bottomContainer).css({width: centerWidth, top: top + centerHeight, marginLeft: -centerWidth/2, visibility: "hidden", display: ""});
					$(image).css({display: "none", visibility: "", opacity: ""}).fadeTo(options.imageFadeDuration, 1, animateCaption);
				});
			} else {
				$(center).queue(function() {
					$(image).css({display: "none", visibility: "", opacity: ""}).fadeTo(options.imageFadeDuration, 1, function(){ loading = false; });
				});
			}
		});
	}
	
	function resizeBox(isFlipping){
		centerWidth = preload.width+parseFloat($(image).css("border-left-width"))+parseFloat($(image).css("border-right-width"));//image.offsetWidth;
		centerHeight = preload.height+parseFloat($(image).css("border-bottom-width"))+parseFloat($(image).css("border-top-width"));//image.offsetHeight;
		var top = Math.max(0, middle - (centerHeight / 2));
		if (options.animateType == "both" && (center.offsetHeight != centerHeight || center.offsetWidth != centerWidth) ) {
			$(center).animate({height: centerHeight, top: top, width: centerWidth, marginLeft: -centerWidth/2}, options.resizeDuration, options.resizeEasing);
				if(isFlipping) { $(bottomContainer).animate({width: centerWidth, top: top + centerHeight, marginLeft: -centerWidth/2}, options.resizeDuration, options.resizeEasing); }
				if(isFlipping) { $(sizer).animate({width: preload.width, height: preload.height}); $([prevLink, nextLink]).animate({height: preload.height}); }
		} else if (options.animateType == "hw") {
			if (center.offsetHeight != centerHeight) {
				$(center).animate({height: centerHeight, top: top}, options.resizeDuration, options.resizeEasing);
				if(isFlipping) { $(bottomContainer).animate({top: top + centerHeight}, options.resizeDuration, options.resizeEasing); }
				if(isFlipping) { $([sizer, prevLink, nextLink]).animate({height: preload.height}); }
			}
			if (center.offsetWidth != centerWidth) {
				$(center).animate({width: centerWidth, marginLeft: -centerWidth/2}, options.resizeDuration, options.resizeEasing);
				if(isFlipping) { $(bottomContainer).animate({width: centerWidth, marginLeft: -centerWidth/2}, options.resizeDuration, options.resizeEasing); }
				if(isFlipping) { $(sizer).animate({width: preload.width}); }
			}
		} else if (options.animateType == "wh") {
			if (center.offsetWidth != centerWidth) {
				$(center).animate({width: centerWidth, marginLeft: -centerWidth/2}, options.resizeDuration, options.resizeEasing);
				if(isFlipping) { $(bottomContainer).animate({width: centerWidth, marginLeft: -centerWidth/2}, options.resizeDuration, options.resizeEasing); }
				if(isFlipping) { $(sizer).animate({width: preload.width}); }
			}
			if (center.offsetHeight != centerHeight) {
				$(center).animate({height: centerHeight, top: top}, options.resizeDuration, options.resizeEasing);
				if(isFlipping) { $(bottomContainer).animate({top: top + centerHeight}, options.resizeDuration, options.resizeEasing); }
				if(isFlipping) { $([sizer, prevLink, nextLink]).animate({height: preload.height}); }
			}
		}
	}
	function animateCaption() {
		if(images[activeImage][2]) $(flipLink).show();
		if (prevImage >= 0) $(prevLink).show();
		if (nextImage >= 0) $(nextLink).show();
		bottomContainer.style.visibility = "";
		$(bottom).css("marginTop", -bottom.offsetHeight).animate({marginTop: 0}, options.captionAnimationDuration, function(){
			loading = false;
		});
	}

	function stop(isFlipping) {
		preload.onload = null;
		preload.src = preloadPrev.src = preloadNext.src = preloadFlip.src = activeURL;
		$([center, image, bottom]).stop(true);
		if(!isFlipping) {
			$([prevLink, nextLink, flipLink, image]).hide();
			$(bottom).css("marginTop", 0).animate({marginTop: -bottom.offsetHeight}, options.captionAnimationDuration);
		}
	}

	function close() {
		if (activeImage >= 0) {
			$([prevLink, nextLink, flipLink, image]).hide();
			$(bottomContainer).css({visibility: "hidden"});
			stop(true);
			activeImage = prevImage = nextImage = -1;
			$(center).hide();
			$(overlay).stop().fadeOut(options.overlayFadeDuration, function(){
				setup();
				loading = false;
			});
		}
		return false;
	}

})(jQuery);