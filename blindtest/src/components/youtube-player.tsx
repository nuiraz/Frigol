import { useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { CONTROLLER_SOURCE, PLAYER_VARS } from './player-controller';
import type { PlayerEvent, PlayerHandle, YouTubePlayerProps } from './youtube-player.types';

// Une origine https est nécessaire : sans référent, YouTube refuse la lecture (erreurs 152/153).
const BASE_URL = 'https://www.youtube.com';

function buildHtml() {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden}#p{width:100%;height:100%}</style>
</head><body><div id="p"></div><script>
function send(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
var ctl = null, queue = [];
window.__cmd = function (c) { if (!ctl) { queue.push(c); return; } ctl[c.name].apply(null, c.args); };
function makeController(player, send) { ${CONTROLLER_SOURCE} }
var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
window.onYouTubeIframeAPIReady = function () {
  var player = new YT.Player('p', {
    width: '100%', height: '100%',
    playerVars: Object.assign(${JSON.stringify(PLAYER_VARS)}, { origin: location.origin }),
    events: {
      onReady: function () {
        ctl = makeController(player, send);
        send({ type: 'ready' });
        queue.splice(0).forEach(window.__cmd);
      },
      onStateChange: function (e) { if (ctl) ctl.onState(e.data); },
      onError: function (e) { if (ctl) ctl.onError(e.data); }
    }
  });
};
</script></body></html>`;
}

const HTML = buildHtml();

export function YouTubePlayer({ ref, onEvent, visible = false, style }: YouTubePlayerProps) {
  const webview = useRef<WebView>(null);

  useImperativeHandle(ref, (): PlayerHandle => {
    const call = (name: string, ...args: unknown[]) =>
      webview.current?.injectJavaScript(`window.__cmd(${JSON.stringify({ name, args })});true;`);
    return {
      prepare: (...a) => call('prepare', ...a),
      segment: (...a) => call('segment', ...a),
      stop: () => call('stop'),
      playlist: (id) => call('playlist', id),
    };
  }, []);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      onEvent?.(JSON.parse(e.nativeEvent.data) as PlayerEvent);
    } catch {}
  };

  return (
    <View style={[visible ? styles.visible : styles.hidden, style]} pointerEvents="none">
      <WebView
        ref={webview}
        source={{ html: HTML, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        scrollEnabled={false}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  visible: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
  },
  // YouTube refuse de lire dans un lecteur de moins de 200 × 200 px : il reste à cette taille, presque transparent.
  hidden: {
    position: 'absolute',
    width: 200,
    height: 200,
    opacity: 0.01,
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  webview: { flex: 1, backgroundColor: '#000' },
});
