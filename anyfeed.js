
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

var init = function() {
    startLoadFeedsFromServer();
    $("#addnewfeed").click(startAddNewFeed);
};

var addFeedToMemoryAndDisplay = function(newfeed) {

    // 1a. Create a feed div for this new feed.
    var feedDiv = $("<div>"),    // (create a new feed div)
        feedsDiv = $("#feeds");  // (get the existing feeds div)
    feedDiv.addClass("feedtitle");
    feedDiv.text(newfeed.title);
    feedDiv.data("feed",newfeed);
    feedDiv.click(startPopulatePostsDivWithFeedContents);

    // 1b. Add this feed div to the feeds div.
    feedsDiv.append(feedDiv);

    // 2. Add this feed to the data structures (feedsArray, feedsHash).
    newfeed["feedDiv"] = feedDiv;
    feedsArray.push(newfeed);
    feedsHash[newfeed.url] = newfeed;

    // 3. Update the feed with its "unread" count.
    if (newfeed.contents === undefined) {
        // Cache empty for this feed. Fill it.        
        loadFeedThenCall(newfeed.url, (function(feed) {
            return function(data) {
                feed.contents = $(data);
                startUpdateUnreadCountFromCachedContents(feed);
            };
        })(newfeed));
    } else {
        startUpdateUnreadCountFromCachedContents(newfeed);
    }
};

var startUpdateUnreadCountFromCachedContents = function(feed) {
    var feedDiv = feed["feedDiv"],
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
    if (unreadCount == 0) {
        feed.feedDiv.html("<span class=feedcaughtup>" + feed.title +
            "</span>");
        feed.feedDiv.append(" <span class=zerounreadcount>(0)");
    } else {
        feed.feedDiv.html("<span class=feednotcaughtup>" + feed.title +
            "</span>");
        feed.feedDiv.append(" <span class=nonzerounreadcount>(" + 
            unreadCount + ")</span>");
    }
};

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


var startAddNewFeed = function() {

    var url = $("#newfeedurl").val();
    loadFeedThenCall(url, 
        (function(url) { 
            return function finishAddNewFeed(data) {

                var title = $(data).find("channel > title").text(),
                    link = $(data).find("channel > link").text(),
                    newfeed = {
                        title : title,
                        link : link,
                        url : url,
                        contents : $(data)
                    };
                addFeedToMemoryAndDisplay(newfeed);

                if (alreadySubscribedTo(url)) {
                    alert("Already subscribed to " + url + "!");
                } else {
                    addFeedToServer(newfeed);
                    //startPopulatePostsDivWithFeedContents(url);  -- show the
                    //  posts from this newly-added feed right away? maybe...
                }
            };
        })(url));
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

var loadFeedThenCall = function(url, callback) {
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/rssproxy.php?url=" +
            escape(url),
        type : "GET",
        dataType : "xml"
    }).done(callback);
};

var startPopulatePostsDivWithFeedContents = function() {
    var url = $(this).data("feed").url;
    loadedFeed = $(this).data("feed");
    loadFeedThenCall(url, continuePopulatePostsDivWithFeedContents);
};

var continuePopulatePostsDivWithFeedContents = function(data) {

    var guids = [];

    $(data).find("item > guid").each(function() {
        guids.push($(this).text());
    });

    $.ajax({
        url : 
          "http://rosemary.umw.edu/~stephen/anyfeed/whichGuidsAreUnread.php",
        data : JSON.stringify(guids),
        type : "POST",
        dataType : "json",
        contentType : "text/json"
    }).done((function(feedContents) {

        return function finishPopulatePostsDivWithFeedContents(data) {

            var title = $(feedContents).find("channel > title").text(),
                postsDiv = $("#posts"),
                unread = $(data);
            

            postsDiv.html("<div class=poststitle>" + title + "</div>");

            $(feedContents).find("item").each(function() {

                var post = $(this),
                    postDiv = $("<div>"),
                    postTitleDiv = $("<div>"),
                    postTextDiv = $("<div>"),
                    toAppend = "";

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
                } else {
                    postTitleDiv.find("a").addClass("unread");
                    postTextDiv.addClass("unread");
                }

                postDiv.append(postTitleDiv);
                postDiv.append(postTextDiv);
                postsDiv.append(postDiv);

            });
        };
    })(data));
};

var startTogglePostReadness = function() {
    var post = $(this).data("post");
    $.ajax({
        url :
        "http://rosemary.umw.edu/~stephen/anyfeed/togglePostReadness?guid=" +
            escape(post.find("guid").text()),
        type : "GET",
        dataType : "text"
    }).done((function(postDiv) {

        return function finishTogglePostReadness(data) {

            var postTitleDiv = postDiv.find(".posttitle"),
                postTextDiv = postDiv.find(".posttext");
            if (data.indexOf("read") == 0) {
                postTitleDiv.find("a").addClass("read");
                postTitleDiv.find("a").removeClass("unread");
                postTextDiv.addClass("read");
                postTextDiv.removeClass("unread");
                decrementUnreadCountFor(loadedFeed);
            } else {
                postTitleDiv.find("a").addClass("unread");
                postTitleDiv.find("a").removeClass("read");
                postTextDiv.addClass("unread");
                postTextDiv.removeClass("read");
                incrementUnreadCountFor(loadedFeed);
            }
        };
    })($(this)));
};

var alreadySubscribedTo = function(url) {
    return false;
};



init();

});
