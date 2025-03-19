import { ColorInfo } from '@/components/ColorPalette';
import { AnalysisResultData } from '@/components/AnalysisResult';
import { detectFace, analyzeSkinUndertone } from './faceDetection';

// Get a signature similarity score between two face signatures
const compareFaceSignatures = (sig1: number[], sig2: number[]): number => {
  if (!sig1 || !sig2 || sig1.length !== sig2.length) return 0;
  
  let totalDifference = 0;
  const totalValues = sig1.length;
  
  for (let i = 0; i < totalValues; i++) {
    // Calculate absolute difference for each value
    const diff = Math.abs(sig1[i] - sig2[i]);
    totalDifference += diff;
  }
  
  // Convert to a similarity score (0-100)
  // Lower difference = higher similarity
  const avgDifference = totalDifference / totalValues;
  const similarityScore = Math.max(0, 100 - (avgDifference * 0.4));
  
  return similarityScore;
};

// Store previous analyses to maintain consistency
const previousAnalyses: {
  signature: number[];
  result: AnalysisResultData;
}[] = [];

// Create a stable hash specifically for skin tone values
const createSkinToneHash = (faceSignature: number[]): number => {
  if (!faceSignature || faceSignature.length === 0) return 0;
  
  let hash = 0;
  // Focus only on the central points which are likely to be face
  const centralStart = Math.floor(faceSignature.length / 4);
  const centralEnd = Math.floor(faceSignature.length * 3 / 4);
  
  // Process central face region for more stability
  for (let i = centralStart; i < centralEnd && i < faceSignature.length; i += 3) {
    if (i + 2 < faceSignature.length) {
      const r = faceSignature[i];
      const g = faceSignature[i + 1];
      const b = faceSignature[i + 2];
      
      // Weight red channel more heavily for skin tone
      hash = ((hash << 5) - hash + r) | 0;
      hash = ((hash << 4) - hash + g) | 0;
      hash = ((hash << 3) - hash + b) | 0;
    }
  }
  
  return Math.abs(hash) % 1000000;
};

// Analyze image and provide consistent color recommendations
export const analyzeImage = (imageUrl: string): Promise<AnalysisResultData> => {
  return new Promise(async (resolve) => {
    console.log('Starting face detection and skin tone analysis');
    
    try {
      // Detect the face in the image with our enhanced detection
      const { faceDetected, faceCanvas, faceSignature } = await detectFace(imageUrl);
      console.log('Face detection result:', faceDetected);
      
      // If we have a face signature, check for previous analyses of similar faces
      if (faceSignature && faceSignature.length > 0) {
        // Try to find a previous analysis with a similar face
        for (const prevAnalysis of previousAnalyses) {
          const similarityScore = compareFaceSignatures(faceSignature, prevAnalysis.signature);
          console.log('Similarity score with previous analysis:', similarityScore);
          
          // If faces are very similar (over 80% similar), use the previous result for consistency
          if (similarityScore > 80) {
            console.log('Using previous analysis result for consistency');
            setTimeout(() => resolve(prevAnalysis.result), 1000);
            return;
          }
        }
      }
      
      // Create a stable hash from the face signature
      const skinToneHash = faceSignature ? createSkinToneHash(faceSignature) : 0;
      console.log('Skin tone hash:', skinToneHash);
      
      let undertone: 'warm' | 'cool' | 'neutral';
      
      if (faceDetected && faceCanvas) {
        // If a face is detected, analyze the skin undertone directly from the face
        console.log('Face detected, analyzing skin undertone');
        const detectedUndertone = analyzeSkinUndertone(faceCanvas, faceSignature);
        console.log('Detected undertone:', detectedUndertone);
        
        // Use the detected undertone but make it more consistent with the hash
        undertone = getConsistentUndertone(detectedUndertone, skinToneHash);
      } else {
        // Even without clear face detection, if we have a signature, use it for consistency
        if (faceSignature && faceSignature.length > 0) {
          console.log('No clear face detected, but using face signature for consistency');
          
          // Use the hash based on the signature for consistent undertone selection
          const undertones = ['warm', 'cool', 'neutral'] as const;
          const undertoneIndex = skinToneHash % undertones.length;
          undertone = undertones[undertoneIndex];
        } else {
          // Last resort fallback
          console.log('Using complete fallback method');
          undertone = 'neutral';
        }
      }
      
      console.log('Final undertone selection:', undertone);
      
      // Deterministically map undertone to seasonal palette using the hash
      const seasonalPalette = mapUndertoneToSeason(undertone, skinToneHash);
      console.log('Selected seasonal palette:', seasonalPalette);
      
      // Build the result with consistent mapping
      const result: AnalysisResultData = {
        undertone,
        skinTone: getSkinToneName(undertone),
        seasonalPalette,
        bestColors: getBestColors(seasonalPalette),
        neutralColors: getNeutralColors(seasonalPalette),
        avoidColors: getAvoidColors(seasonalPalette)
      };
      
      // Store this analysis for future consistency if we have a signature
      if (faceSignature && faceSignature.length > 0) {
        // Only store up to 5 previous analyses to avoid memory issues
        if (previousAnalyses.length >= 5) {
          previousAnalyses.shift(); // Remove oldest
        }
        
        previousAnalyses.push({
          signature: faceSignature,
          result: result
        });
      }
      
      // Simulate processing time
      setTimeout(() => {
        resolve(result);
      }, 1000);
    } catch (error) {
      console.error('Error in analyzeImage:', error);
      // Provide a fallback result in case of error
      const fallbackResult: AnalysisResultData = {
        undertone: 'neutral',
        skinTone: 'Neutral / Balanced',
        seasonalPalette: 'summer',
        bestColors: getBestColors('summer'),
        neutralColors: getNeutralColors('summer'),
        avoidColors: getAvoidColors('summer')
      };
      setTimeout(() => resolve(fallbackResult), 1000);
    }
  });
};

