
$(document).ready(function() {


// Array of feed objects, each of which has a title, and link, and a url.
//   The title is the human-readable name.
//   The link is the URL to the human-readable blog.
//   The url is the actual URL of the RSS feed (non-human-readable).
var feeds = [];


var init = function() {

    startLoadFeedsFromServer();
    $("#addnewfeed").click(startAddNewFeed);
};

var startLoadFeedsFromServer = function() {
    feeds = [];
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/rssreader/getAllFeeds.php",
        type : "GET",
        dataType : "xml"
    }).done(finishLoadFeedsFromServer);
};

var finishLoadFeedsFromServer = function(data) {

    var feedsDiv = $("#feeds");
    feedsDiv.html("");

    $(data).find("feed").each(function() {
        var feedElem = $(this),
            feed = {
                title : feedElem.find("feedtitle").text(),
                url : feedElem.find("feedurl").text(),
                link : feedElem.find("feedlink").text(),
            };
        feeds.push(feed);
        appendFeedToFeedsDiv(feed);
    });
};

var appendFeedToFeedsDiv = function(feed) {

    var feedDiv = $("<div>");
    feedDiv.addClass("feedtitle");
    feedDiv.text(feed.title);
    feedDiv.data("feed",feed);
    feedDiv.click(startPopulatePostsDivWithFeedContents);

    var feedsDiv = $("#feeds");
    feedsDiv.append(feedDiv);
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
                        url : url
                    };
                feeds.push(newfeed);
                appendFeedToFeedsDiv(newfeed);

                if (alreadySubscribedTo(url)) {
                    alert("Already subscribed to " + url + "!");
                } else {
                    addFeedToServer(newfeed);
                    startLoadFeedsFromServer();
                    //startPopulatePostsDivWithFeedContents(url);  -- show the
                    //  posts from this newly-added feed right away? maybe...
                }
            };
        })(url));
};

var addFeedToServer = function(newfeed) {
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/rssreader/addFeed.php",
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
    loadFeedThenCall(url, continuePopulatePostsDivWithFeedContents);
};

var continuePopulatePostsDivWithFeedContents = function(data) {

    var guids = [];

    $(data).find("item > guid").each(function() {
        guids.push($(this).text());
    });

    $.ajax({
        url : 
          "http://rosemary.umw.edu/~stephen/rssreader/whichGuidsAreUnread.php",
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

                if ($.inArray(post.find("guid").text(),unread) == -1) {
                    postTitleDiv.find("a").addClass("read");
                    postTextDiv.addClass("read");
                } else {
                    postTitleDiv.find("a").addClass("unread");
                    postTextDiv.addClass("unread");
                }

//                postTextDiv.click(

                postDiv.append(postTitleDiv);
                postDiv.append(postTextDiv);
                postsDiv.append(postDiv);

            });
        };
    })(data));
};

var alreadySubscribedTo = function(url) {
    return false;
};



init();

});
