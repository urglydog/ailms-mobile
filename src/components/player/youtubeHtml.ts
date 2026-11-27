/** Mã video YouTube hợp lệ gồm đúng 11 ký tự chữ, số, gạch dưới, gạch ngang. Kiểm trước khi nhúng vào trang. */
export function isValidYoutubeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

/**
 * Trang HTML nhúng trình phát YouTube (IFrame API) chạy trong WebView, giống cách bản web `fe` làm
 * (`useYouTubeDualPlayerSync`): ẩn điều khiển gốc, ứng dụng tự vẽ thanh điều khiển.
 * Trang gửi về ứng dụng: `init` (đã nạp script), `ready`, `tick` (mỗi 250ms: thời gian, độ dài, trạng thái),
 * `state`, `error`. Ứng dụng gửi lệnh qua `window.__cmd(tên, giá trị)`: play, pause, seek, rate, mute.
 */
export function buildYouTubeHtml(videoId: string, startSec: number): string {
  const start = Math.max(0, Math.floor(Number.isFinite(startSec) ? startSec : 0));
  const vid = JSON.stringify(videoId);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
  #p { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="p"></div>
<script>
  var queue = [];
  var ready = false;
  var yt = null;
  function post(o) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {}
  }
  function run(c, a) {
    try {
      if (c === 'play') yt.playVideo();
      else if (c === 'pause') yt.pauseVideo();
      else if (c === 'seek') yt.seekTo(a, true);
      else if (c === 'rate') yt.setPlaybackRate(a);
      else if (c === 'mute') { if (a) yt.mute(); else yt.unMute(); }
    } catch (e) {}
  }
  window.__cmd = function (c, a) {
    if (!ready) { queue.push([c, a]); return; }
    run(c, a);
  };
  function onYouTubeIframeAPIReady() {
    yt = new YT.Player('p', {
      videoId: ${vid},
      width: '100%',
      height: '100%',
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, start: ${start} },
      events: {
        onReady: function () {
          ready = true;
          for (var i = 0; i < queue.length; i++) run(queue[i][0], queue[i][1]);
          queue = [];
          post({ type: 'ready' });
        },
        onStateChange: function (e) { post({ type: 'state', s: e.data }); },
        onError: function (e) { post({ type: 'error', c: e.data }); }
      }
    });
  }
  setInterval(function () {
    if (!ready) return;
    try { post({ type: 'tick', t: yt.getCurrentTime(), d: yt.getDuration(), s: yt.getPlayerState() }); } catch (e) {}
  }, 250);
  setTimeout(function () { if (!ready) post({ type: 'error', c: -1 }); }, 15000);
  post({ type: 'init' });
</script>
<script src="https://www.youtube.com/iframe_api"></script>
</body>
</html>`;
}
