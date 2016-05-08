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
