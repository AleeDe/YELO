import Link from "next/link";
import { ArrowLeft, Camera, Check, Monitor, Radio, Smartphone, Upload, Video } from "lucide-react";

const sources = [
  { icon: Smartphone, name: "Mobile camera", detail: "Connect this phone or another Android device", selected: true },
  { icon: Monitor, name: "Webcam", detail: "Use a laptop or USB webcam for live capture" },
  { icon: Radio, name: "CCTV / RTSP", detail: "Connect an IP camera through its secure stream URL" },
  { icon: Upload, name: "Recorded video", detail: "Upload an MP4 file for testing and demonstrations" },
];

export default function RegisterCameraPage() {
  return (
    <>
      <Link href="/cameras" className="back-link focus-ring"><ArrowLeft size={18} /> Back to cameras</Link>
      <div className="form-page-heading"><p className="eyebrow">New monitoring source</p><h1>Register camera</h1><p className="page-subtitle">Choose a source and add the minimum information required to connect it.</p></div>
      <div className="setup-layout">
        <ol className="stepper" aria-label="Camera registration progress">
          <li className="active"><span>1</span><div><strong>Source</strong><small>Choose camera type</small></div></li>
          <li><span>2</span><div><strong>Details</strong><small>Name and location</small></div></li>
          <li><span>3</span><div><strong>Connect</strong><small>Test the source</small></div></li>
          <li><span>4</span><div><strong>Zone</strong><small>Define restricted area</small></div></li>
        </ol>
        <section className="panel setup-card" aria-labelledby="source-title">
          <div className="setup-card-heading"><p className="eyebrow">Step 1 of 4</p><h2 id="source-title">How will this camera connect?</h2><p>Select the source that matches your device. You can change it before activation.</p></div>
          <div className="source-options">
            {sources.map((source) => {
              const Icon = source.icon;
              return (
                <label className={`source-option ${source.selected ? "selected" : ""}`} key={source.name}>
                  <input type="radio" name="source" defaultChecked={source.selected} />
                  <span className="source-icon"><Icon size={23} /></span>
                  <span><strong>{source.name}</strong><small>{source.detail}</small></span>
                  {source.selected && <Check size={20} className="source-check" />}
                </label>
              );
            })}
          </div>
          <div className="setup-preview">
            <div className="setup-preview-icon"><Video size={25} /></div>
            <div><strong>Mobile connection flow</strong><p>YELO will generate a secure device code. Open the mobile capture screen, enter the code, and allow camera permission.</p></div>
          </div>
          <div className="form-grid">
            <label className="form-field"><span>Camera name</span><input type="text" placeholder="e.g. Park north entrance" /></label>
            <label className="form-field"><span>Location label</span><input type="text" placeholder="e.g. Block C community park" /></label>
          </div>
          <div className="form-actions"><Link href="/cameras" className="secondary-button focus-ring">Cancel</Link><button type="button" className="primary-button focus-ring" disabled title="Database registration is the next implementation step">Register details first <Camera size={18} /></button></div>
        </section>
      </div>
    </>
  );
}
