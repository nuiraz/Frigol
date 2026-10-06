import { useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { CONTROLLER_SOURCE, PLAYER_VARS } from './player-controller';
import type { PlayerEvent, PlayerHandle, YouTubePlayerProps } from './youtube-player.types';

type Controller = Record<string, (...args: unknown[]) => void>;
type YTPlayer = { destroy: () => void };
type YTNamespace = {
  Player: new (el: HTMLElement, opts: object) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return apiPromise;
}

const makeController = new Function('player', 'send', CONTROLLER_SOURCE) as (
  player: unknown,
  send: (e: PlayerEvent) => void,
) => Controller;

export function YouTubePlayer({ ref, onEvent, visible = false, style }: YouTubePlayerProps) {
  const host = useRef<HTMLDivElement>(null);
  const ctl = useRef<Controller | null>(null);
  const queue = useRef<[string, unknown[]][]>([]);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    let player: YTPlayer | null = null;
    let cancelled = false;
    loadApi().then((YT) => {
      if (cancelled || !host.current) return;
      const mount = document.createElement('div');
      host.current.appendChild(mount);
      const send = (e: PlayerEvent) => onEventRef.current?.(e);
      player = new YT.Player(mount, {
        width: '100%',
        height: '100%',
        playerVars: { ...PLAYER_VARS, origin: window.location.origin },
        events: {
          onReady: () => {
            ctl.current = makeController(player, send);
            send({ type: 'ready' });
            for (const [name, args] of queue.current.splice(0)) ctl.current[name](...args);
          },
          onStateChange: (e: { data: number }) => ctl.current?.onState(e.data),
          onError: (e: { data: number }) => ctl.current?.onError(e.data),
        },
      });
    });
    return () => {
      cancelled = true;
      ctl.current?.stop();
      ctl.current = null;
      player?.destroy();
    };
  }, []);

  useImperativeHandle(ref, (): PlayerHandle => {
    const call = (name: string, ...args: unknown[]) => {
      if (ctl.current) ctl.current[name](...args);
      else queue.current.push([name, args]);
    };
    return {
      prepare: (...a) => call('prepare', ...a),
      segment: (...a) => call('segment', ...a),
      stop: () => call('stop'),
      playlist: (id) => call('playlist', id),
    };
  }, []);

  return (
    <View style={[visible ? styles.visible : styles.hidden, style]} pointerEvents="none">
      <div ref={host} style={{ width: '100%', height: '100%' }} />
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
  hidden: {
    position: 'absolute',
    width: 200,
    height: 200,
    opacity: 0.01,
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
});
