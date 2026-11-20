import React, { useRef, useState } from 'react';
import { CharacterPreset, CHARACTER_PRESETS } from '../types/game';
import {
  User,
  Sparkles,
  Upload,
  Check,
  X,
  GraduationCap,
  Briefcase,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface CharacterSelectModalProps {
  isOpen: boolean;
  activePresetId?: string;
  onSelectPreset: (preset: CharacterPreset) => void;
  onUploadCustomGlb: (fileUrl: string, fileName: string) => void;
  onClose: () => void;
  isInitialLaunch?: boolean;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  isOpen,
  activePresetId = 'aarav-cse',
  onSelectPreset,
  onUploadCustomGlb,
  onClose,
  isInitialLaunch = false,
}) => {
  const [selectedId, setSelectedId] = useState<string>(activePresetId);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handlePresetClick = (preset: CharacterPreset) => {
    setSelectedId(preset.id);
    onSelectPreset(preset);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      alert('Please upload a valid 3D .glb or .gltf humanoid model.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomFileName(file.name);
    setSelectedId('custom-glb');
    onUploadCustomGlb(objectUrl, file.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900/95 border border-white/15 shadow-2xl shadow-black/80 p-6 md:p-8 flex flex-col gap-6 text-white">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CVR STUDENT IDENTITY</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Choose Your CVR Student Avatar
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Select an authentic department preset calibrated to real 1.75m human proportions, or upload your own custom rigged 3D glTF avatar.
            </p>
          </div>

          {!isInitialLaunch && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Close (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 4 Preset Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHARACTER_PRESETS.map((preset) => {
            const isSelected = selectedId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-gradient-to-br from-amber-500/15 via-slate-800/90 to-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/40'
                    : 'bg-slate-800/60 hover:bg-slate-800/90 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Active check pill */}
                {isSelected && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black tracking-wide shadow-md">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>ACTIVE</span>
                  </div>
                )}

                <div>
                  {/* Department & Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                      {preset.department}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[11px] font-medium text-slate-300 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                      {preset.badge}
                    </span>
                  </div>

                  {/* Character Name */}
                  <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                    {preset.name}
                    <span className="text-xs font-normal text-slate-400">
                      ({preset.gender === 'male' ? 'Casual Male' : 'Casual Female'})
                    </span>
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>
                </div>

                {/* Outfit Colors Swatch */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: preset.outfit.primaryColor }}
                        title="Outfit Primary"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: preset.outfit.accentColor }}
                        title="Outfit Accent"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: preset.outfit.backpackColor }}
                        title="College Backpack"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {preset.outfit.tag}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400 font-semibold">
                    1.75m • Rigged
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom .GLB File Upload Option */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-dashed border-white/20 hover:border-amber-400/50 transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Upload Custom .glb Avatar
                {customFileName && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono border border-emerald-500/30">
                    Loaded: {customFileName}
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-400">
                ReadyPlayerMe, Mixamo, or custom rigged humanoid (.glb / .gltf). Auto-scaled to 1.75m.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-md"
            >
              Browse .glb File
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Strict forward-facing walk calibrated • WASD movement • 60 FPS</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{isInitialLaunch ? 'Start Exploring Campus' : 'Confirm Avatar'}</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
