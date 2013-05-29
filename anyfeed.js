
$(document).ready(function() {


// Array of feed objects, each of which has a title, and link, a url, and
//   possibly cached contents and unread count.
//   The title is the human-readable name.
//   The link is the URL to the human-readable blog.
//   The url is the actual URL of the RSS feed (non-human-readable).
//   The contents is the jQuery-ified XML-parsed feed response.
//   The unreadCount is an integer of the number of unread posts.
var feedsArray = [];

// A hashtable of those very same feed objects, indexed by url. (More
//   precisely, an object whose property names are urls and whose property
//   values are feed objects.)
var feedsHash = {};

// The feed whose posts are currently in the posts div.
var loadedFeed;


// -------------------------------- init ----------------------------------
var init = function() {
    $("#addnewfeed").click(addNewlyTypedFeed);
    $("#import").click(importOpml);
    var username = $.cookie("anyfeedUsername"),
        password = $.cookie("anyfeedPassword");
    if (username == undefined) {
        promptForLogin();
    } else {
        tryLoggingInToServer(username, password);
    }
};

var tryLoggingInToServer = function(username, password) {
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/anyfeed/login.php?" +
            "username=" + escape(username) + "&password=" +
            escape(password),
        type : "GET",
        dataType : "text"
    }).done(function(data) {
        if (data.indexOf("logged in") == 0) {
            $("#logindialog").css("visibility","hidden");
            $.cookie("anyfeedUsername", username);
            $.cookie("anyfeedPassword", password);
            $("#apptitle").text("anyfeed - " + username);
            startLoadFeedsFromServer();
        } else {
            promptForLogin();
        }
    });
};

var promptForLogin = function() {
    $("#loginSubmit").click(function() {
        var username = $("#username").val(),
            password = CryptoJS.SHA1($("#password").val());
        tryLoggingInToServer(username, password);
    });
    $("#logindialog").css("visibility","visible");
};


// ----------------------------- import OPML ------------------------------
var importOpml = function() {
    var url = prompt("Enter the URL to your OPML file (in XML format):");
    if (url == "") {
        url = "http://rosemary.umw.edu/~stephen/anyfeed/subscriptions.xml";
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
    var feed = $(this).data("feed"),
        oldtitle = feed.title,
        newtitle = prompt("Enter new feed title:", oldtitle);
    if (newtitle == null) return;
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/anyfeed/renameFeed.php?url="+
            escape(feed.url) + "&title=" + escape(newtitle),
        type : "GET",
        dataType : "text"
    }).done(function(newtitle) {
        feed.title = newtitle;
        updateFeedInFeedsDiv(feed);
        if (feed == loadedFeed) {
            $("#poststitle").text(newtitle + " (" + oldtitle + ")");
        }
    });
};

var startUpdateUnreadCountFromCachedContents = function(feed) {
    var feedTitleSpan = feed["feedTitleSpan"],
        cachedContent = feed["contents"],
        guids = [];

    $(cachedContent).find("item > guid").each(function() {
        guids.push($(this).text());
    });

    $.ajax({
        url : 
          "http://rosemary.umw.edu/~stephen/anyfeed/whichGuidsAreUnread.php",
        data : JSON.stringify(guids),
        type : "POST",
        dataType : "json",
        contentType : "text/json"
    }).done(
        function finishUpdateUnreadCountFromCachedContents(data) {
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
    feedsArray = [];
    feedsHash = {};
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/anyfeed/getAllFeeds.php",
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
                link : feedElem.find("feedlink").text(),
            };
        addFeedToMemoryAndDisplay(feed);
    });
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
            addFeedToServer(newfeed);
        }
    };
}

var alreadySubscribedTo = function(url) {
    return feedsHash.hasOwnProperty(url);
};

var addFeedToServer = function(newfeed) {
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/anyfeed/addFeed.php",
        type : "POST",
        data : JSON.stringify(newfeed),
        contentType : "text/json",
        dataType : "xml"
    });
};

var addFeedToMemoryAndDisplay = function(newfeed) {

    // 1a. Create a feed div for this new feed.
    var feedDiv = $("<div>"),       // (create a new feed div)
        feedTitleSpan = $("<span>"),  // (create a new feed title div)
        feedButtonSpan = $("<span>"), // (create a new feed button div)
        feedsDiv = $("#feeds");     // (get the existing feeds div)

    feedTitleSpan.addClass("feedtitle");
    feedTitleSpan.text(newfeed.title);
    feedTitleSpan.data("feed",newfeed);
    feedTitleSpan.click(startPopulatePostsDivWithFeedContents);

    feedButtonSpan.addClass("feedbutton");
    feedButtonSpan.html("<img src=dot.png />");
    feedButtonSpan.data("feed",newfeed);
    feedButtonSpan.click(renameFeed);

    // 1b. String together these new divs.
    feedDiv.append(feedButtonSpan);
    feedDiv.append(feedTitleSpan);
    feedsDiv.append(feedDiv);

    // 2. Add this feed to the data structures (feedsArray, feedsHash).
    newfeed["feedDiv"] = feedDiv;
    newfeed["feedButtonSpan"] = feedButtonSpan;
    newfeed["feedTitleSpan"] = feedTitleSpan;
    feedsArray.push(newfeed);
    feedsHash[newfeed.url] = newfeed;

    // 3. Update the feed with its "unread" count.
    if (newfeed.contents === undefined) {
        // Cache empty for this feed. Fill it.        
        loadFeedThenCall(newfeed.url, 
            function(data) {
                newfeed.contents = $(data);
                startUpdateUnreadCountFromCachedContents(newfeed);
            }
        );
    } else {
        startUpdateUnreadCountFromCachedContents(newfeed);
    }
};

var loadFeedThenCall = function(url, callback) {
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/rssproxy.php?url=" +
            escape(url),
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

        var guids = [];

        $(feedContents).find("item > guid").each(function() {
            guids.push($(this).text());
        });

        $.ajax({
            url : 
            "http://rosemary.umw.edu/~stephen/anyfeed/whichGuidsAreUnread.php",
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
                postDiv.click(startTogglePostReadness);

                if ($.inArray(post.find("guid").text(),unread) == -1) {
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
    var post = $(this).data("post");
    $.ajax({
        url :
        "http://rosemary.umw.edu/~stephen/anyfeed/togglePostReadness?guid=" +
            escape(post.find("guid").text()),
        type : "GET",
        dataType : "text"
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


init();

});
