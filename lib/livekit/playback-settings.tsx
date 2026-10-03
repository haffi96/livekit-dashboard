"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRoomContext } from "@livekit/components-react";
import {
  type RemoteTrack,
  type RemoteTrackPublication,
  RoomEvent,
  Track,
} from "livekit-client";

/**
 * Viewer-side playback knobs that trade smoothness for latency.
 *
 * - `lowLatency`: ask Chrome to render each video frame as soon as it is
 *   decoded instead of holding it in the jitter buffer. Late frames freeze
 *   the picture rather than being smoothed over.
 * - `audioEnabled`: subscribe to and play remote audio. While audio is playing,
 *   Chrome delays video to keep it in sync with the audio jitter buffer, which
 *   is typically 50-100 ms, so this is off by default.
 */
export interface PlaybackSettings {
  lowLatency: boolean;
  audioEnabled: boolean;
  setLowLatency: (enabled: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
}

const PlaybackSettingsContext = createContext<PlaybackSettings>({
  lowLatency: true,
  audioEnabled: false,
  setLowLatency: () => {},
  setAudioEnabled: () => {},
});

export function usePlaybackSettings(): PlaybackSettings {
  return useContext(PlaybackSettingsContext);
}

export function PlaybackSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const room = useRoomContext();
  const [lowLatency, setLowLatency] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Keep audio subscriptions in step with the toggle. autoSubscribe is on, so
  // the server subscribes us to every audio track; unsubscribing stops the
  // packets instead of just muting the element.
  const applyAudioSubscription = useCallback(
    (publication: RemoteTrackPublication) => {
      if (publication.kind !== Track.Kind.Audio) {
        return;
      }
      if (publication.isSubscribed !== audioEnabled) {
        publication.setSubscribed(audioEnabled);
      }
    },
    [audioEnabled],
  );

  useEffect(() => {
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) {
        applyAudioSubscription(publication);
      }
    }

    const onPublication = (publication: RemoteTrackPublication) => {
      applyAudioSubscription(publication);
    };
    const onSubscribed = (
      _track: RemoteTrack,
      publication: RemoteTrackPublication,
    ) => {
      applyAudioSubscription(publication);
    };

    room.on(RoomEvent.TrackPublished, onPublication);
    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    return () => {
      room.off(RoomEvent.TrackPublished, onPublication);
      room.off(RoomEvent.TrackSubscribed, onSubscribed);
    };
  }, [room, applyAudioSubscription]);

  const value = useMemo<PlaybackSettings>(
    () => ({ lowLatency, audioEnabled, setLowLatency, setAudioEnabled }),
    [lowLatency, audioEnabled],
  );

  return (
    <PlaybackSettingsContext.Provider value={value}>
      {children}
    </PlaybackSettingsContext.Provider>
  );
}

/**
 * Chrome exposes two receiver-side knobs for the video jitter buffer:
 * the standard `jitterBufferTarget` and the older `playoutDelayHint`.
 * Setting both to 0 asks the browser to play frames out as soon as they are
 * complete. Clearing them restores Chrome's adaptive buffer.
 */
export function applyLowLatencyToReceiver(
  receiver: RTCRtpReceiver | undefined,
  enabled: boolean,
) {
  if (!receiver) {
    return;
  }
  // Both properties are Chrome-only; neither is in lib.dom.d.ts yet.
  const r = receiver as RTCRtpReceiver & {
    jitterBufferTarget?: number | null;
    playoutDelayHint?: number | undefined;
  };
  if ("jitterBufferTarget" in r) {
    r.jitterBufferTarget = enabled ? 0 : null;
  }
  if ("playoutDelayHint" in r) {
    r.playoutDelayHint = enabled ? 0 : undefined;
  }
}
