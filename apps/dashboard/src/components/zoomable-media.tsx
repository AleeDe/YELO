"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const STEP = 1.4;

type View = { scale: number; x: number; y: number };

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

// Wraps evidence media (image or video) with zoom and pan so reviewers can
// inspect details such as the person involved. Buttons are the primary,
// always-visible controls; wheel, drag, and double-tap are accelerators.
export function ZoomableMedia({
  children,
  label,
  controlsSafeArea = 0,
}: {
  children: React.ReactNode;
  label: string;
  // Height (px) at the bottom of the frame where drags are ignored so a
  // video's native controls stay usable while zoomed.
  controlsSafeArea?: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const lastTapRef = useRef(0);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });

  function clampOffset(next: View): View {
    const frame = frameRef.current;
    if (!frame) return { ...next, x: 0, y: 0 };
    const maxX = ((next.scale - 1) * frame.clientWidth) / 2;
    const maxY = ((next.scale - 1) * frame.clientHeight) / 2;
    return {
      scale: next.scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function zoomAnchored(current: View, nextScale: number, anchorX: number, anchorY: number): View {
    const scale = clampScale(nextScale);
    const ratio = scale / current.scale;
    return clampOffset({
      scale,
      x: anchorX - (anchorX - current.x) * ratio,
      y: anchorY - (anchorY - current.y) * ratio,
    });
  }

  function zoomCentered(factor: number) {
    setView((current) => zoomAnchored(current, current.scale * factor, 0, 0));
  }

  function reset() {
    setView({ scale: 1, x: 0, y: 0 });
  }

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = frame!.getBoundingClientRect();
      const anchorX = event.clientX - rect.left - rect.width / 2;
      const anchorY = event.clientY - rect.top - rect.height / 2;
      setView((current) =>
        zoomAnchored(current, current.scale * Math.exp(-event.deltaY * 0.0018), anchorX, anchorY),
      );
    }
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (controlsSafeArea > 0 && event.clientY > rect.bottom - controlsSafeArea) {
      return; // Leave the native video control strip alone.
    }
    if (view.scale > 1) {
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: view.x,
        originY: view.y,
        moved: false,
      };
      frame.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    setView((current) =>
      clampOffset({ scale: current.scale, x: drag.originX + dx, y: drag.originY + dy }),
    );
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      frame?.releasePointerCapture(event.pointerId);
      dragRef.current = null;
      if (drag.moved) return;
    }
    if (controlsSafeArea > 0) return; // No tap-zoom on video; it fights play/pause.
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      lastTapRef.current = 0;
      const rect = frame?.getBoundingClientRect();
      if (!rect) return;
      const anchorX = event.clientX - rect.left - rect.width / 2;
      const anchorY = event.clientY - rect.top - rect.height / 2;
      setView((current) =>
        current.scale > 1
          ? { scale: 1, x: 0, y: 0 }
          : zoomAnchored(current, 2.5, anchorX, anchorY),
      );
    } else {
      lastTapRef.current = now;
    }
  }

  return (
    <div
      ref={frameRef}
      className="zoom-frame"
      role="group"
      aria-label={`${label}. Use the zoom buttons, mouse wheel, or double-tap to magnify.`}
      style={{
        touchAction: view.scale > 1 ? "none" : "auto",
        cursor: view.scale > 1 ? "grab" : "default",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="zoom-frame-content"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        {children}
      </div>
      <div className="zoom-toolbar">
        <button
          type="button"
          className="focus-ring"
          aria-label="Zoom in"
          disabled={view.scale >= MAX_SCALE}
          onClick={() => zoomCentered(STEP)}
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          className="focus-ring"
          aria-label="Zoom out"
          disabled={view.scale <= MIN_SCALE}
          onClick={() => zoomCentered(1 / STEP)}
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          className="focus-ring"
          aria-label="Reset zoom"
          disabled={view.scale === 1}
          onClick={reset}
        >
          <RotateCcw size={17} />
        </button>
        {view.scale > 1 && <span aria-live="polite">{view.scale.toFixed(1)}×</span>}
      </div>
    </div>
  );
}
