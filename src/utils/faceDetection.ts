
/**
 * Face detection and skin tone analysis utility
 */

// Helper function to extract faces from an image
export const detectFace = (imageUrl: string): Promise<{
  faceDetected: boolean;
  faceCanvas?: HTMLCanvasElement;
}> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        resolve({ faceDetected: false });
        return;
      }
      
      // Draw the full image to the canvas
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Simple face detection using color distribution 
      // This is a simplified approach, assuming the face is in the center upper portion
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 3); // Focus on upper third where face usually is
      
      // Create a face detection region (center portion of upper half)
      const faceRegionWidth = Math.floor(canvas.width * 0.4); // 40% of width
      const faceRegionHeight = Math.floor(canvas.height * 0.4); // 40% of height
      
      const startX = centerX - Math.floor(faceRegionWidth / 2);
      const startY = centerY - Math.floor(faceRegionHeight / 2);
      
      // Get image data from the potential face region
      const faceRegionData = ctx.getImageData(
        startX, 
        startY, 
        faceRegionWidth, 
        faceRegionHeight
      );
      
      // Check if there is significant skin tone color in this region
      const hasSkinTone = analyzeForSkinTone(faceRegionData.data);
      
      if (hasSkinTone) {
        // Create a new canvas with just the face region
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = faceRegionWidth;
        faceCanvas.height = faceRegionHeight;
        const faceCtx = faceCanvas.getContext('2d');
        
        if (faceCtx) {
          faceCtx.putImageData(faceRegionData, 0, 0);
          resolve({ faceDetected: true, faceCanvas });
        } else {
          resolve({ faceDetected: true }); // Face detected but canvas failed
        }
      } else {
        resolve({ faceDetected: false });
      }
    };
    
    img.onerror = () => {
      resolve({ faceDetected: false });
    };
    
    img.src = imageUrl;
  });
};

// Simple skin tone detection function
const analyzeForSkinTone = (pixels: Uint8ClampedArray): boolean => {
  // Count pixels that are in the general skin tone range
  let skinTonePixelCount = 0;
  const totalPixels = pixels.length / 4;
  
  // Analyze every pixel
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    
    // Simple skin tone detection
    // Most skin tones have higher red values than blue
    // and red and green values are not too far apart
    const isSkinTone = 
      r > 60 && g > 40 && b > 20 && // Lower bounds
      r > b && // Red greater than blue
      Math.abs(r - g) < 50 && // Red and green not too far apart
      r > g; // Usually red > green in skin tones
    
    if (isSkinTone) {
      skinTonePixelCount++;
    }
  }
  
  // Calculate the percentage of skin tone pixels
  const skinTonePercentage = (skinTonePixelCount / totalPixels) * 100;
  
  // If at least 30% of pixels look like skin tone, we probably found a face
  return skinTonePercentage > 30;
};

// Extract skin undertone from face image
export const analyzeSkinUndertone = (faceCanvas: HTMLCanvasElement): 'warm' | 'cool' | 'neutral' => {
  const ctx = faceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 'neutral';
  
  const imageData = ctx.getImageData(0, 0, faceCanvas.width, faceCanvas.height);
  const data = imageData.data;
  
  let totalR = 0, totalG = 0, totalB = 0;
  let skinPixelCount = 0;
  
  // Analyze every pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Only include skin tone pixels in the analysis
    const isSkinTone = 
      r > 60 && g > 40 && b > 20 && // Lower bounds
      r > b && // Red greater than blue
      Math.abs(r - g) < 50 && // Red and green not too far apart
      r > g; // Usually red > green in skin tones
    
    if (isSkinTone) {
      totalR += r;
      totalG += g;
      totalB += b;
      skinPixelCount++;
    }
  }
  
  // If we didn't find enough skin pixels, return neutral
  if (skinPixelCount < 100) return 'neutral';
  
  // Calculate average RGB values for skin pixels
  const avgR = totalR / skinPixelCount;
  const avgG = totalG / skinPixelCount;
  const avgB = totalB / skinPixelCount;
  
  // Determine undertone based on the relationship between red, green, and blue
  const redMinusBlue = avgR - avgB;
  const greenMinusBlue = avgG - avgB;
  
  console.log(`Skin tone analysis - R: ${avgR.toFixed(2)}, G: ${avgG.toFixed(2)}, B: ${avgB.toFixed(2)}`);
  console.log(`R-B: ${redMinusBlue.toFixed(2)}, G-B: ${greenMinusBlue.toFixed(2)}`);
  
  // Higher red indicates warm undertones
  // Higher blue indicates cool undertones
  if (redMinusBlue > 25 && avgR > avgG + 10) {
    return 'warm';
  } else if (redMinusBlue < 15 || avgB > avgG - 5) {
    return 'cool';
  } else {
    return 'neutral';
  }
};
