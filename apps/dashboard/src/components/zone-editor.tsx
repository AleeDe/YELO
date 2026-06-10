"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  Check,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
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
  onZonesChange,
}: ZoneEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [points, setPoints] = useState<ZonePoint[]>([]);
  const [pointX, setPointX] = useState("50");
  const [pointY, setPointY] = useState("50");
  const [referenceImage, setReferenceImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (referenceImage) URL.revokeObjectURL(referenceImage);
    },
    [referenceImage],
  );

  function openNewZone() {
    setEditing(true);
    setEditingId(null);
    setName(`Restricted area ${zones.length + 1}`);
    setPoints([]);
    setError("");
  }

  function openExistingZone(zone: RestrictedZone) {
    setEditing(true);
    setEditingId(zone.id);
    setName(zone.name);
    setPoints(zone.polygon);
    setError("");
  }

  function closeEditor() {
    setEditing(false);
    setEditingId(null);
    setName("");
    setPoints([]);
    setError("");
  }

  function chooseReferenceImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a camera image in JPEG, PNG, or WebP format.");
      return;
    }
    if (referenceImage) URL.revokeObjectURL(referenceImage);
    setReferenceImage(URL.createObjectURL(file));
    setError("");
  }

  function addPoint(event: React.PointerEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = {
      x: normalizedPoint((event.clientX - bounds.left) / bounds.width),
      y: normalizedPoint((event.clientY - bounds.top) / bounds.height),
    };
    setPoints((current) => [...current, point]);
    setError("");
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
                <small>Tap around the boundary in order. Three or more points are required.</small>
              </div>
              <span className={points.length >= 3 ? "complete" : ""}>
                {points.length} {points.length === 1 ? "point" : "points"}
              </span>
            </div>

            <button
              className={`zone-drawing-surface ${referenceImage ? "has-image" : ""}`}
              type="button"
              onPointerDown={addPoint}
              aria-label="Zone drawing area. Tap to add a polygon point."
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
                {points.map((point, index) => (
                  <g key={`${point.x}-${point.y}-${index}`}>
                    <circle cx={point.x * 100} cy={point.y * 100} r="1.8" />
                    <text x={point.x * 100} y={point.y * 100} dy=".7">
                      {index + 1}
                    </text>
                  </g>
                ))}
              </svg>
            </button>

            <input
              ref={imageInputRef}
              className="visually-hidden"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => chooseReferenceImage(event.target.files?.[0])}
            />
            <div className="zone-canvas-actions">
              <button className="secondary-button focus-ring" type="button" onClick={() => imageInputRef.current?.click()}>
                <ImagePlus size={18} /> {referenceImage ? "Replace image" : "Add camera image"}
              </button>
              <button className="secondary-button focus-ring" type="button" disabled={points.length === 0} onClick={() => setPoints((current) => current.slice(0, -1))}>
                <Undo2 size={18} /> Undo point
              </button>
              <button className="quiet-button focus-ring" type="button" disabled={points.length === 0} onClick={() => setPoints([])}>
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
                    <li key={`${point.x}-${point.y}-${index}`}>
                      <span>{index + 1}</span>
                      <code>{Math.round(point.x * 100)}%, {Math.round(point.y * 100)}%</code>
                      <button
                        className="icon-button focus-ring"
                        type="button"
                        aria-label={`Remove point ${index + 1}`}
                        onClick={() => setPoints((current) => current.filter((_, pointIndex) => pointIndex !== index))}
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
