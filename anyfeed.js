
$(document).ready(function() {

// Array of feed objects, each of which has a title, and link, a url, a num,
//   (possibly) cached contents, unread count, feedDiv, feedButtonSpan, and
//   feedTitleSpan.
//   The title is the human-readable name.
//   The link is the URL to the human-readable blog.
//   The url is the actual URL of the RSS feed (non-human-readable).
//   The num is the 1-based order number of the feed.
//   The contents is the jQuery-ified XML-parsed feed response.
//   The unreadCount is an integer of the number of unread posts.
//   The feedDiv is the outermost div of the feed as displayed on LHS.
//   The feedButtonSpan is the inner span surrounding the popup menu "dot".
//   The feedTitleSpan is the inner span surrounding the feed's title.
var feedsArray = [];

// A hashtable of those very same feed objects, indexed by url. (More
//   precisely, an object whose property names are urls and whose property
//   values are feed objects.)
var feedsHash = {};

// The feed whose posts are currently in the posts div.
var loadedFeed;

// The feed whose "dot" was the most recent to be hovered over.
var hoveredFeed;

// The name of the logged in user, duh.
var username;

// The current 10-minute timer to refresh feeds.
var activeTimeout;
var timeoutDuration = 10*60*1000;

// -------------------------------- init ----------------------------------
var init = function() {
    var password = $.cookies.get("anyfeedPassword");
    username = $.cookies.get("anyfeedUsername");
    $("#renamefeed").click(renameFeed);
    $("#showfeedurl").click(showFeelUrl);
    $("#removefeed").click(removeFeed);
    $("#markread").click(markFeedReadFromFeedsDiv);
    $("#markunread").click(markFeedUnreadFromFeedsDiv);
    $("#refresh").click(refreshFeeds);
    $("#addnewfeed").click(addNewlyTypedFeed);
    $("#import").click(importOpml);
    $("#logout").click(logout);
    if (username == undefined) {
        promptForLogin();
    } else {
        tryLoggingInToServer(password);
    }
    activeTimeout = setTimeout(periodicRefresh,timeoutDuration);
};

var periodicRefresh = function() {
    refreshFeeds();
    activeTimeout = setTimeout(periodicRefresh,timeoutDuration);
};

var restartRefreshTimer = function() {
    clearTimeout(activeTimeout);
    activeTimeout = setTimeout(periodicRefresh,timeoutDuration);
};

var tryLoggingInToServer = function(password) {
    $.ajax({
        url : "login.php?username=" + escape(username) + "&password=" +
            escape(password),
        type : "GET",
        dataType : "text"
    }).done(function(data) {
        if (data.indexOf("logged in") == 0) {
            $("#logindialog").css("visibility","hidden");
            $.cookies.set("anyfeedUsername", username, 
                { expiresAt: new Date(2099,1,1)} );
            $.cookies.set("anyfeedPassword", password, 
                { expiresAt: new Date(2099,1,1)} );
            $("#apptitle").text("anyfeed - " + username);
            $(".onlyloggedin").css("visibility","visible");
            startLoadFeedsFromServer();
        } else {
            $("#loginMessage").text("Login failed -- try again.");
            promptForLogin();
        }
    });
};

var promptForLogin = function() {
    var getDataAndDoLogin = function() {
        $("#loginMessage").text("");
        username = $("#username").val();
        password = CryptoJS.SHA1($("#password").val()).toString(
                                                    CryptoJS.enc.Base64);
        tryLoggingInToServer(password);
    };
    $("#password").keyup(function(event) {
        if (event.keyCode == 13) {
            getDataAndDoLogin();
        }
    });
    $("#loginSubmit").click(getDataAndDoLogin);
    $("#logindialog").css("visibility","visible");
    $(".onlyloggedin").css("visibility","hidden");
};

var logout = function() {
    username = $.cookies.get("anyfeedUsername");
    $.cookies.del("anyfeedUsername"); 
    $.cookies.del("anyfeedPassword");
    $.ajax({
        url : "logout.php?username=" + escape(username),
        type : "GET",
        dataType : "text"
    }).done(function(data) {
        $(".onlyloggedin").css("visibility","hidden");
        $("#apptitle").text("anyfeed");
        $("title").text("anyfeed");
        $("#feeds").html("");
        $("#posts").html("");
        promptForLogin();
    });
};

// ----------------------------- import OPML ------------------------------
var importOpml = function() {
    var url = prompt("Enter the URL to your OPML file (in XML format):");
    if (url == "") {
        url = "subscriptions.xml";
    }
    $.ajax({
        url : url,
        type : "GET",
        dataType : "xml"
    }).done(function(data) {
        $(data).find("outline > outline").each(
            function() {
                startAddNewFeed($(this).attr("xmlUrl"),
                    $(this).attr("title"));
            }
        );
    });
};


// ----------------------------- rename feed -------------------------------
var renameFeed = function() {
    var oldtitle = hoveredFeed.title,
        newtitle = prompt("Enter new feed title:", oldtitle);
    restartRefreshTimer();
    if (newtitle == null) return;
    $.ajax({
        url : "renameFeed.php?url=" + escape(hoveredFeed.url) + 
            "&title=" + escape(newtitle),
        type : "GET",
        dataType : "text"
    }).done(function(newtitle) {
        hoveredFeed.title = newtitle;
        updateFeedInFeedsDiv(hoveredFeed);
        if (hoveredFeed == loadedFeed) {
            $("#poststitle").text(newtitle + " (" + oldtitle + ")");
        }
    });
};

// ----------------------------- rename feed -------------------------------
var showFeelUrl = function() {
    alert(hoveredFeed.url);
};

// ---------------------- remove feed (unsubscribe) ------------------------
var removeFeed = function() {
    var url = hoveredFeed.url;
    restartRefreshTimer();
    $.ajax({
        url : "removeFeed.php?url=" + escape(hoveredFeed.url),
        type : "GET",
        dataType : "text"
    }).done(function(data) {
        if (data.indexOf("unsubscribed") == 0) {
            unreadPostsCounter.incrementBy(-hoveredFeed.unreadCount);
            hoveredFeed.feedDiv.remove();
        } else {
            alert("Unable to unsubscribe from " + hoveredFeed.title + "!");
        }
    });
};

// ---------------------------- unread count ------------------------------
var startUpdateUnreadCountFromCachedContents = function(feed) {
    var feedTitleSpan = feed["feedTitleSpan"],
        cachedContent = feed["contents"],
        guids = [],
        feedLink = extractFeedLink($(cachedContent));

    extractItems($(cachedContent)).each(function() {
        var guidIshThing = computeGuidIshThingFromItem(feedLink, $(this));
        guids.push(guidIshThing);
    });

    $.ajax({
        url : "whichGuidsAreUnread.php",
        data : JSON.stringify(guids),
        type : "POST",
        dataType : "json",
        contentType : "text/json"
    }).done(
        function finishUpdateUnreadCountFromCachedContents(data) {
            feed.feedDiv.removeClass("loading2");
            feed.feedDiv.addClass("loading3");
            var unread = $(data);
            setUnreadCount(feed, unread.length);
            unreadPostsCounter.incrementBy(unread.length);
        });
};

var incrementUnreadCountFor = function(feed) {
    var newCount = feed.unreadCount + 1;
    setUnreadCount(feed, newCount);
};

var decrementUnreadCountFor = function(feed) {
    var newCount = feed.unreadCount - 1;
    setUnreadCount(feed, newCount);
};

var setUnreadCount = function(feed, unreadCount) {
    feed.unreadCount = unreadCount;
    updateFeedInFeedsDiv(feed);
};

var updateFeedInFeedsDiv = function(feed) {
    if (feed.unreadCount == 0) {
        feed.feedTitleSpan.html("<span class=feedcaughtup>" + feed.title +
            "</span>");
        feed.feedTitleSpan.append(" <span class=zerounreadcount>(0)");
        feed.feedDiv.find("img").attr("src","images/greyDot.png");
    } else {
        feed.feedTitleSpan.html("<span class=feednotcaughtup>" + feed.title +
            "</span>");
        feed.feedTitleSpan.append(" <span class=nonzerounreadcount>(" + 
            feed.unreadCount + ")</span>");
        feed.feedDiv.find("img").attr("src","images/blueDot.png");
    }
    if (feed == loadedFeed) {
        if (feed.unreadCount == 0) {
            $("#poststitle").addClass("feedcaughtup");
            $("#poststitle").removeClass("feednotcaughtup");
        } else {
            $("#poststitle").addClass("feednotcaughtup");
            $("#poststitle").removeClass("feedcaughtup");
        }
    }
};

// ------------------------------ load feeds ------------------------------
var startLoadFeedsFromServer = function() {
    feedsArray = [0];
    feedsHash = {};
    unreadPostsCounter.set(0);
    $.ajax({
        url : "getAllFeeds.php",
        type : "GET",
        dataType : "xml"
    }).done(finishLoadFeedsFromServer);
};

var finishLoadFeedsFromServer = function(data) {

    var feedsDiv = $("#feeds");
    feedsDiv.html("");

    $(data).find("feed").each(function() {
        var feedElem = $(this),
            url = feedElem.find("feedurl").text(),
            feed = {
                title : feedElem.find("feedtitle").text(),
                url : url,
                num : feedElem.find("num").text(),
                link : feedElem.find("feedlink").text(),
            };
        addFeedToMemoryAndDisplay(feed);
    });
    displayAllFeeds();
};

var displayAllFeeds = function() {
    // Go through the feedsArray, one by one (since they were inserted in
    // order), and add each of their prefabricated feedDivs to the 
    // feedsDiv. 
    for (var i=1, len=feedsArray.length; i<len; i++) {
        if (feedsArray[i] !== undefined) {
            $("#feeds").append(feedsArray[i].feedDiv);
        }
    }
};

// ---------------------------- refresh feeds ----------------------------
var refreshFeeds = function() {
    unreadPostsCounter.set(0);
    for (var i=1, len=feedsArray.length; i<len; i++) {
        var feed = feedsArray[i];
        if (feed !== undefined) {
            delete feed.contents;
            feed.feedDiv.removeClass("loading2");
            feed.feedDiv.removeClass("loading3");
            feed.feedDiv.addClass("loading");
            feed.feedTitleSpan.html(feed.title);
            updateUnreadCountForFeed(feed);
        }
    }
};



// ------------------------------ add feeds -------------------------------
var addNewlyTypedFeed = function() {
    var url = $("#newfeedurl").val();
    restartRefreshTimer();
    startAddNewFeed(url);
    $("#newfeedurl").val("");
};

// (newtitle will be null unless this is an import)
var startAddNewFeed = function(url, newtitle) {
    loadFeedThenCall(url, finishAddNewFeed(url, newtitle));
};

var extractFeedTitle = function(data) {
    var tryRss = $(data).find("channel > title"),
        tryAtom;
    if (tryRss.size() != 0) {
        return tryRss.text();
    } else {
        tryAtom = $(data).find("feed > title");
        return tryAtom.text();
    }
}

var extractFeedLink = function(data) {
    var tryRss = $(data).find("channel > link"),
        tryAtom;
    if (tryRss.size() != 0) {
        return tryRss.text();
    } else {
        tryAtom = $(data).find("feed > link").first();
        return tryAtom.attr("href");
    }
}

var finishAddNewFeed = function(url, newtitle) { 
    return function(data) {
        var title = newtitle == null ? 
                extractFeedTitle(data) : newtitle,
            link = extractFeedLink(data),
            newfeed = {
                title : title,
                link : link,
                url : url,
                contents : $(data)
            };

        if (alreadySubscribedTo(url)) {
            alert("Already subscribed to " + url + "!");
        } else {
            addFeedToMemoryAndDisplay(newfeed);
            $("#feeds").append(newfeed.feedDiv);
            addFeedToServer(newfeed);
        }
    };
}

var alreadySubscribedTo = function(url) {
    return feedsHash.hasOwnProperty(url);
};

var addFeedToServer = function(newfeed) {
    $.ajax({
        url : "addFeed.php",
        type : "POST",
        data : JSON.stringify(newfeed),
        contentType : "text/json",
        dataType : "xml"
    });
};

var addFeedToMemoryAndDisplay = function(newfeed) {

    // 1a. Create a feed div for this new feed.
    var feedDiv = $("<div>"),         // (create a new feed div)
        feedTitleSpan = $("<span>"),  // (create a new feed title div)
        feedButtonSpan = $("<span>"), // (create a new feed button div)
        feedsDiv = $("#feeds");       // (get the existing feeds div)

    feedDiv.addClass("loading");

    feedTitleSpan.addClass("feedtitle");
    feedTitleSpan.text(newfeed.title);
    feedTitleSpan.data("feed",newfeed);
    feedTitleSpan.click(startPopulatePostsDivWithFeedContents);

    feedButtonSpan.addClass("feedbutton");
    feedButtonSpan.html("<img src=\"images/greyDot.png\" />");
    feedButtonSpan.data("feed",newfeed);
    feedButtonSpan.addpopupmenu("feedpopupmenu");
    feedButtonSpan.mouseenter(function() {
        restartRefreshTimer();
        hoveredFeed = newfeed; 
    });
    
    // 1b. String together these new divs.
    feedDiv.append(feedButtonSpan);
    feedDiv.append(feedTitleSpan);

    // 2. Add this feed to the data structures (feedsArray, feedsHash).
    newfeed["feedDiv"] = feedDiv;
    newfeed["feedButtonSpan"] = feedButtonSpan;
    newfeed["feedTitleSpan"] = feedTitleSpan;

    if (newfeed.hasOwnProperty("num")) {
        feedsArray[newfeed.num] = newfeed;
    } else {
        feedsArray.push(newfeed);
    }
    feedsHash[newfeed.url] = newfeed;

    // 3. Update the feed with its "unread" count.
    updateUnreadCountForFeed(newfeed);
};

var updateUnreadCountForFeed = function(feed) {
    if (feed.contents === undefined) {
        // Cache empty for this feed. Fill it.        
        loadFeedThenCall(feed.url, 
            function(data) {
                feed.feedDiv.removeClass("loading");
                feed.feedDiv.addClass("loading2");
                feed.contents = $(data);
                startUpdateUnreadCountFromCachedContents(feed);
            }
        );
    } else {
        feed.feedDiv.addClass("loading2");
        startUpdateUnreadCountFromCachedContents(feed);
    }
};

var loadFeedThenCall = function(url, callback) {
    $.ajax({
        url : "rssproxy.php?url=" + escape(url),
        type : "GET",
        dataType : "xml"
    }).done(callback);
};


// ------------------------ populate posts div -----------------------------
var startPopulatePostsDivWithFeedContents = function() {
    var url = $(this).data("feed").url;
    restartRefreshTimer();
    if (loadedFeed != null) {
        loadedFeed.feedTitleSpan.removeClass("activeFeed");
    }
    loadedFeed = $(this).data("feed");
    loadedFeed.feedTitleSpan.addClass("activeFeed");
    loadFeedThenCall(url, continuePopulatePostsDivWithFeedContents(url));
};

var extractItems = function(feedContents) {
    var tryRss = feedContents.find("item");
    if (tryRss.size() > 0) {
        return tryRss;
    } else {
        return feedContents.find("entry");
    }
}

var continuePopulatePostsDivWithFeedContents = function(url) {

    return function(feedContents) {

        var guids = [],
            feedLink = extractFeedLink(feedContents);

        extractItems($(feedContents)).each(function() {
            var guidIshThing = 
                computeGuidIshThingFromItem(feedLink, $(this));
            guids.push(guidIshThing);
        });

        $.ajax({
            url : "whichGuidsAreUnread.php",
            data : JSON.stringify(guids),
            type : "POST",
            dataType : "json",
            contentType : "text/json"
        }).done(function finishPopulatePostsDivWithFeedContents(data) {

            var title = extractFeedTitle($(feedContents)),
                postsDiv = $("#posts"),
                unread = $(data),
                feed = feedsHash[url];
        
            if (feed.title != null && feed.title != title) {
                title = feedsHash[url].title + " (" + title + ")";
            }

            postsDiv.html("<div style=\"vertical-align:middle;\">" +
              "<span id=poststitle>" + title + "</span>" +
              "<div>" +
              "<span><button id=markAllRead>Mark all read</button></span>" +
              "<span><button id=markAllUnread>Mark all unread</button></span>"+
              "</div>" +
              "</div>" +
              "<div class=activefeedurl>" +
              "<a href=\"" + feed.link + "\" target=\"_blank\">" + 
                  feed.link + "</a>");
            $("#markAllRead").click(markAllPostsRead);
            $("#markAllUnread").click(markAllPostsUnread);

            if (feed.unreadCount == 0) {
                $("#poststitle").addClass("feedcaughtup");
            } else {
                $("#poststitle").addClass("feednotcaughtup");
            }

            extractItems($(feedContents)).each(function() {

                var post = $(this),
                    postDiv = $("<div>"),
                    postTitleDiv = $("<div>"),
                    postTextDiv = $("<div>"),
                    toAppend = "";

                postDiv.addClass("post");
                postTitleDiv.addClass("posttitle");
                postTextDiv.addClass("posttext");
                
                toAppend += 
                    "<img class=postDot >" +
                        " <a href=\"" + extractItemLink(post) + 
                        "\" target=\"_blank\">" + 
                        post.find("title").text() + "</a>";

                if (post.find("author").text()) {
                    toAppend += " <span class=postauthor>(" + 
                        post.find("author").text() + ")</span>";
                }

                postTitleDiv.append(toAppend);
                postTextDiv.append(extractContent(post));

                postDiv.data("post",post);
                postDiv.data("feedLink",feedLink);
                postDiv.click(startTogglePostReadness);

                if ($.inArray(
                    computeGuidIshThingFromItem(feedLink,post),unread) 
                        == -1) {
                    postTitleDiv.find("a").addClass("read");
                    postTitleDiv.find("img.postDot").attr(
                        "src","images/greySquare.png");
                    postTextDiv.addClass("read");
                    postDiv.addClass("read");
                } else {
                    postTitleDiv.find("a").addClass("unread");
                    postTitleDiv.find("img.postDot").attr(
                        "src","images/blueSquare.png");
                    postTextDiv.addClass("unread");
                    postDiv.addClass("unread");
                }

                postDiv.append(postTitleDiv);
                postDiv.append(postTextDiv);
                postsDiv.append(postDiv);
            });
            postsDiv.append(
             "<span><button id=markAllRead2>Mark all read</button></span>" +
             "<span><button id=markAllUnread2>Mark all unread</button></span>");
            $("#markAllRead2").click(markAllPostsRead);
            $("#markAllUnread2").click(markAllPostsUnread);
            postsDiv.scrollTop(0);
        }).fail(function() { 
            var password = $.cookies.get("anyfeedPassword");
            $.ajax({
                url : "login.php?username=" + escape(username) + "&password=" +
                    escape(password),
                type : "GET",
                dataType : "text"
            }).done(function(data) {
                if (data.indexOf("logged in") == 0) {
                    $("#logindialog").css("visibility","hidden");
                    $.cookies.set("anyfeedUsername", username, 
                        { expiresAt: new Date(2099,1,1)} );
                    $.cookies.set("anyfeedPassword", password, 
                        { expiresAt: new Date(2099,1,1)} );
                    $("#apptitle").text("anyfeed - " + username);
                    startLoadFeedsFromServer();
                } else {
                    $("#loginMessage").text("Login failed -- try again.");
                    promptForLogin();
                }
            });
        });
    };
};

// ------------------------- toggle readness -----------------------------
var markAllPostsRead = function() {
    var postDivs = $("#posts > .post");
    restartRefreshTimer();
    postDivs.each(function() { 
        if ($(this).hasClass("unread")) {
            $(this).trigger("click");
        }
    });
};

var markAllPostsUnread = function() {
    var postDivs = $("#posts > .post");
    restartRefreshTimer();
    postDivs.each(function() { 
        if ($(this).hasClass("read")) {
            $(this).trigger("click");
        }
    });
};

var startTogglePostReadness = function() {
    var guid = computeGuidIshThingFromItem(
        $(this).data("feedLink"), $(this).data("post"));
    restartRefreshTimer();
    $.ajax({
        url : "togglePostReadness.php",
        data : JSON.stringify(guid),
        type : "POST",
        dataType : "text",
        contentType : "text/json"
    }).done(finishTogglePostReadness($(this)));
};

var finishTogglePostReadness = function(postDiv) {

    return function(readness) {

        var postTitleDiv = postDiv.find(".posttitle"),
            postTextDiv = postDiv.find(".posttext");
        if (readness.indexOf("read") == 0) {
            postTitleDiv.find("a").addClass("read");
            postTitleDiv.find("a").removeClass("unread");
            postTitleDiv.find("img.postDot").attr("src",
                "images/greySquare.png");
            postTextDiv.addClass("read");
            postTextDiv.removeClass("unread");
            postDiv.addClass("read");
            postDiv.removeClass("unread");
            decrementUnreadCountFor(loadedFeed);
            unreadPostsCounter.incrementBy(-1);
        } else {
            postTitleDiv.find("a").addClass("unread");
            postTitleDiv.find("a").removeClass("read");
            postTitleDiv.find("img.postDot").attr("src",
                "images/blueSquare.png");
            postTextDiv.addClass("unread");
            postTextDiv.removeClass("read");
            postDiv.addClass("unread");
            postDiv.removeClass("read");
            incrementUnreadCountFor(loadedFeed);
            unreadPostsCounter.incrementBy(1);
        }
    };
};

var markFeedReadFromFeedsDiv = function() {
    var url = hoveredFeed.url;
    restartRefreshTimer();
    alert("not implemented yet.");
/*
    $.ajax({
        url : "removeFeed.php?url=" + escape(hoveredFeed.url),
        type : "GET",
        dataType : "text"
    }).done(function(data) {
        if (data.indexOf("unsubscribed") == 0) {
            unreadPostsCounter.incrementBy(-hoveredFeed.unreadCount);
            hoveredFeed.feedDiv.remove();
        } else {
            alert("Unable to unsubscribe from " + hoveredFeed.title + "!");
        }
    });
*/
};

var markFeedUnreadFromFeedsDiv = function() {
    var url = hoveredFeed.url;
    restartRefreshTimer();
    alert("not implemented yet.");
};

// ----------------------------- util ----------------------------------
var extractItemLink = function(item) {
    var tryAtom = item.find("link[href]");
    if (tryAtom.size() > 0) {
        return tryAtom.first().attr("href");
    } else {
        return item.find("link").text();
    }
}

var extractContent = function(item) {
    var tryRss = item.find("description");
    if (tryRss.size() > 0) {
        return tryRss.text();
    } else {
        return item.find("content").text();
    }
}

var computeGuidIshThingFromItem = function(feedLink, item) {
    var guidMaybe = item.find("guid");
    if (guidMaybe.length == 0) {
        guidMaybe = item.find("id");
    }
    if (guidMaybe.length != 0) {
        return guidMaybe.first().text();
    } else {
        return feedLink + extractItemLink(item);
    }
};

var unreadPostsCounter = function() {
    var numUnreadPosts = 0,
        updateDisplay = function() {
            $("#apptitle").text("anyfeed - " + username + 
                " (" + numUnreadPosts + ")");
            $("title").text("anyfeed " +
                " (" + numUnreadPosts + ")");
        };

    return {
        set : function(n) {
            numUnreadPosts = n;
            updateDisplay();
        },
        incrementBy : function(n) {
            numUnreadPosts = numUnreadPosts + n;
            updateDisplay();
        }
    };
}();

init();

});
