
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageOff, AlertTriangle } from 'lucide-react';

interface FaceValidationDialogProps {
  open: boolean;
  onClose: () => void;
  message: string;
}

const FaceValidationDialog: React.FC<FaceValidationDialogProps> = ({ 
  open, 
  onClose, 
  message 
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center">Face Detection Issue</DialogTitle>
          <DialogDescription className="text-center">
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <ImageOff className="h-5 w-5" />
            <p>Ensure your face is clearly visible and centered in the photo</p>
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button onClick={onClose}>Try Another Photo</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FaceValidationDialog;
