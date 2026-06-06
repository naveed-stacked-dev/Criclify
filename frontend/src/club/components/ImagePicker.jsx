import { useRef, useState, useMemo } from "react";
import { Upload, X } from "lucide-react";

/**
 * Lightweight drag-and-drop image picker (no external deps).
 * Holds a File object in parent state; shows a live preview.
 *
 * Note: object URLs are intentionally not revoked here — under React StrictMode
 * a revoke-on-cleanup effect double-invokes and kills the preview. The leak is
 * tiny and bounded to the lifetime of this short-lived modal.
 *
 * @param {File|string|null} value   - current File or existing URL
 * @param {function}         onChange - called with the new File or null
 * @param {string}           height   - tailwind height class for the preview, e.g. "h-32"
 */
export default function ImagePicker({ value, onChange, height = "h-32" }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  const preview = useMemo(() => {
    if (value instanceof File) return URL.createObjectURL(value);
    if (typeof value === "string" && value) return value;
    return null;
  }, [value]);

  const handleFile = (file) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please select an image file");
    if (file.size > 5 * 1024 * 1024) return setError("File too large (max 5MB)");
    onChange(file);
  };

  return (
    <div className="space-y-1.5">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
        className="relative border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition overflow-hidden"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {preview ? (
          <div className="relative group">
            <img src={preview} alt="" className={`w-full ${height} object-cover`} />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Click or drag to replace</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-7 px-4 text-center">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: "var(--club-primary)15" }}>
              <Upload className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
            </div>
            <p className="text-sm font-medium text-slate-700">Drag &amp; drop or click to upload</p>
            <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP, GIF up to 5MB</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
