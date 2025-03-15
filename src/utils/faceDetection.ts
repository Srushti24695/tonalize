
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
      
      // Normalize image size to reduce variance in processing
      const maxSize = 600; // Limit maximum dimension
      let width = img.width;
      let height = img.height;
      
      // Resize while maintaining aspect ratio if needed
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.floor(height * (maxSize / width));
          width = maxSize;
        } else {
          width = Math.floor(width * (maxSize / height));
          height = maxSize;
        }
      }
      
      // Set canvas to normalized size
      canvas.width = width;
      canvas.height = height;
      
      // Apply some preprocessing - draw in grayscale first to normalize lighting
      ctx.filter = 'contrast(1.1) brightness(1.05)';
      ctx.drawImage(img, 0, 0, width, height);
      ctx.filter = 'none';
      
      // Focus on upper middle portion where face usually is
      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 3); // Focus on upper third
      
      // Create a face detection region (center portion of upper half)
      const faceRegionWidth = Math.floor(width * 0.5); // 50% of width
      const faceRegionHeight = Math.floor(height * 0.5); // 50% of height
      
      const startX = Math.max(0, centerX - Math.floor(faceRegionWidth / 2));
      const startY = Math.max(0, centerY - Math.floor(faceRegionHeight / 2));
      
      // Get image data from the potential face region
      const faceRegionData = ctx.getImageData(
        startX, 
        startY, 
        Math.min(faceRegionWidth, width - startX), 
        Math.min(faceRegionHeight, height - startY)
      );
      
      // Check if there is significant skin tone color in this region
      const hasSkinTone = analyzeForSkinTone(faceRegionData.data);
      
      if (hasSkinTone) {
        // Create a new canvas with just the face region
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = faceRegionData.width;
        faceCanvas.height = faceRegionData.height;
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

// Improved skin tone detection function
const analyzeForSkinTone = (pixels: Uint8ClampedArray): boolean => {
  // Count pixels that are in the general skin tone range
  let skinTonePixelCount = 0;
  const totalPixels = pixels.length / 4;
  
  // Collect color distribution to check for face-like patterns
  const colorHistogram: Record<string, number> = {};
  
  // Analyze every pixel
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    
    // Improved skin tone detection with more precise conditions
    const isSkinTone = 
      r > 60 && g > 40 && b > 20 && // Lower bounds
      r > b && // Red greater than blue
      Math.abs(r - g) < 50 && // Red and green not too far apart
      r > g && // Red greater than green
      r < 240 && g < 220 && b < 200; // Upper bounds (avoid pure white/bright areas)
    
    if (isSkinTone) {
      skinTonePixelCount++;
      
      // Add to color histogram (simplified to 10 value buckets)
      const rBucket = Math.floor(r / 10);
      const gBucket = Math.floor(g / 10);
      const bBucket = Math.floor(b / 10);
      const colorKey = `${rBucket}_${gBucket}_${bBucket}`;
      
      colorHistogram[colorKey] = (colorHistogram[colorKey] || 0) + 1;
    }
  }
  
  // Calculate the percentage of skin tone pixels
  const skinTonePercentage = (skinTonePixelCount / totalPixels) * 100;
  
  // Check color histogram for face-like distribution (multiple similar skin tones)
  const histogramEntries = Object.entries(colorHistogram);
  const hasSkinToneDistribution = histogramEntries.length >= 5; // Multiple color clusters
  
  // If at least 30% of pixels look like skin tone and we have diverse skin tone colors, we likely found a face
  return skinTonePercentage > 25 && hasSkinToneDistribution;
};

// Extract skin undertone from face image with more consistent results
export const analyzeSkinUndertone = (faceCanvas: HTMLCanvasElement): 'warm' | 'cool' | 'neutral' => {
  const ctx = faceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 'neutral';
  
  // Apply color correction to normalize lighting conditions
  ctx.filter = 'contrast(1.05) saturate(1.1)';
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = faceCanvas.width;
  tempCanvas.height = faceCanvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) return 'neutral';
  
  tempCtx.drawImage(faceCanvas, 0, 0);
  ctx.filter = 'none';
  
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  
  let totalR = 0, totalG = 0, totalB = 0;
  let skinPixelCount = 0;
  
  const skinValues: {r: number, g: number, b: number}[] = [];
  
  // Analyze every pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // More precise skin tone detection
    const isSkinTone = 
      r > 60 && g > 40 && b > 20 && // Lower bounds
      r > b && // Red greater than blue
      Math.abs(r - g) < 50 && // Red and green not too far apart
      r > g && // Red greater than green
      r < 240 && g < 220 && b < 200; // Upper bounds (avoid pure white areas)
    
    if (isSkinTone) {
      totalR += r;
      totalG += g;
      totalB += b;
      skinPixelCount++;
      
      // Store individual skin pixel values for median calculation
      skinValues.push({r, g, b});
    }
  }
  
  // If we didn't find enough skin pixels, return neutral
  if (skinPixelCount < 100) return 'neutral';
  
  // Sort skin values to find median (more robust than average)
  skinValues.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
  
  // Get median values (middle of the sorted array)
  const medianIndex = Math.floor(skinValues.length / 2);
  const medianR = skinValues[medianIndex].r;
  const medianG = skinValues[medianIndex].g;
  const medianB = skinValues[medianIndex].b;
  
  // Calculate average RGB values for skin pixels (we'll use both median and average)
  const avgR = totalR / skinPixelCount;
  const avgG = totalG / skinPixelCount;
  const avgB = totalB / skinPixelCount;
  
  // Combine median and average for more stability
  const finalR = (medianR * 0.6) + (avgR * 0.4);
  const finalG = (medianG * 0.6) + (avgG * 0.4);
  const finalB = (medianB * 0.6) + (avgB * 0.4);
  
  // Determine undertone based on the relationship between red, green, and blue
  const redMinusBlue = finalR - finalB;
  const greenMinusBlue = finalG - finalB;
  
  console.log(`Skin tone analysis - R: ${finalR.toFixed(2)}, G: ${finalG.toFixed(2)}, B: ${finalB.toFixed(2)}`);
  console.log(`R-B: ${redMinusBlue.toFixed(2)}, G-B: ${greenMinusBlue.toFixed(2)}`);
  
  // More consistent thresholds for undertone determination
  if (redMinusBlue > 35 && finalR > finalG + 15) {
    return 'warm';
  } else if (redMinusBlue < 20 || finalB > finalG - 5) {
    return 'cool';
  } else {
    return 'neutral';
  }
};

