
interface FaceDetectionResult {
  hasFace: boolean;
  segmentedImageData?: string;
  faceRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Segments the person from the background and detects the face
 * @param imageUrl - The base64 string of the image
 * @returns Promise with face detection result
 */
export const segmentPersonAndDetectFace = async (imageUrl: string): Promise<FaceDetectionResult> => {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      // Create canvas for image processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        resolve({ hasFace: false });
        return;
      }
      
      // Set canvas dimensions
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Draw the image
      ctx.drawImage(image, 0, 0);
      
      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Attempt to find face through skin tone detection
      const faceRegion = detectFaceRegion(imageData);
      
      if (!faceRegion) {
        // No face detected
        resolve({ hasFace: false });
        return;
      }
      
      // Create segmented image focusing on face
      const segmentedCanvas = document.createElement('canvas');
      const segmentedCtx = segmentedCanvas.getContext('2d');
      if (!segmentedCtx) {
        resolve({ hasFace: false });
        return;
      }
      
      // Set dimensions and draw cropped face with some padding
      const padding = Math.max(faceRegion.width, faceRegion.height) * 0.5;
      
      const croppedX = Math.max(0, faceRegion.x - padding);
      const croppedY = Math.max(0, faceRegion.y - padding);
      const croppedWidth = Math.min(canvas.width - croppedX, faceRegion.width + padding * 2);
      const croppedHeight = Math.min(canvas.height - croppedY, faceRegion.height + padding * 2);
      
      segmentedCanvas.width = croppedWidth;
      segmentedCanvas.height = croppedHeight;
      
      // Draw only the face region with padding
      segmentedCtx.drawImage(
        canvas, 
        croppedX, croppedY, croppedWidth, croppedHeight,
        0, 0, croppedWidth, croppedHeight
      );
      
      // Convert to data URL
      const segmentedImageData = segmentedCanvas.toDataURL('image/png');
      
      resolve({
        hasFace: true,
        segmentedImageData,
        faceRegion: {
          x: croppedX,
          y: croppedY,
          width: croppedWidth,
          height: croppedHeight
        }
      });
    };
    
    image.onerror = () => {
      resolve({ hasFace: false });
    };
    
    image.src = imageUrl;
  });
};

/**
 * Detects a face region in an image using skin tone detection
 */
function detectFaceRegion(imageData: ImageData) {
  const { data, width, height } = imageData;
  
  // Array to store skin tone pixels
  const skinPixels: { x: number; y: number }[] = [];
  
  // Detect skin pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      
      // Simple skin detection based on RGB values
      // This is a simplified approach; more sophisticated algorithms exist
      if (isSkinTone(r, g, b)) {
        skinPixels.push({ x, y });
      }
    }
  }
  
  // If not enough skin pixels found, likely no face
  if (skinPixels.length < (width * height * 0.01)) {
    return null;
  }
  
  // Find the bounding box of skin pixels (potential face)
  let minX = width, minY = height, maxX = 0, maxY = 0;
  
  for (const pixel of skinPixels) {
    minX = Math.min(minX, pixel.x);
    minY = Math.min(minY, pixel.y);
    maxX = Math.max(maxX, pixel.x);
    maxY = Math.max(maxY, pixel.y);
  }
  
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  
  // Face aspect ratio check (typical face is taller than wide or roughly square)
  const aspectRatio = faceWidth / faceHeight;
  if (aspectRatio > 2 || aspectRatio < 0.5) {
    // Not likely a face
    return null;
  }
  
  // Check for face-like density of skin pixels in the region
  const faceArea = faceWidth * faceHeight;
  const skinDensity = skinPixels.length / faceArea;
  
  if (skinDensity < 0.2) {
    // Too sparse to be a face
    return null;
  }
  
  return {
    x: minX,
    y: minY,
    width: faceWidth,
    height: faceHeight
  };
}

/**
 * Checks if an RGB color is likely to be a skin tone
 */
