import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, X } from 'lucide-react';
import clsx from 'clsx';

export default function Dropzone({
  onFiles,
  files = [],
  onRemove,
  accept,
  multiple = true,
  maxSize = 50 * 1024 * 1024, // 50MB
  hint = 'PDF, JPG, PNG, MP4, CSV — up to 50MB',
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => onFiles?.(accepted),
    accept,
    multiple,
    maxSize,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-neon-cyan bg-neon-cyan/5'
            : 'border-white/10 hover:border-neon-cyan/40 bg-ink-900/40'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
            <UploadCloud className="text-neon-cyan" size={20} />
          </div>
          <div>
            <p className="font-mono text-sm">
              {isDragActive ? (
                <span className="text-neon-cyan">Release to upload</span>
              ) : (
                <>
                  <span className="text-neon-cyan">Click to upload</span>{' '}
                  <span className="text-slate-400">or drag & drop</span>
                </>
              )}
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-1">{hint}</p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center gap-3 panel p-3 group"
            >
              <FileText size={16} className="text-neon-cyan flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono truncate">{file.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              {onRemove && (
                <button
                  onClick={() => onRemove(idx)}
                  className="text-slate-500 hover:text-neon-red opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
