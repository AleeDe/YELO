"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import {
  turnCredential,
  turnUrl,
  turnUsername,
} from "@/lib/supabase/config";

export type WebRtcState =
  | "waiting"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

type SignalPayload = {
  viewerId: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  from?: "publisher" | "viewer";
};

const iceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
if (turnUrl) {
  iceServers.push({
    urls: turnUrl,
    username: turnUsername,
    credential: turnCredential,
  });
}

const peerConfiguration: RTCConfiguration = { iceServers };

function topic(cameraId: string, signalingKey: string) {
  return `camera-webrtc:${cameraId}:${signalingKey}`;
}

async function sendSignal(
  channel: RealtimeChannel,
  event: string,
  payload: SignalPayload,
) {
  await channel.send({ type: "broadcast", event, payload });
}

export function WebRtcPublisher({
  client,
  cameraId,
  signalingKey,
  stream,
  onViewerCount,
}: {
  client: SupabaseClient | null;
  cameraId: string | null;
  signalingKey: string | null;
  stream: MediaStream | null;
  onViewerCount?: (count: number) => void;
}) {
  const onViewerCountRef = useRef(onViewerCount);

  useEffect(() => {
    onViewerCountRef.current = onViewerCount;
  }, [onViewerCount]);

  useEffect(() => {
    if (!client || !cameraId || !signalingKey || !stream) return;
    const publishedStream = stream;
    const peers = new Map<string, RTCPeerConnection>();
    const pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
    const channel = client.channel(topic(cameraId, signalingKey), {
      config: { broadcast: { ack: true } },
    });

    function updateViewerCount() {
      onViewerCountRef.current?.(peers.size);
    }

    function closePeer(viewerId: string) {
      peers.get(viewerId)?.close();
      peers.delete(viewerId);
      pendingCandidates.delete(viewerId);
      updateViewerCount();
    }

    async function createOffer(viewerId: string) {
      const existingPeer = peers.get(viewerId);
      if (
        existingPeer &&
        ["new", "connecting", "connected"].includes(existingPeer.connectionState)
      ) {
        return;
      }
      closePeer(viewerId);
      if (peers.size >= 4) {
        await sendSignal(channel, "viewer-busy", { viewerId });
        return;
      }
      const peer = new RTCPeerConnection(peerConfiguration);
      peers.set(viewerId, peer);
      updateViewerCount();
      for (const track of publishedStream.getTracks()) {
        peer.addTrack(track, publishedStream);
      }
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal(channel, "ice", {
            viewerId,
            from: "publisher",
            candidate: event.candidate.toJSON(),
          });
        }
      };
      peer.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
          closePeer(viewerId);
        }
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal(channel, "offer", {
        viewerId,
        description: peer.localDescription ?? offer,
      });
    }

    channel
      .on("broadcast", { event: "viewer-request" }, ({ payload }) => {
        const { viewerId } = payload as SignalPayload;
        if (viewerId) void createOffer(viewerId);
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        const { viewerId, description } = payload as SignalPayload;
        const peer = peers.get(viewerId);
        if (!peer || !description) return;
        await peer.setRemoteDescription(description);
        for (const candidate of pendingCandidates.get(viewerId) ?? []) {
          await peer.addIceCandidate(candidate);
        }
        pendingCandidates.delete(viewerId);
      })
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        const { viewerId, from, candidate } = payload as SignalPayload;
        if (from !== "viewer" || !candidate) return;
        const peer = peers.get(viewerId);
        if (!peer || !peer.remoteDescription) {
          pendingCandidates.set(viewerId, [
            ...(pendingCandidates.get(viewerId) ?? []),
            candidate,
          ]);
          return;
        }
        await peer.addIceCandidate(candidate);
      })
      .on("broadcast", { event: "viewer-leave" }, ({ payload }) => {
        closePeer((payload as SignalPayload).viewerId);
      })
      .subscribe();

    return () => {
      for (const peer of peers.values()) peer.close();
      peers.clear();
      onViewerCountRef.current?.(0);
      void client.removeChannel(channel);
    };
  }, [cameraId, client, signalingKey, stream]);

  return null;
}

export function WebRtcViewer({
  client,
  cameraId,
  signalingKey,
  videoRef,
  onStateChange,
}: {
  client: SupabaseClient | null;
  cameraId: string | null;
  signalingKey: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onStateChange: (state: WebRtcState) => void;
}) {
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    if (!client || !cameraId || !signalingKey) return;
    const videoElement = videoRef.current;
    const viewerId = crypto.randomUUID();
    const channel = client.channel(topic(cameraId, signalingKey), {
      config: { broadcast: { ack: true } },
    });
    const peer = new RTCPeerConnection(peerConfiguration);
    const pendingCandidates: RTCIceCandidateInit[] = [];
    let requestTimer = 0;
    let connectionTimer = 0;

    function requestStream() {
      onStateChangeRef.current("connecting");
      void sendSignal(channel, "viewer-request", { viewerId });
    }

    peer.ontrack = (event) => {
      if (!videoElement) return;
      videoElement.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      void videoElement.play().catch(() => undefined);
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal(channel, "ice", {
          viewerId,
          from: "viewer",
          candidate: event.candidate.toJSON(),
        });
      }
    };
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === "connected") {
        window.clearInterval(requestTimer);
        window.clearTimeout(connectionTimer);
        onStateChangeRef.current("connected");
      }
      else if (state === "failed") onStateChangeRef.current("failed");
      else if (state === "disconnected" || state === "closed") {
        onStateChangeRef.current("disconnected");
      }
    };

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        const { viewerId: targetId, description } = payload as SignalPayload;
        if (targetId !== viewerId || !description) return;
        await peer.setRemoteDescription(description);
        for (const candidate of pendingCandidates) await peer.addIceCandidate(candidate);
        pendingCandidates.length = 0;
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendSignal(channel, "answer", {
          viewerId,
          description: peer.localDescription ?? answer,
        });
      })
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        const {
          viewerId: targetId,
          from,
          candidate,
        } = payload as SignalPayload;
        if (targetId !== viewerId || from !== "publisher" || !candidate) return;
        if (!peer.remoteDescription) pendingCandidates.push(candidate);
        else await peer.addIceCandidate(candidate);
      })
      .on("broadcast", { event: "viewer-busy" }, ({ payload }) => {
        if ((payload as SignalPayload).viewerId === viewerId) {
          onStateChangeRef.current("failed");
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          requestStream();
          requestTimer = window.setInterval(requestStream, 8_000);
          connectionTimer = window.setTimeout(() => {
            if (peer.connectionState !== "connected") {
              onStateChangeRef.current("failed");
            }
          }, 15_000);
        }
      });

    return () => {
      window.clearInterval(requestTimer);
      window.clearTimeout(connectionTimer);
      void sendSignal(channel, "viewer-leave", { viewerId });
      peer.close();
      if (videoElement) videoElement.srcObject = null;
      void client.removeChannel(channel);
    };
  }, [cameraId, client, signalingKey, videoRef]);

  return null;
}
