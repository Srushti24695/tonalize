
// Simple face validation based on image analysis
// In a production app, this would use an actual face detection API

export const validateFaceInImage = (imageUrl: string): Promise<{
  isValid: boolean;
  message: string;
}> => {
  return new Promise((resolve) => {
    // Create an image element to analyze
    const img = new Image();
    img.src = imageUrl;
    
    img.onload = () => {
      // This is a simplified face validation
      // In a real app, this would use computer vision APIs like:
      // - TensorFlow.js face detection
      // - Microsoft Azure Face API
      // - AWS Rekognition
      // - Google Cloud Vision API
      
      // Create a canvas to analyze the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({
          isValid: false,
          message: "Couldn't analyze image. Please try another photo."
        });
        return;
      }
      
      // Set canvas size to analyze the image efficiently
      const maxDimension = 300; // Increased from 100 to get better analysis
      const aspectRatio = img.width / img.height;
      canvas.width = aspectRatio >= 1 ? maxDimension : maxDimension * aspectRatio;
      canvas.height = aspectRatio >= 1 ? maxDimension / aspectRatio : maxDimension;
      
      // Draw the image to canvas for analysis
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Simple check for image aspect ratio
      // Face photos typically have aspect ratios close to 1:1
      if (aspectRatio > 1.8 || aspectRatio < 0.5) {
        resolve({
          isValid: false,
          message: "This image doesn't seem to contain a properly framed face. Please upload a photo that clearly shows your face."
        });
        return;
      }
      
      // Enhanced checks for skin tones and face-like patterns
      
      // 1. Check for skin tone pixels
      let skinTonePixels = 0;
      let totalPixels = canvas.width * canvas.height;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Simple skin tone detection - looks for pixels in the typical human skin color range
        // This is a very simplified approach and won't work for all skin tones perfectly
        if (isSkinTone(r, g, b)) {
          skinTonePixels++;
        }
      }
      
      // If less than 15% of pixels appear to be skin tones, likely not a face photo
      const skinToneRatio = skinTonePixels / totalPixels;
      if (skinToneRatio < 0.15) {
        resolve({
          isValid: false,
          message: "We couldn't detect a human face in this image. Please upload a clear photo of your face."
        });
        return;
      }
      
      // 2. Check for color variation - faces have variation in specific patterns
      let colorVariation = calculateColorVariation(data);
      
      // Very low variation might indicate a blank or uniform image
      // Very high variation might indicate a complex scene, not a face
      if (colorVariation < 10 || colorVariation > 100) {
        resolve({
          isValid: false,
          message: "This doesn't appear to be a photo with a clearly visible face. Please upload a clear portrait photo."
        });
        return;
      }
      
      // 3. Check color distribution - faces tend to have certain distribution patterns
      const isDistributionFacelike = analyzeColorDistribution(imageData, canvas.width, canvas.height);
      
      if (!isDistributionFacelike) {
        resolve({
          isValid: false,
          message: "We couldn't detect a human face in this image. Please upload a photo that clearly shows your face."
        });
        return;
      }
      
      // Passed all checks, consider it a valid face
      resolve({
        isValid: true,
        message: "Face detected"
      });
    };
    
    img.onerror = () => {
      resolve({
        isValid: false,
        message: "Failed to load the image. Please try another photo."
      });
    };
  });
};

// Helper function to detect if a pixel is in skin tone range
// This is a simplified approach and won't work for all skin tones
function isSkinTone(r: number, g: number, b: number): boolean {
  // Various skin tone ranges from very light to very dark
  // Check if within general skin tone ranges
  
  // Common skin tone properties:
  // 1. Red channel value is typically higher than blue
  // 2. Red and green channels are usually not too far apart
  // 3. Blue is typically the lowest channel
  
  const isRGreaterThanB = r > b;
  const isRGCloseEnough = Math.abs(r - g) < 50;
  const isNotGrayscale = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b)) > 10;
  
  // Different skin tone categories
  const isVeryLight = r > 200 && g > 170 && b > 150 && isRGreaterThanB;
  const isLight = r > 160 && g > 120 && b > 90 && isRGreaterThanB;
  const isMedium = r > 120 && g > 80 && b > 50 && isRGreaterThanB;
  const isDark = r > 80 && g > 50 && b > 30 && isRGreaterThanB;
  const isVeryDark = r > 40 && g > 20 && b > 10 && isRGreaterThanB;
  
  return (isVeryLight || isLight || isMedium || isDark || isVeryDark) && isRGCloseEnough && isNotGrayscale;
}

// Calculate normalized color variation in the image
function calculateColorVariation(data: Uint8ClampedArray): number {
  let variation = 0;
  let prevPixel = [data[0], data[1], data[2]];
  
  // Sample pixels to check for variation
  for (let i = 4; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate difference from previous pixel
    const diff = Math.abs(r - prevPixel[0]) + 
                 Math.abs(g - prevPixel[1]) + 
                 Math.abs(b - prevPixel[2]);
    
    variation += diff;
    prevPixel = [r, g, b];
  }
  
  // Normalize
  return variation / (data.length / 64);
}

// Analyze if the color distribution looks like a face
// Faces typically have specific patterns - central area with skin tones
// surrounded by different colors (hair, background, etc)
function analyzeColorDistribution(imageData: ImageData, width: number, height: number): boolean {
  const data = imageData.data;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const centerRadius = Math.min(width, height) / 3;
  
  let centerSkinPixels = 0;
  let centerTotalPixels = 0;
  let edgeSkinPixels = 0;
  let edgeTotalPixels = 0;
  
  // Count skin tone pixels in central region vs edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Calculate distance from center
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      
      if (distance < centerRadius) {
        // Center region
        centerTotalPixels++;
        if (isSkinTone(r, g, b)) {
          centerSkinPixels++;
        }
      } else {
        // Edge region
        edgeTotalPixels++;
        if (isSkinTone(r, g, b)) {
          edgeSkinPixels++;
        }
      }
    }
  }
  
  // Calculate ratios
  const centerSkinRatio = centerSkinPixels / centerTotalPixels;
  const edgeSkinRatio = edgeSkinPixels / edgeTotalPixels;
  
  // Face photos typically have more skin tones in center than edges
  // and the center has a significant amount of skin tone pixels
  return centerSkinRatio > 0.3 && centerSkinRatio > edgeSkinRatio * 1.5;
}

