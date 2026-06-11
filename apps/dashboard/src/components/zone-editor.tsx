"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  Check,
  ImagePlus,
  LoaderCircle,
  Move,
  Pencil,
  Plus,
  RectangleHorizontal,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ZonePoint = { x: number; y: number };

export type RestrictedZone = {
  id: string;
  name: string;
  polygon: ZonePoint[];
  is_active: boolean;
};

type ZoneEditorProps = {
  cameraId: string;
  societyId: string;
  client: SupabaseClient;
  zones: RestrictedZone[];
  latestFrameUrl?: string;
  onZonesChange: (zones: RestrictedZone[]) => void;
};

function normalizedPoint(value: number) {
  return Math.min(1, Math.max(0, Number(value.toFixed(5))));
}

export function ZoneEditor({
  cameraId,
  societyId,
  client,
  zones,
  latestFrameUrl = "",
  onZonesChange,
}: ZoneEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const draggingPointRef = useRef<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [points, setPoints] = useState<ZonePoint[]>([]);
  const [pointX, setPointX] = useState("50");
  const [pointY, setPointY] = useState("50");
  const [referenceImage, setReferenceImage] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (referenceImage.startsWith("blob:")) URL.revokeObjectURL(referenceImage);
    },
    [referenceImage],
  );

  function openNewZone() {
    setEditing(true);
    setEditingId(null);
    setName(`Restricted area ${zones.length + 1}`);
    setPoints([]);
    setSelectedPoint(null);
    setReferenceImage(latestFrameUrl);
    setError("");
  }

  function openExistingZone(zone: RestrictedZone) {
    setEditing(true);
    setEditingId(zone.id);
    setName(zone.name);
    setPoints(zone.polygon);
    setSelectedPoint(null);
    setReferenceImage(latestFrameUrl);
    setError("");
  }

  function closeEditor() {
    setEditing(false);
    setEditingId(null);
    setName("");
    setPoints([]);
    setSelectedPoint(null);
    draggingPointRef.current = null;
    setError("");
  }

  function chooseReferenceImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a camera image in JPEG, PNG, or WebP format.");
      return;
    }
    if (referenceImage.startsWith("blob:")) URL.revokeObjectURL(referenceImage);
    setReferenceImage(URL.createObjectURL(file));
    setError("");
  }

  function addPoint(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget !== event.target) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = {
      x: normalizedPoint((event.clientX - bounds.left) / bounds.width),
      y: normalizedPoint((event.clientY - bounds.top) / bounds.height),
    };
    setPoints((current) => {
      setSelectedPoint(current.length);
      return [...current, point];
    });
    setError("");
  }

  function updatePoint(index: number, clientX: number, clientY: number, surface: HTMLElement) {
    const bounds = surface.getBoundingClientRect();
    const nextPoint = {
      x: normalizedPoint((clientX - bounds.left) / bounds.width),
      y: normalizedPoint((clientY - bounds.top) / bounds.height),
    };
    setPoints((current) =>
      current.map((point, pointIndex) => (pointIndex === index ? nextPoint : point)),
    );
  }

  function startDraggingPoint(
    event: React.PointerEvent<HTMLButtonElement>,
    index: number,
  ) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedPoint(index);
    draggingPointRef.current = index;
  }

  function dragPoint(event: React.PointerEvent<HTMLButtonElement>, index: number) {
    if (draggingPointRef.current !== index) return;
    event.stopPropagation();
    const surface = event.currentTarget.parentElement;
    if (surface) updatePoint(index, event.clientX, event.clientY, surface);
  }

  function stopDraggingPoint(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingPointRef.current = null;
  }

  function movePointWithKeyboard(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const movement: Record<string, ZonePoint> = {
      ArrowLeft: { x: -0.01, y: 0 },
      ArrowRight: { x: 0.01, y: 0 },
      ArrowUp: { x: 0, y: -0.01 },
      ArrowDown: { x: 0, y: 0.01 },
    };
    const delta = movement[event.key];
    if (!delta) return;
    event.preventDefault();
    setPoints((current) =>
      current.map((point, pointIndex) =>
        pointIndex === index
          ? {
              x: normalizedPoint(point.x + delta.x),
              y: normalizedPoint(point.y + delta.y),
            }
          : point,
      ),
    );
  }

  function useStarterRectangle() {
    setPoints([
      { x: 0.12, y: 0.16 },
      { x: 0.88, y: 0.16 },
      { x: 0.88, y: 0.86 },
      { x: 0.12, y: 0.86 },
    ]);
    setSelectedPoint(0);
    setError("");
  }

  function removePoint(index: number) {
    setPoints((current) => current.filter((_, pointIndex) => pointIndex !== index));
    setSelectedPoint((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  }

  function addCoordinatePoint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const x = Number(pointX);
    const y = Number(pointY);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
      setError("Point coordinates must be between 0 and 100 percent.");
      return;
    }
    setPoints((current) => [
      ...current,
      { x: normalizedPoint(x / 100), y: normalizedPoint(y / 100) },
    ]);
    setSelectedPoint(points.length);
    setError("");
  }

  async function saveZone() {
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError("Enter a zone name with at least two characters.");
      return;
    }
    if (points.length < 3) {
      setError("Add at least three points to complete the restricted area.");
      return;
    }

    setSaving(true);
    setError("");
    const payload = {
      society_id: societyId,
      camera_id: cameraId,
      name: cleanName,
      polygon: points,
      is_active: true,
    };
    const request = editingId
      ? client
          .from("restricted_zones")
          .update({ name: cleanName, polygon: points })
          .eq("id", editingId)
      : client.from("restricted_zones").insert(payload);
    const { data, error: saveError } = await request
      .select("id, name, polygon, is_active")
      .single();
    setSaving(false);

    if (saveError || !data) {
      setError(saveError?.message ?? "The restricted zone could not be saved.");
      return;
    }

    const savedZone = data as RestrictedZone;
    onZonesChange(
      editingId
        ? zones.map((zone) => (zone.id === editingId ? savedZone : zone))
        : [...zones, savedZone],
    );
    closeEditor();
  }

  async function deleteZone(zone: RestrictedZone) {
    if (!window.confirm(`Delete "${zone.name}"? Existing incident records will keep their history.`)) {
      return;
    }
    setDeletingId(zone.id);
    setError("");
    const { error: deleteError } = await client
      .from("restricted_zones")
      .delete()
      .eq("id", zone.id);
    setDeletingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onZonesChange(zones.filter((item) => item.id !== zone.id));
    if (editingId === zone.id) closeEditor();
  }

  return (
    <div className="zone-manager">
      <div className="zone-manager-header">
        <div>
          <p className="eyebrow">Monitored areas</p>
          <h2>Restricted zones</h2>
          <p>Mark areas where waste must not be placed or thrown.</p>
        </div>
        {!editing && (
          <button className="primary-button focus-ring" type="button" onClick={openNewZone}>
            <Plus size={18} /> Add zone
          </button>
        )}
      </div>

      {error && (
        <div className="auth-error" role="alert">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {editing ? (
        <div className="zone-workspace">
          <div className="zone-canvas-panel">
            <div className="zone-canvas-toolbar">
              <div>
                <strong>{editingId ? "Edit restricted area" : "Create restricted area"}</strong>
                <small>Tap to add corners, then drag the numbered handles into position.</small>
              </div>
              <span className={points.length >= 3 ? "complete" : ""}>
                {points.length} {points.length === 1 ? "point" : "points"}
              </span>
            </div>

            <div
              className={`zone-drawing-surface ${referenceImage ? "has-image" : ""}`}
              role="group"
              tabIndex={0}
              onPointerDown={addPoint}
              aria-label="Restricted-zone drawing area. Tap empty space to add a point. Drag numbered handles to move them."
              style={
                referenceImage
                  ? { backgroundImage: `url("${referenceImage}")` }
                  : undefined
              }
            >
              {!referenceImage && (
                <span className="zone-reference-empty">
                  <ImagePlus size={30} />
                  <strong>Add a current camera image</strong>
                  <small>You can still place points now, then add the image for visual checking.</small>
                </span>
              )}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {points.length > 1 && (
                  <polyline
                    points={points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ")}
                  />
                )}
                {points.length >= 3 && (
                  <polygon
                    points={points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ")}
                  />
                )}
              </svg>
              {points.map((point, index) => (
                <button
                  key={index}
                  className={`zone-point-handle focus-ring ${selectedPoint === index ? "selected" : ""}`}
                  type="button"
                  style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
                  aria-label={`Boundary point ${index + 1}. Drag to move, or use arrow keys.`}
                  aria-pressed={selectedPoint === index}
                  onPointerDown={(event) => startDraggingPoint(event, index)}
                  onPointerMove={(event) => dragPoint(event, index)}
                  onPointerUp={stopDraggingPoint}
                  onPointerCancel={stopDraggingPoint}
                  onKeyDown={(event) => movePointWithKeyboard(event, index)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedPoint(index);
                  }}
                >
                  {index + 1}
                </button>
              ))}
              {points.length > 0 && (
                <span className="zone-drawing-hint">
                  <Move size={16} /> Drag points to fine-tune the boundary
                </span>
              )}
            </div>

            <input
              ref={imageInputRef}
              hidden
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => chooseReferenceImage(event.target.files?.[0])}
            />
            <div className="zone-canvas-actions">
              <button className="secondary-button focus-ring" type="button" onClick={useStarterRectangle}>
                <RectangleHorizontal size={18} /> Start with rectangle
              </button>
              <button className="secondary-button focus-ring" type="button" onClick={() => imageInputRef.current?.click()}>
                <ImagePlus size={18} /> {referenceImage ? "Replace image" : "Add camera image"}
              </button>
              <button className="secondary-button focus-ring" type="button" disabled={points.length === 0} onClick={() => {
                setPoints((current) => current.slice(0, -1));
                setSelectedPoint(null);
              }}>
                <Undo2 size={18} /> Undo point
              </button>
              <button
                className="secondary-button danger-text focus-ring"
                type="button"
                disabled={selectedPoint === null}
                onClick={() => {
                  if (selectedPoint !== null) removePoint(selectedPoint);
                }}
              >
                <Trash2 size={17} /> Remove selected
              </button>
              <button className="quiet-button focus-ring" type="button" disabled={points.length === 0} onClick={() => {
                setPoints([]);
                setSelectedPoint(null);
              }}>
                <RotateCcw size={17} /> Reset
              </button>
            </div>
          </div>

          <aside className="zone-editor-controls">
            <div>
              <p className="eyebrow">Zone details</p>
              <h3>Name and review</h3>
              <p>Coordinates are normalized, so the area stays aligned at different video sizes.</p>
            </div>
            <label className="form-field">
              <span>Zone name</span>
              <input
                value={name}
                minLength={2}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                placeholder="Main entrance"
              />
            </label>
            <div className="zone-point-review" aria-live="polite">
              <strong>Boundary points</strong>
              {points.length === 0 ? (
                <p>No points added yet.</p>
              ) : (
                <ol>
                  {points.map((point, index) => (
                    <li key={index} className={selectedPoint === index ? "selected" : ""}>
                      <span>{index + 1}</span>
                      <button
                        className="zone-point-select focus-ring"
                        type="button"
                        onClick={() => setSelectedPoint(index)}
                      >
                        <code>{Math.round(point.x * 100)}%, {Math.round(point.y * 100)}%</code>
                        <small>{selectedPoint === index ? "Selected" : "Select and drag on image"}</small>
                      </button>
                      <button
                        className="icon-button focus-ring"
                        type="button"
                        aria-label={`Remove point ${index + 1}`}
                        onClick={() => removePoint(index)}
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <details className="zone-coordinate-entry">
              <summary className="focus-ring">Add point with coordinates</summary>
              <form onSubmit={addCoordinatePoint}>
                <label className="form-field">
                  <span>Horizontal (%)</span>
                  <input type="number" min="0" max="100" step="0.1" value={pointX} onChange={(event) => setPointX(event.target.value)} />
                </label>
                <label className="form-field">
                  <span>Vertical (%)</span>
                  <input type="number" min="0" max="100" step="0.1" value={pointY} onChange={(event) => setPointY(event.target.value)} />
                </label>
                <button className="secondary-button focus-ring" type="submit">
                  <Plus size={17} /> Add point
                </button>
              </form>
            </details>
            <div className="zone-editor-footer">
              <button className="secondary-button focus-ring" type="button" disabled={saving} onClick={closeEditor}>
                Cancel
              </button>
              <button className="primary-button focus-ring" type="button" disabled={saving || points.length < 3 || name.trim().length < 2} onClick={() => void saveZone()}>
                {saving ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}
                {saving ? "Saving..." : "Save zone"}
              </button>
            </div>
          </aside>
        </div>
      ) : zones.length === 0 ? (
        <div className="zone-empty-state">
          <span><ImagePlus size={26} /></span>
          <div>
            <h3>No restricted zones yet</h3>
            <p>Add a reference image, then tap around the area where dumping is prohibited.</p>
          </div>
          <button className="secondary-button focus-ring" type="button" onClick={openNewZone}>
            Create first zone
          </button>
        </div>
      ) : (
        <div className="zone-list">
          {zones.map((zone) => (
            <article key={zone.id}>
              <span className="zone-list-status"><Check size={18} /></span>
              <div>
                <h3>{zone.name}</h3>
                <p>{zone.polygon.length} boundary points · {zone.is_active ? "Active" : "Paused"}</p>
              </div>
              <div className="zone-list-actions">
                <button className="secondary-button focus-ring" type="button" onClick={() => openExistingZone(zone)}>
                  <Pencil size={17} /> Edit
                </button>
                <button className="icon-button danger focus-ring" type="button" disabled={deletingId === zone.id} aria-label={`Delete ${zone.name}`} onClick={() => void deleteZone(zone)}>
                  {deletingId === zone.id ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
