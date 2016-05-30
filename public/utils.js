function getVideoStateAsString(videoStateAsInt) {
  var whatToReturn = "":
  switch (videoStateAsInt) {
    case 0 : whatToReturn = "ended";
    break;
    case 1 : whatToReturn = "PLAYING";
    break;
    case 2 : whatToReturn = "PAUSED";
    break;
    case 3 : whatToReturn = "BUFFERING";
    break;
    case 4 : whatToReturn = "CUED";
    break;
  }
  return whatToReturn;
}

// document.addEventListener('DOMContentLoaded', function() {
//   var checkPageButton = document.getElementById('checkPage');
//   checkPageButton.addEventListener('click', function() {
//
//     chrome.tabs.getSelected(null, function(tab) {
//       d = document;
//
//       var f = d.createElement('form');
//       f.action = 'http://gtmetrix.com/analyze.html?bm';
//       f.method = 'post';
//       var i = d.createElement('input');
//       i.type = 'hidden';
//       i.name = 'url';
//       i.value = tab.url;
//       f.appendChild(i);
//       d.body.appendChild(f);
//       f.submit();
//     });
//   }, false);
// }, false);
