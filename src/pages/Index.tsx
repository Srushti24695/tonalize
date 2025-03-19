
import React, { useState } from 'react';
import Header from '@/components/Header';
import ImageUploader from '@/components/ImageUploader';
import AnalysisResult from '@/components/AnalysisResult';
import Footer from '@/components/Footer';
import { analyzeImage } from '@/utils/colorAnalysis';
import { toast } from 'sonner';
import { AnalysisResultData } from '@/components/AnalysisResult';

const Index = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultData | null>(null);

  const handleImageUpload = async (imageUrl: string) => {
    setImage(imageUrl);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      toast.info('Analyzing your skin tones...', {
        duration: 2000,
      });
      
      const result = await analyzeImage(imageUrl);
      
      setAnalysisResult(result);
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error('Error analyzing image. Please try again.');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setAnalysisResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50">
      <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
        <Header />
        
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className={`w-full ${analysisResult ? 'md:w-1/3' : 'md:w-full'} transition-all duration-500`}>
            <ImageUploader 
              onImageUpload={handleImageUpload} 
              isAnalyzing={isAnalyzing}
            />
            
            {isAnalyzing && (
              <div className="w-full flex justify-center">
                <div className="glass-panel rounded-lg p-4 flex items-center gap-3 animate-pulse-soft">
                  <div className="h-3 w-3 rounded-full bg-primary"></div>
                  <p className="text-sm font-medium">Analyzing your skin tones...</p>
                </div>
              </div>
            )}
          </div>
          
          {analysisResult && (
            <div className="w-full md:w-2/3 transition-all duration-500">
              <AnalysisResult 
                result={analysisResult}
                onReset={handleReset}
              />
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
