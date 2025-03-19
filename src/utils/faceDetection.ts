
/**
 * Face detection and skin tone analysis utility
 */

// Helper function to extract faces from an image with improved consistency
export const detectFace = (imageUrl: string): Promise<{
  faceDetected: boolean;
  faceCanvas?: HTMLCanvasElement;
  faceSignature?: number[];
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
      
      // Use exact dimensions for all face detection
      const fixedSize = 500; 
      
      // Set canvas to normalized size
      canvas.width = fixedSize;
      canvas.height = fixedSize;
      
      // Strong normalization to handle different lighting conditions
      ctx.filter = 'contrast(1.3) brightness(1.1) saturate(0.85)';
      ctx.drawImage(img, 0, 0, fixedSize, fixedSize);
      ctx.filter = 'none';
      
      // Get the central region where face usually is
      const centerRegionSize = Math.floor(fixedSize * 0.7); // 70% of the image
      const startX = Math.floor((fixedSize - centerRegionSize) / 2);
      const startY = Math.floor((fixedSize - centerRegionSize) / 2);
      
      // Get image data from the potential face region
      const centerRegionData = ctx.getImageData(
        startX, startY, centerRegionSize, centerRegionSize
      );
      
      // Calculate face signature
      const faceSignature = calculateFaceSignature(centerRegionData);
      
      // Check if there is significant skin tone color in this region
      const hasSkinTone = analyzeForSkinTone(centerRegionData.data);
      
      if (hasSkinTone) {
        // Create a new canvas with just the face region
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = centerRegionSize;
        faceCanvas.height = centerRegionSize;
        const faceCtx = faceCanvas.getContext('2d');
        
        if (faceCtx) {
          faceCtx.putImageData(centerRegionData, 0, 0);
          resolve({ 
            faceDetected: true, 
            faceCanvas,
            faceSignature
          });
        } else {
          resolve({ 
            faceDetected: true,
            faceSignature
          });
        }
      } else {
        // Even without a clear face detection, return the signature
        // This will help provide consistent results
        resolve({ 
          faceDetected: false,
          faceSignature
        });
      }
    };
    
    img.onerror = () => {
      resolve({ faceDetected: false });
    };
    
    img.src = imageUrl;
  });
};

// Calculate a unique signature for a face based on color distribution
const calculateFaceSignature = (imageData: ImageData): number[] => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Divide the image into a 5x5 grid for sampling
  const gridSize = 5;
  const signature: number[] = [];
  
  const cellWidth = Math.floor(width / gridSize);
  const cellHeight = Math.floor(height / gridSize);
  
  // Sample each cell in the grid
  for (let gridY = 0; gridY < gridSize; gridY++) {
    for (let gridX = 0; gridX < gridSize; gridX++) {
      // Calculate the starting pixel of this cell
      const startX = gridX * cellWidth;
      const startY = gridY * cellHeight;
      
      let totalR = 0, totalG = 0, totalB = 0;
      let pixelCount = 0;
      
      // Sample pixels in this cell
      for (let y = startY; y < startY + cellHeight && y < height; y++) {
        for (let x = startX; x < startX + cellWidth && x < width; x++) {
          const pixelIndex = (y * width + x) * 4;
          
          const r = data[pixelIndex];
          const g = data[pixelIndex + 1];
          const b = data[pixelIndex + 2];
          
          totalR += r;
          totalG += g;
          totalB += b;
          pixelCount++;
        }
      }
      
      // Calculate average color for this cell
      if (pixelCount > 0) {
        const avgR = Math.round(totalR / pixelCount);
        const avgG = Math.round(totalG / pixelCount);
        const avgB = Math.round(totalB / pixelCount);
        
        // Store the color values in the signature
        signature.push(avgR, avgG, avgB);
      }
    }
  }
  
  return signature;
};