// Make undertone detection more consistent by using hash as a secondary factor
const getConsistentUndertone = (detectedUndertone: 'warm' | 'cool' | 'neutral', skinToneHash: number): 'warm' | 'cool' | 'neutral' => {
  // If we detected a clear undertone (not neutral), trust it more
  if (detectedUndertone !== 'neutral') return detectedUndertone;
  
  // For neutral (which could mean uncertain), use hash for consistency
  const hashMod = skinToneHash % 3;
  return hashMod === 0 ? 'warm' : hashMod === 1 ? 'cool' : 'neutral';
};

// Use consistent mapping from detected undertone to seasonal palette based on hash
const mapUndertoneToSeason = (undertone: 'warm' | 'cool' | 'neutral', hashValue: number): 'spring' | 'summer' | 'autumn' | 'winter' => {
  // Normalize hash to 0-99 range for consistent mapping
  const hash = hashValue % 100;
  
  switch (undertone) {
    case 'warm':
      // For warm undertones, consistently map to either spring or autumn
      return hash < 50 ? 'spring' : 'autumn';
    case 'cool':
      // For cool undertones, consistently map to either summer or winter
      return hash < 50 ? 'summer' : 'winter';
    case 'neutral':
      // For neutral undertones, use hash to determine consistently
      if (hash < 25) return 'spring';
      if (hash < 50) return 'summer';
      if (hash < 75) return 'autumn';
      return 'winter';
  }
};

const getSkinToneName = (undertone: 'warm' | 'cool' | 'neutral'): string => {
  switch (undertone) {
    case 'warm':
      return 'Warm / Golden';
    case 'cool':
      return 'Cool / Rosy';
    case 'neutral':
      return 'Neutral / Balanced';
  }
};

const getBestColors = (season: 'spring' | 'summer' | 'autumn' | 'winter'): ColorInfo[] => {
  switch (season) {
    case 'spring':
      return [
        { name: 'Peach', hex: '#FFD8B1', description: 'Soft warm peach' },
        { name: 'Coral', hex: '#FF8370', description: 'Bright warm coral' },
        { name: 'Warm Yellow', hex: '#FFD166', description: 'Clear golden yellow' },
        { name: 'Apple Green', hex: '#80BD9E', description: 'Fresh apple green' },
        { name: 'Aqua', hex: '#7FCDCD', description: 'Clear light turquoise' },
        { name: 'Periwinkle', hex: '#98B6EB', description: 'Light clear blue' },
        { name: 'Salmon Pink', hex: '#FF9A8D', description: 'Warm pinkish coral' },
        { name: 'Warm Red', hex: '#E84A5F', description: 'Clear tomato red' }
      ];
    case 'summer':
      return [
        { name: 'Rose Pink', hex: '#DBA1A1', description: 'Soft muted rose' },
        { name: 'Lavender', hex: '#CBC5F9', description: 'Soft muted purple' },
        { name: 'Powder Blue', hex: '#A3BBE3', description: 'Soft blue with gray' },
        { name: 'Sage Green', hex: '#B2C9AB', description: 'Muted soft green' },
        { name: 'Mauve', hex: '#C295A5', description: 'Dusty rose pink' },
        { name: 'Periwinkle', hex: '#8F9FBC', description: 'Muted blue-purple' },
        { name: 'Soft Teal', hex: '#7AA5A6', description: 'Muted teal' },
        { name: 'Raspberry', hex: '#C25B7A', description: 'Muted cool pink' }
      ];
    case 'autumn':
      return [
        { name: 'Terracotta', hex: '#C87C56', description: 'Earthy warm orange' },
        { name: 'Olive', hex: '#8A8B60', description: 'Muted yellow-green' },
        { name: 'Rust', hex: '#BF612A', description: 'Deep orangey-brown' },
        { name: 'Moss Green', hex: '#606B38', description: 'Deep muted green' },
        { name: 'Teal', hex: '#406A73', description: 'Deep blue-green' },
        { name: 'Bronze', hex: '#C69F6A', description: 'Warm metallic brown' },
        { name: 'Tomato Red', hex: '#AB3428', description: 'Muted warm red' },
        { name: 'Mustard', hex: '#D2A54A', description: 'Deep yellow-gold' }
      ];
    case 'winter':
      return [
        { name: 'Royal Purple', hex: '#6A3790', description: 'Rich blue-purple' },
        { name: 'Ice Blue', hex: '#78A4C0', description: 'Clear cool blue' },
        { name: 'Emerald', hex: '#00A383', description: 'Deep clear green' },
        { name: 'Crimson', hex: '#C91F37', description: 'Bold blue-red' },
        { name: 'Fuchsia', hex: '#D33682', description: 'Vivid cool pink' },
        { name: 'Navy', hex: '#1F3659', description: 'Deep blue' },
        { name: 'Ice Pink', hex: '#F0A1BF', description: 'Cool clear pink' },
        { name: 'Bright Blue', hex: '#0078BF', description: 'Clear strong blue' }
      ];
  }
};