function isSkinTone(r: number, g: number, b: number): boolean {
  // Various skin tone detection rules
  // These rules cover a wide range of skin tones
  
  // Rule 1: Common skin tone range
  const isSkinRange = 
    r > 60 && g > 40 && b > 20 && // Lower bound
    r > g && r > b && // Red dominant
    r - Math.min(g, b) > 15 && // Red separation
    Math.abs(g - b) < 15; // Green and blue are close
  
  // Rule 2: Detect lighter skin tones
  const isLightSkin = 
    r > 200 && g > 140 && b > 90 &&
    r > g && g > b &&
    r - b > 30;
  
  // Rule 3: Detect darker skin tones
  const isDarkSkin = 
    r > 80 && r < 200 &&
    g > 30 && g < 170 &&
    b > 20 && b < 150 &&
    r > g && g > b;
  
  return isSkinRange || isLightSkin || isDarkSkin;
}

/**
 * Gets the dominant colors from the face region for skin tone analysis
 */
export const extractFaceColors = (imageUrl: string): Promise<number> => {
  return new Promise(async (resolve) => {
    // First try to segment and find face
    const faceResult = await segmentPersonAndDetectFace(imageUrl);
    
    // Use the segmented image if available, otherwise use original
    const sourceImage = faceResult.hasFace ? faceResult.segmentedImageData! : imageUrl;
    
    // Create an image element
    const image = new Image();
    image.onload = () => {
      // Create canvas for color extraction
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        // Fallback to the original method if canvas fails
        const baseString = sourceImage.split(',')[1] || sourceImage;
        const fallbackFingerprint = createStableFingerprint(baseString);
        resolve(fallbackFingerprint);
        return;
      }
      
      // Set canvas dimensions
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Draw the image
      ctx.drawImage(image, 0, 0);
      
      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Extract skin tone colors
      const skinTones: [number, number, number][] = [];
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (isSkinTone(r, g, b)) {
          skinTones.push([r, g, b]);
        }
      }
      
      // Calculate the average skin tone if we found skin pixels
      if (skinTones.length > 0) {
        let sumR = 0, sumG = 0, sumB = 0;
        
        for (const [r, g, b] of skinTones) {
          sumR += r;
          sumG += g;
          sumB += b;
        }
        
        const avgR = Math.round(sumR / skinTones.length);
        const avgG = Math.round(sumG / skinTones.length);
        const avgB = Math.round(sumB / skinTones.length);
        
        // Create a skin tone fingerprint based on the average
        const colorFingerprint = (avgR << 16) | (avgG << 8) | avgB;
        resolve(Math.abs(colorFingerprint));
      } else {
        // Fallback if no skin detected
        const baseString = sourceImage.split(',')[1] || sourceImage;
        const fallbackFingerprint = createStableFingerprint(baseString);
        resolve(fallbackFingerprint);
      }
    };
    
    image.onerror = () => {
      // Fallback to the original method if image loading fails
      const baseString = sourceImage.split(',')[1] || sourceImage;
      const fallbackFingerprint = createStableFingerprint(baseString);
      resolve(fallbackFingerprint);
    };
    
    image.src = sourceImage;
  });
};

/**
 * Creates a stable fingerprint from image data
 * Fallback method if face detection fails
 */
function createStableFingerprint(baseString: string): number {
  const samplePoints = 20;
  const sampleSize = Math.floor(baseString.length / samplePoints);
  
  let colorFingerprint = 0;
  
  for (let i = 0; i < samplePoints; i++) {
    const sampleStart = i * sampleSize;
    let sampleSum = 0;
    
    for (let j = 0; j < Math.min(sampleSize, 50); j++) {
      if (sampleStart + j < baseString.length) {
        sampleSum += baseString.charCodeAt(sampleStart + j);
      }
    }
    
    colorFingerprint = ((colorFingerprint << 3) - colorFingerprint) + (sampleSum % 255);
    colorFingerprint = colorFingerprint & colorFingerprint;
  }
  
  return Math.abs(colorFingerprint);
}
