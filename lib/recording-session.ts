export interface RecordingTrackInput {
  trackSid: string;
  participantIdentity: string;
  participantName: string;
  trackName?: string;
  source: "camera";
}

export interface RecordingTrack extends RecordingTrackInput {
  egressId: string;
  prefix: string;
  livePlaylistPath: string;
  playlistPath: string;
}

export interface RecordingSession {
  version: 1;
  roomName: string;
  sessionId: string;
  prefix: string;
  startedAt: number;
  endedAt?: number;
  tracks: RecordingTrack[];
}
