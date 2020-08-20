// はてなブックマークの ${feedUrl} カテゴリの ${thresholdOfBookmarkCount} ブクマ以上の記事を通知するスクリプト
// 通知ヒストリー参考: https://qiita.com/tomboyboy/items/6a15ab1a4838bd6b7f9d
// GoogleAppsScriptではてブのRSSをパースする参考: https://yatta47.hateblo.jp/entry/2019/06/18/210608

var jsonName = "history.json";
var feedURL = "https://b.hatena.ne.jp/hotentry/it.rss";
var thresholdOfBookmarkCount = 100;

function getFile() {
  var query = 'title = "' + jsonName + '"';
  var files = DriveApp.searchFiles(query);
  if (files.hasNext()) {
    return files.next();
  }
  return DriveApp.createFile(jsonName, "");
}

function readJson() {
  var file = getFile(jsonName);
  var content = file.getBlob().getDataAsString();
  if (!content) return {};

  var json = JSON.parse(content);
  return json;
}

function writeJson(content) {
  var contentJson = JSON.stringify(content);
  var file = getFile(jsonName);
  file.setContent(contentJson);
}

function getHistories()
{
  var data = readJson();
  var histories = data["histories"];
  if (!histories) return [];

  for (var key in histories) {
    Logger.log('Key: %s', key, histories[key]);
  }
  
  return histories;
}

function setHistories(histories)
{
  var data = {
    histories: histories
  };
  
  writeJson(data);
}

function resetHistories()
{
  setHistories([]);
}

function main()
{
  var results = getHatenaRss(feedURL);
  for (var key in results)
  {
    var item = results[key];
    var message = convertItemToMessage(item);
    // postToChatwork(message);
  }
}

function convertItemToMessage(item)
{
  var message = Utilities.formatString('[info]%s[hr]%s[hr]%s[hr]%s[/info]', item.title, item.link, item.bookmarkCommentListPageUrl, item.description);
  return message;
}

// chatworkに投稿する
function postToChatwork(message)
{
  // 参考
}


function getHatenaRss(feedUrl)
{
  var xml = UrlFetchApp.fetch(feedUrl).getContentText();
  var document = XmlService.parse(xml);
  var root = document.getRootElement();
  var rss = XmlService.getNamespace('http://purl.org/rss/1.0/');
  var dc = XmlService.getNamespace('dc', 'http://purl.org/dc/elements/1.1/');
  var hatena = XmlService.getNamespace('hatena', 'http://www.hatena.ne.jp/info/xmlns#');
  
  var items = root.getChildren('item', rss);
  
  var results = [];
  var histories = getHistories();
  
  for (var i = 0; i < items.length; i++) {
    var item = {}
    
    item.title = items[i].getChild('title', rss).getText();
    item.link = items[i].getChild('link', rss).getText();
    item.description = items[i].getChild('description', rss).getText();
    item.date = items[i].getChild('date', dc).getText();
    var bookmarkcountString = items[i].getChild('bookmarkcount', hatena).getText();
    item.bookmarkCount = parseInt(bookmarkcountString, 10);
    item.bookmarkCommentListPageUrl = items[i].getChild('bookmarkCommentListPageUrl', hatena).getText();
    
    
    if (thresholdOfBookmarkCount < item.bookmarkCount)
    {
      if (histories.indexOf(item.link) == -1)
      {
        histories.push(item.link);
        results.push(item);
        Logger.log(item);
      }
    }
  }
  
  setHistories(histories);
  return results;
}
