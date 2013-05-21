
$(document).ready(function() {


// Array of feed objects, each of which has a title, and link, and a url.
//   The title is the human-readable name.
//   The link is the URL to the human-readable blog.
//   The url is the actual URL of the RSS feed (non-human-readable).
feeds = [];


init = function() {

    startLoadFeedsFromServer();
    $("#addnewfeed").click(startAddNewFeed);
};

startLoadFeedsFromServer = function() {
    feeds = [];
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/rssreader/getAllFeeds.php",
        type : "GET",
        dataType : "xml"
    }).done(finishLoadFeedsFromServer);
};

finishLoadFeedsFromServer = function(data) {

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

appendFeedToFeedsDiv = function(feed) {
    var feedsDiv = $("#feeds");
    feedsDiv.append("<div class=feedtitle>" + 
        "<a href=\"" + feed.link + "\">" + feed.title + "</a>" +
        "</div>");
};

startAddNewFeed = function() {

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

addFeedToServer = function(newfeed) {
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/rssreader/addFeed.php",
        type : "POST",
        data : JSON.stringify(newfeed),
        contentType : "text/json",
        dataType : "xml"
    });
};

startPopulatePostsDivWithFeedContents = function(url) {
    loadFeedThenCall(url, finishPopulatePostsDivWithFeedContents);
}

loadFeedThenCall = function(url, callback) {
    $.ajax({
        url : "http://rosemary.umw.edu/~stephen/rssproxy.php?url=" +
            escape(url),
        type : "GET",
        dataType : "xml"
    }).done(callback);
};

finishPopulatePostsDivWithFeedContents = function(data) {

    var title = $(data).find("channel > title").text(),
        postsDiv = $("#posts");
    

    postsDiv.html("<div class=poststitle>" + title + "</div>");

    $(data).find("item").each(function() {
        var post = $(this);
        var toAppend = "";

        toAppend += "<div>" + 
            "<div class=posttitle>" + 
                "<a href=\"" + post.find("link").text() + 
                    "\" target=\"_blank\">" + 
                    post.find("title").text() + "</a>";

        if (post.find("author").text()) {
            toAppend += " <span class=postauthor>(" + 
                post.find("author").text() + ")</span>";
        }

        toAppend += "</div>";
        toAppend += "<div class=posttext>" + post.find("description").text() + 
            "</div>" +
        "</div>";

        postsDiv.append(toAppend);
    });
};

alreadySubscribedTo = function(url) {
    return false;
};



init();

});