// Improved skin tone detection with broader range
const analyzeForSkinTone = (pixels: Uint8ClampedArray): boolean => {
  // Count pixels that are in the general skin tone range
  let skinTonePixelCount = 0;
  const totalPixels = pixels.length / 4;
  
  // Collect color distribution to check for face-like patterns
  const colorHistogram: Record<string, number> = {};
  
  // Analyze every pixel with very broad skin tone range
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    
    // Very broad skin tone detection to handle all ethnicities and lighting
    const isSkinTone = 
      r > 40 && g > 30 && b > 20 && // Lower bounds (more relaxed)
      r > b - 15 && // Red generally greater than blue (with more tolerance)
      Math.abs(r - g) < 70 && // Red and green not too far apart (increased tolerance)
      r > g - 15 && // Red generally greater than green (with more tolerance)
      r < 250 && g < 250 && b < 250; // Upper bounds (avoid pure white areas)
    
    if (isSkinTone) {
      skinTonePixelCount++;
      
      // Add to color histogram (simplified to 4 value buckets for more stability)
      const rBucket = Math.floor(r / 25);
      const gBucket = Math.floor(g / 25);
      const bBucket = Math.floor(b / 25);
      const colorKey = `${rBucket}_${gBucket}_${bBucket}`;
      
      colorHistogram[colorKey] = (colorHistogram[colorKey] || 0) + 1;
    }
  }
  
  // Calculate the percentage of skin tone pixels - lower threshold for better detection
  const skinTonePercentage = (skinTonePixelCount / totalPixels) * 100;
  
  // Check color histogram for face-like distribution
  const histogramEntries = Object.entries(colorHistogram);
  const hasSkinToneDistribution = histogramEntries.length >= 2; // Need at least 2 color clusters
  
  // If at least 15% of pixels look like skin tone and we have diverse skin tone colors, we likely found a face
  return skinTonePercentage > 15 && hasSkinToneDistribution;
};

// Extract skin undertone from face image with more consistent results
export const analyzeSkinUndertone = (faceCanvas: HTMLCanvasElement, faceSignature?: number[]): 'warm' | 'cool' | 'neutral' => {
  const ctx = faceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 'neutral';
  
  // Apply stronger color correction to normalize lighting conditions
  ctx.filter = 'contrast(1.2) saturate(0.95) brightness(1.1)';
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
  
  // If we have a face signature, use it for additional stability
  if (faceSignature && faceSignature.length >= 6) {
    // Add signature color samples to the skin values for more stability
    for (let i = 0; i < faceSignature.length; i += 3) {
      const r = faceSignature[i];
      const g = faceSignature[i + 1];
      const b = faceSignature[i + 2];
      
      // Only add values that look like skin
      if (isLikelySkin(r, g, b)) {
        totalR += r;
        totalG += g;
        totalB += b;
        skinPixelCount++;
        skinValues.push({r, g, b});
      }
    }
  }
  
  // Analyze every pixel with broader criteria
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    if (isLikelySkin(r, g, b)) {
      totalR += r;
      totalG += g;
      totalB += b;
      skinPixelCount++;
      
      // Store individual skin pixel values for median calculation
      skinValues.push({r, g, b});
    }
  }
  
  // If we didn't find enough skin pixels, return neutral
  if (skinPixelCount < 30) return 'neutral';
  
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
  
  // Use 70% median and 30% average for more stability
  const finalR = (medianR * 0.7) + (avgR * 0.3);
  const finalG = (medianG * 0.7) + (avgG * 0.3);
  const finalB = (medianB * 0.7) + (avgB * 0.3);
  
  // Calculate ratios instead of absolute differences for better consistency
  const redBlueRatio = finalR / finalB;
  const redGreenRatio = finalR / finalG;
  
  console.log(`Skin tone analysis - R: ${finalR.toFixed(2)}, G: ${finalG.toFixed(2)}, B: ${finalB.toFixed(2)}`);
  console.log(`R/B ratio: ${redBlueRatio.toFixed(2)}, R/G ratio: ${redGreenRatio.toFixed(2)}`);
  
  // Use ratios instead of absolute differences for better consistency
  if (redBlueRatio > 1.15 && redGreenRatio > 1.04) {
    return 'warm';
  } else if (redBlueRatio < 1.08 || finalB > finalG) {
    return 'cool';
  } else {
    return 'neutral';
  }
};

// Helper function to identify skin tones more consistently
const isLikelySkin = (r: number, g: number, b: number): boolean => {
  return r > 40 && g > 30 && b > 20 && // Lower bounds (relaxed)
    r > b - 15 && // Red greater than blue (with tolerance)
    Math.abs(r - g) < 70 && // Red and green not too far apart (increased tolerance)
    r > g - 15 && // Red generally greater than green (with tolerance)
    r < 250 && g < 240 && b < 240; // Upper bounds (avoid pure white areas)
};
