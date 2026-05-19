import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Camera, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageCropper from './ImageCropper';
import { useDialog } from './DialogProvider';

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { showAlert } = useDialog();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchMyProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (error) throw error;
        if (data) {
          setUserName(data.display_name);
          if (data.avatar_url) setAvatarPreview(data.avatar_url);
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden des Profils im Onboarding:", err);
    }
  }, []);

  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showAlert("Das Bild ist zu groß (max. 10 MB).", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setSelectedImage(null);
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Delete previous image if exists (clean storage)
      const { data: currentProfile } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single();
      if (currentProfile?.avatar_url) {
        const oldPath = currentProfile.avatar_url.split('/avatars/')[1];
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
      }

      const localUrl = URL.createObjectURL(croppedBlob);
      setAvatarPreview(localUrl);

      // 2. Upload new
      const fileName = `${session.user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;
      await fetchMyProfile();
    } catch (err: any) {
      showAlert("Fehler beim Upload: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-4 animate-entrance relative">
      {selectedImage && createPortal(
        <ImageCropper 
          image={selectedImage} 
          onCropComplete={handleCropComplete} 
          onCancel={() => setSelectedImage(null)} 
        />,
        document.body
      )}

      <header className="mb-10">
        <div className="quiz-prog-dots">
          <div className="quiz-dot active" />
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-center px-4">
          <div className="relative mx-auto w-32">
            <label className="cursor-pointer block relative h-32 w-32 mb-2 group">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={loading} />
              <div className={`w-32 h-32 rounded-[2.5rem] bg-white flex items-center justify-center border-2 border-white shadow-md overflow-hidden transition-all group-hover:scale-105 active:scale-95 ${loading ? 'opacity-50' : ''}`}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-10 h-10 text-[var(--secondary)]" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                {loading && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-10">
                    <div className="w-6 h-6 border-4 border-[var(--secondary)] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {!avatarPreview && !loading && (
                <div className="absolute -right-1 -bottom-1 w-10 h-10 rounded-full bg-[var(--secondary)] text-white flex items-center justify-center shadow-lg border-4 border-[#F8F7FF] animate-bounce-subtle">
                  <Camera className="w-4 h-4" />
                </div>
              )}
            </label>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-[#1F1939] tracking-tight">Hallo {userName}! ❤️</h2>
            <p className="text-[var(--text)] text-xs font-bold leading-relaxed opacity-80 max-w-[240px] mx-auto">
              {avatarPreview 
                ? "Dein Profilbild sieht super aus! Möchtest du es so lassen oder ein anderes wählen?" 
                : "Lass uns dein Profil vervollständigen. Möchtest du ein Foto hochladen?"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 pb-6 pt-4">
        <button 
          disabled={loading}
          onClick={onComplete}
          className="btn-action py-5 text-lg font-black"
        >
          Fertig & Starten ✨ <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
