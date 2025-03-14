
import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { segmentPersonAndDetectFace } from '@/utils/imageFaceSegmentation';

interface ImageUploaderProps {
  onImageUpload: (image: string) => void;
  isAnalyzing: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, isAnalyzing }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [noFaceDetected, setNoFaceDetected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG or PNG)');
      return;
    }

    // Reset states
    setNoFaceDetected(false);
    
    // Read the original file
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setOriginalImage(result);
      
      // Process image to detect and segment face
      try {
        const segmentationResult = await segmentPersonAndDetectFace(result);
        
        if (!segmentationResult.hasFace) {
          // No face detected
          setPreviewUrl(result); // Show original image
          setNoFaceDetected(true);
          toast.warning('No face detected. For best results, upload a clear photo of your face.');
          onImageUpload(result); // Still allow analysis with original image
        } else {
          // Face detected - use segmented image
          setPreviewUrl(segmentationResult.segmentedImageData);
          onImageUpload(segmentationResult.segmentedImageData || result);
          setNoFaceDetected(false);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setPreviewUrl(result);
        onImageUpload(result);
        toast.error('Error processing image. Using original image instead.');
      }
    };
    
    reader.onerror = () => {
      toast.error('Error reading the file');
    };
    
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mb-10 animate-fade-up animate-stagger-1">
      <div
        className={`glass-panel rounded-xl p-6 transition-all duration-300 ${
          isDragging ? 'ring-2 ring-primary/50 shadow-lg' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!previewUrl ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-lg font-medium mb-2">Upload your photo</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Drag and drop or select a clear, well-lit photo of your face
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              className="hidden"
              accept="image/jpeg, image/png, image/jpg"
            />
            <Button onClick={triggerFileInput} className="group">
              <Upload className="mr-2 h-4 w-4 group-hover:translate-y-[-2px] transition-transform" />
              Select Image
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="image-container aspect-square">
              <img 
                src={previewUrl} 
                alt="Uploaded"
                className="w-full h-full object-cover rounded-lg" 
              />
            </div>
            
            {noFaceDetected && (
              <div className="p-3 bg-orange-100 border border-orange-200 rounded-lg flex items-center gap-2 text-sm text-orange-700 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span>No face detected. Results may be less accurate.</span>
              </div>
            )}
            
            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={triggerFileInput}
                disabled={isAnalyzing}
                className="flex-1"
              >
                Change Photo
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                className="hidden"
                accept="image/jpeg, image/png, image/jpg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