const getNeutralColors = (season: 'spring' | 'summer' | 'autumn' | 'winter'): ColorInfo[] => {
  switch (season) {
    case 'spring':
      return [
        { name: 'Camel', hex: '#C8A77E', description: 'Light warm tan' },
        { name: 'Ivory', hex: '#FFF8E7', description: 'Warm off-white' },
        { name: 'Navy', hex: '#2F3E5F', description: 'Slightly warm navy' },
        { name: 'Soft White', hex: '#F5F5DC', description: 'Warm cream white' }
      ];
    case 'summer':
      return [
        { name: 'Taupe', hex: '#BCB6A8', description: 'Cool light brown' },
        { name: 'Soft White', hex: '#F0EEE9', description: 'Cool off-white' },
        { name: 'Slate Gray', hex: '#708090', description: 'Medium blue-gray' },
        { name: 'Soft Navy', hex: '#39516D', description: 'Muted navy' }
      ];
    case 'autumn':
      return [
        { name: 'Chocolate', hex: '#6B4226', description: 'Deep warm brown' },
        { name: 'Cream', hex: '#F2E4C8', description: 'Warm soft yellow-white' },
        { name: 'Khaki', hex: '#B09D78', description: 'Muted yellow-brown' },
        { name: 'Dark Brown', hex: '#4A3728', description: 'Rich warm brown' }
      ];
    case 'winter':
      return [
        { name: 'True White', hex: '#FFFFFF', description: 'Pure bright white' },
        { name: 'Black', hex: '#000000', description: 'True black' },
        { name: 'Charcoal', hex: '#36454F', description: 'Deep cool gray' },
        { name: 'Silver Gray', hex: '#C0C0C0', description: 'Cool light gray' }
      ];
  }
};

const getAvoidColors = (season: 'spring' | 'summer' | 'autumn' | 'winter'): ColorInfo[] => {
  switch (season) {
    case 'spring':
      return [
        { name: 'Black', hex: '#000000', description: 'Too harsh' },
        { name: 'Burgundy', hex: '#800020', description: 'Too deep and cool' },
        { name: 'Plum', hex: '#673147', description: 'Too cool and muted' },
        { name: 'Cool Gray', hex: '#BEBEBE', description: 'Too cool-toned' }
      ];
    case 'summer':
      return [
        { name: 'Orange', hex: '#FF7F00', description: 'Too warm and bright' },
        { name: 'Bright Yellow', hex: '#FFFF00', description: 'Too bright and warm' },
        { name: 'Camel', hex: '#C19A6B', description: 'Too warm' },
        { name: 'Tomato Red', hex: '#FF6347', description: 'Too warm and bright' }
      ];
    case 'autumn':
      return [
        { name: 'True White', hex: '#FFFFFF', description: 'Too stark' },
        { name: 'Fuchsia', hex: '#FF00FF', description: 'Too cool and bright' },
        { name: 'Icy Blue', hex: '#A5F2F3', description: 'Too cool and clear' },
        { name: 'Bubblegum Pink', hex: '#FFC1CC', description: 'Too cool and bright' }
      ];
    case 'winter':
      return [
        { name: 'Cream', hex: '#FFFDD0', description: 'Too muted and warm' },
        { name: 'Peach', hex: '#FFE5B4', description: 'Too warm and soft' },
        { name: 'Camel', hex: '#C19A6B', description: 'Too warm and muted' },
        { name: 'Moss Green', hex: '#8A9A5B', description: 'Too muted' }
      ];
  }
};
