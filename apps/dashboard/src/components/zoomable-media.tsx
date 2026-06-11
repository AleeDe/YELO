"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const STEP = 1.4;

type View = { scale: number; x: number; y: number };

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

// Wraps evidence media (image or video) with zoom and pan so reviewers can
// inspect details such as the person involved. Panning is applied directly to
// the DOM during a drag (no React re-render per move) so it stays smooth, then
// committed to state on release. Buttons are the primary, always-visible
// controls; wheel, drag, and double-tap are accelerators.
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
  const contentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>({ scale: 1, x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const rafRef = useRef(0);
  const lastTapRef = useRef(0);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });

  const clampOffset = useCallback((next: View): View => {
    const frame = frameRef.current;
    if (!frame) return { ...next, x: 0, y: 0 };
    const maxX = ((next.scale - 1) * frame.clientWidth) / 2;
    const maxY = ((next.scale - 1) * frame.clientHeight) / 2;
    return {
      scale: next.scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  // Writes a view to both the live ref and the DOM, without a React render.
  const paint = useCallback((next: View) => {
    viewRef.current = next;
    const content = contentRef.current;
    if (content) {
      content.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
    }
  }, []);

  // Commits the live view into React state (updates badge + button states).
  const commit = useCallback(() => setView(viewRef.current), []);

  const apply = useCallback(
    (next: View) => {
      const clamped = clampOffset(next);
      paint(clamped);
      setView(clamped);
    },
    [clampOffset, paint],
  );

  const zoomAnchored = useCallback(
    (nextScale: number, anchorX: number, anchorY: number) => {
      const current = viewRef.current;
      const scale = clampScale(nextScale);
      const ratio = scale / current.scale;
      apply({
        scale,
        x: anchorX - (anchorX - current.x) * ratio,
        y: anchorY - (anchorY - current.y) * ratio,
      });
    },
    [apply],
  );

  function zoomCentered(factor: number) {
    zoomAnchored(viewRef.current.scale * factor, 0, 0);
  }

  function reset() {
    apply({ scale: 1, x: 0, y: 0 });
  }

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = frame!.getBoundingClientRect();
      const anchorX = event.clientX - rect.left - rect.width / 2;
      const anchorY = event.clientY - rect.top - rect.height / 2;
      zoomAnchored(viewRef.current.scale * Math.exp(-event.deltaY * 0.0018), anchorX, anchorY);
    }
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      frame.removeEventListener("wheel", onWheel);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [zoomAnchored]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame || viewRef.current.scale <= 1) return;
    const rect = frame.getBoundingClientRect();
    if (controlsSafeArea > 0 && event.clientY > rect.bottom - controlsSafeArea) {
      return; // Leave the native video control strip alone.
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewRef.current.x,
      originY: viewRef.current.y,
      moved: false,
    };
    frame.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      paint(clampOffset({ scale: viewRef.current.scale, x: drag.originX + dx, y: drag.originY + dy }));
    });
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      frameRef.current?.releasePointerCapture(event.pointerId);
      dragRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      commit();
      if (drag.moved) return;
    }
    if (controlsSafeArea > 0) return; // No tap-zoom on video; it fights play/pause.
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      lastTapRef.current = 0;
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect) return;
      const anchorX = event.clientX - rect.left - rect.width / 2;
      const anchorY = event.clientY - rect.top - rect.height / 2;
      if (viewRef.current.scale > 1) apply({ scale: 1, x: 0, y: 0 });
      else zoomAnchored(2.5, anchorX, anchorY);
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
        cursor: view.scale > 1 ? (dragRef.current ? "grabbing" : "grab") : "default",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDragStart={(event) => event.preventDefault()}
    >
      <div ref={contentRef} className="zoom-frame-content">
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
