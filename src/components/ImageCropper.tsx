import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/crop-utils';
import { Button } from '@/components/ui/button';
import { X, Check, Scissors } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

export function ImageCropper({ image, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropAreaChange = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Scissors className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Recortar Imagen</h3>
            <p className="text-xs text-zinc-400">Centra y encuadra tu producto para que se vea perfecto.</p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="relative flex-1 bg-zinc-950">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1} // Force square aspect ratio
          onCropChange={onCropChange}
          onCropComplete={onCropAreaChange}
          onZoomChange={onZoomChange}
        />
      </div>

      <div className="p-8 border-t border-white/10 bg-zinc-900/50 flex flex-col gap-6">
        <div className="flex items-center gap-6">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div className="flex gap-4">
          <Button 
            variant="ghost" 
            onClick={onCancel}
            className="flex-1 h-14 rounded-xl text-white hover:bg-white/10 border border-white/10 uppercase tracking-[0.2em] font-black text-[10px]"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            className="flex-1 h-14 rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-xl shadow-primary/20 uppercase tracking-[0.2em] font-black text-[10px]"
          >
            <Check className="w-4 h-4 mr-2" /> Confirmar Recorte
          </Button>
        </div>
      </div>
    </div>
  );
}
