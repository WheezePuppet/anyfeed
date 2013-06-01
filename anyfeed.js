
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

// -------------------------------- init ----------------------------------
var init = function() {
    var username = $.cookies.get("anyfeedUsername"),
        password = $.cookies.get("anyfeedPassword");
    $("#renamefeed").click(renameFeed);
    $("#removefeed").click(removeFeed);
    $("#refresh").click(refreshFeeds);
    $("#addnewfeed").click(addNewlyTypedFeed);
    $("#import").click(importOpml);
    $("#logout").click(logout);
    if (username == undefined) {
        promptForLogin();
    } else {
        tryLoggingInToServer(username, password);
    }
};

var tryLoggingInToServer = function(username, password) {
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
            $("#logout").css("visibility","visible");
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
        var username = $("#username").val(),
            password = CryptoJS.SHA1($("#password").val()).toString(
                                                        CryptoJS.enc.Base64);
        tryLoggingInToServer(username, password);
    };
    $("#password").keyup(function(event) {
        if (event.keyCode == 13) {
            getDataAndDoLogin();
        }
    });
    $("#loginSubmit").click(getDataAndDoLogin);
    $("#logindialog").css("visibility","visible");
};

var logout = function() {
    var username = $.cookies.get("anyfeedUsername");
    $.cookies.del("anyfeedUsername"); // doesn't work. $@%&*!!
    $.cookies.del("anyfeedPassword");
    $.ajax({
        url : "logout.php?username=" + escape(username),
        type : "GET",
        dataType : "text"
    }).done(function(data) {
        $("#logout").css("visibility","hidden");
        $("#apptitle").text("anyfeed");
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

// ---------------------- remove feed (unsubscribe) ------------------------
var removeFeed = function() {
    var url = hoveredFeed.url;
    $.ajax({
        url : "removeFeed.php?url=" + escape(hoveredFeed.url),
        type : "GET",
        dataType : "text"
    }).done(function(data) {
        if (data.indexOf("unsubscribed") == 0) {
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
        channelLink = $(cachedContent).find("channel > link").first();

    $(cachedContent).find("item").each(function() {
        var guidIshThing = computeGuidIshThingFromItem(channelLink, $(this));
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
    } else {
        feed.feedTitleSpan.html("<span class=feednotcaughtup>" + feed.title +
            "</span>");
        feed.feedTitleSpan.append(" <span class=nonzerounreadcount>(" + 
            feed.unreadCount + ")</span>");
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
    for (var i=1, len=feedsArray.length; i<len; i++) {
        var feed = feedsArray[i];
        delete feed.contents;
        feed.feedDiv.removeClass("loading2");
        feed.feedDiv.removeClass("loading3");
        feed.feedDiv.addClass("loading");
        feed.feedTitleSpan.html(feed.title);
        updateUnreadCountForFeed(feed);
    }
};



// ------------------------------ add feeds -------------------------------
var addNewlyTypedFeed = function() {
    var url = $("#newfeedurl").val();
    startAddNewFeed(url);
    $("#newfeedurl").val("");
};

// (title will be null unless this is an import)
var startAddNewFeed = function(url, newtitle) {
    loadFeedThenCall(url, finishAddNewFeed(url, newtitle));
};

var finishAddNewFeed = function(url, newtitle) { 
    return function(data) {
        var title = newtitle == null ? 
                $(data).find("channel > title").text() : newtitle,
            link = $(data).find("channel > link").text(),
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
    feedButtonSpan.html("<img src=dot.png />");
    feedButtonSpan.data("feed",newfeed);
    feedButtonSpan.addpopupmenu("feedpopupmenu");
    feedButtonSpan.mouseenter(function() { hoveredFeed = newfeed; });

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
    if (loadedFeed != null) {
        loadedFeed.feedTitleSpan.removeClass("activeFeed");
    }
    loadedFeed = $(this).data("feed");
    loadedFeed.feedTitleSpan.addClass("activeFeed");
    loadFeedThenCall(url, continuePopulatePostsDivWithFeedContents(url));
};

var continuePopulatePostsDivWithFeedContents = function(url) {

    return function(feedContents) {

        var guids = [],
            channelLink = $(feedContents).find("channel > link").first();

        $(feedContents).find("item").each(function() {
            var guidIshThing = 
                computeGuidIshThingFromItem(channelLink, $(this));
            guids.push(guidIshThing);
        });

        $.ajax({
            url : "whichGuidsAreUnread.php",
            data : JSON.stringify(guids),
            type : "POST",
            dataType : "json",
            contentType : "text/json"
        }).done(function finishPopulatePostsDivWithFeedContents(data) {

            var title = $(feedContents).find("channel > title").text(),
                postsDiv = $("#posts"),
                unread = $(data),
                feed = feedsHash[url];
        
            if (feed.title != null && feed.title != title) {
                title = feedsHash[url].title + " (" + title + ")";
            }

            postsDiv.html("<div style=\"vertical-align:middle;\">" +
                "<span id=poststitle>" + title + "</span>" +
                "<span><button id=markAllRead>Mark all read</button></span>" +
                "<span><button id=markAllUnread>Mark all unread</button></span>" +
                "</div>");
            $("#markAllRead").click(markAllPostsRead);
            $("#markAllUnread").click(markAllPostsUnread);

            if (feed.unreadCount == 0) {
                $("#poststitle").addClass("feedcaughtup");
            } else {
                $("#poststitle").addClass("feednotcaughtup");
            }

            $(feedContents).find("item").each(function() {

                var post = $(this),
                    postDiv = $("<div>"),
                    postTitleDiv = $("<div>"),
                    postTextDiv = $("<div>"),
                    toAppend = "";

                postDiv.addClass("post");
                postTitleDiv.addClass("posttitle");
                postTextDiv.addClass("posttext");
                
                toAppend += 
                    "<a href=\"" + post.find("link").text() + 
                        "\" target=\"_blank\">" + 
                        post.find("title").text() + "</a>";

                if (post.find("author").text()) {
                    toAppend += " <span class=postauthor>(" + 
                        post.find("author").text() + ")</span>";
                }

                postTitleDiv.append(toAppend);
                postTextDiv.append(post.find("description").text());

                postDiv.data("post",post);
                postDiv.data("channelLink",channelLink);
                postDiv.click(startTogglePostReadness);

                if ($.inArray(
                    computeGuidIshThingFromItem(channelLink,post),unread) 
                        == -1) {
                    postTitleDiv.find("a").addClass("read");
                    postTextDiv.addClass("read");
                    postDiv.addClass("read");
                } else {
                    postTitleDiv.find("a").addClass("unread");
                    postTextDiv.addClass("unread");
                    postDiv.addClass("unread");
                }

                postDiv.append(postTitleDiv);
                postDiv.append(postTextDiv);
                postsDiv.append(postDiv);
            });
        });
    };
};

// ------------------------- toggle readness -----------------------------
var markAllPostsRead = function() {
    var postDivs = $("#posts > .post");
    postDivs.each(function() { 
        if ($(this).hasClass("unread")) {
            $(this).trigger("click");
        }
    });
};

var markAllPostsUnread = function() {
    var postDivs = $("#posts > .post");
    postDivs.each(function() { 
        if ($(this).hasClass("read")) {
            $(this).trigger("click");
        }
    });
};

var startTogglePostReadness = function() {
    var guid = computeGuidIshThingFromItem($(this).data("channelLink"),
        $(this).data("post"));
    $.ajax({
        url : "togglePostReadness",
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
            postTextDiv.addClass("read");
            postTextDiv.removeClass("unread");
            postDiv.addClass("read");
            postDiv.removeClass("unread");
            decrementUnreadCountFor(loadedFeed);
        } else {
            postTitleDiv.find("a").addClass("unread");
            postTitleDiv.find("a").removeClass("read");
            postTextDiv.addClass("unread");
            postTextDiv.removeClass("read");
            postDiv.addClass("unread");
            postDiv.removeClass("read");
            incrementUnreadCountFor(loadedFeed);
        }
    };
};

// ----------------------------- util ----------------------------------
var computeGuidIshThingFromItem = function(channelLink, item) {
    var guidMaybe = item.find("guid");
    if (guidMaybe.length != 0) {
        return guidMaybe.first().text();
    } else {
        return channelLink.text() + item.find("link").first().text();
    }
};

init();

});
