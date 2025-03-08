
import React from 'react';
import { Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ColorPalette, { ColorInfo } from './ColorPalette';
import { Button } from '@/components/ui/button';

export interface AnalysisResultData {
  undertone: 'warm' | 'cool' | 'neutral';
  skinTone: string;
  seasonalPalette: 'spring' | 'summer' | 'autumn' | 'winter';
  bestColors: ColorInfo[];
  neutralColors: ColorInfo[];
  avoidColors: ColorInfo[];
}

interface AnalysisResultProps {
  result: AnalysisResultData;
  onReset: () => void;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onReset }) => {
  const undertoneDescriptions = {
    warm: "Your skin has golden, peachy, or yellow undertones. You'll shine in warm colors that complement these golden qualities.",
    cool: "Your skin has rosy, pink, or bluish undertones. Cool-toned colors will enhance your natural coloring.",
    neutral: "Your skin has a balanced undertone that's neither distinctly warm nor cool. This gives you versatility in color choices."
  };
  
  const seasonalPaletteDescriptions = {
    spring: "As a Spring type, you have a warm and clear quality to your coloring. Your best colors are bright, warm, and clear.",
    summer: "As a Summer type, you have a cool and muted quality to your coloring. Soft, cool colors with blue undertones suit you best.",
    autumn: "As an Autumn type, you have warm, muted coloring. Rich, warm, and earthy colors complement your natural palette.",
    winter: "As a Winter type, you have cool, clear coloring with high contrast. Bold, cool colors create harmony with your natural look."
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-up">
      <div className="glass-panel rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="h-3 w-3 rounded-full animate-pulse" 
            style={{ backgroundColor: `var(--color-skin-${result.undertone})` }} />
          <h2 className="text-xl font-semibold">Analysis Results</h2>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="glass-panel rounded-lg p-4 bg-secondary/50">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Your undertone is {result.undertone}</p>
                <p className="text-sm text-muted-foreground">
                  {undertoneDescriptions[result.undertone]}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass-panel rounded-lg p-4 bg-secondary/50">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Your color season is {result.seasonalPalette}</p>
                <p className="text-sm text-muted-foreground">
                  {seasonalPaletteDescriptions[result.seasonalPalette]}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="best">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="best" className="flex-1">Best Colors</TabsTrigger>
            <TabsTrigger value="neutral" className="flex-1">Neutral Options</TabsTrigger>
            <TabsTrigger value="avoid" className="flex-1">Colors to Avoid</TabsTrigger>
          </TabsList>
          
          <TabsContent value="best" className="mt-0">
            <ColorPalette colors={result.bestColors} title="Colors That Enhance Your Complexion" />
          </TabsContent>
          
          <TabsContent value="neutral" className="mt-0">
            <ColorPalette colors={result.neutralColors} title="Versatile Colors for Your Palette" />
          </TabsContent>
          
          <TabsContent value="avoid" className="mt-0">
            <ColorPalette colors={result.avoidColors} title="Colors That May Wash You Out" />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-center mt-8">
          <Button onClick={onReset} variant="outline">
            Analyze Another Photo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResult;
