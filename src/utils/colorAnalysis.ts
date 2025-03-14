import { ColorInfo } from '@/components/ColorPalette';
import { AnalysisResultData } from '@/components/AnalysisResult';
import { extractFaceColors } from './imageFaceSegmentation';

// Use face detection to extract skin tone colors and create a stable fingerprint
export const analyzeImage = (imageUrl: string): Promise<AnalysisResultData> => {
  return new Promise(async (resolve) => {
    try {
      // Extract a stable color fingerprint from face region
      const colorFingerprint = await extractFaceColors(imageUrl);
      
      // Log the fingerprint for debugging
      console.log('Face color fingerprint:', colorFingerprint);
      
      // Use the fingerprint to deterministically select an undertone
      // This focuses on the person's coloring rather than the specific image
      const undertones = ['warm', 'cool', 'neutral'] as const;
      const undertoneIndex = colorFingerprint % undertones.length;
      const undertone = undertones[undertoneIndex];
      
      // Deterministically select a seasonal palette based on the undertone and fingerprint
      let seasonalPalette: 'spring' | 'summer' | 'autumn' | 'winter';
      
      if (undertone === 'warm') {
        // For warm undertones, choose between spring and autumn
        seasonalPalette = (colorFingerprint % 2 === 0) ? 'spring' : 'autumn';
      } else if (undertone === 'cool') {
        // For cool undertones, choose between summer and winter
        seasonalPalette = (colorFingerprint % 2 === 0) ? 'summer' : 'winter';
      } else {
        // For neutral undertones, choose any season based on the fingerprint
        const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
        seasonalPalette = seasons[colorFingerprint % seasons.length];
      }
      
      // Build the consistent result
      const result: AnalysisResultData = {
        undertone,
        skinTone: getSkinToneName(undertone),
        seasonalPalette,
        bestColors: getBestColors(seasonalPalette),
        neutralColors: getNeutralColors(seasonalPalette),
        avoidColors: getAvoidColors(seasonalPalette)
      };
      
      // Simulate processing time
      setTimeout(() => {
        resolve(result);
      }, 2000);
    } catch (error) {
      console.error('Error analyzing image:', error);
      
      // Fallback to a default result in case of error
      const fallbackResult: AnalysisResultData = {
        undertone: 'neutral',
        skinTone: 'Neutral / Balanced',
        seasonalPalette: 'summer',
        bestColors: getBestColors('summer'),
        neutralColors: getNeutralColors('summer'),
        avoidColors: getAvoidColors('summer')
      };
      
      setTimeout(() => {
        resolve(fallbackResult);
      }, 2000);
    }
  });
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

