
import React from 'react';
import { cn } from '@/lib/utils';

export interface ColorInfo {
  name: string;
  hex: string;
  description: string;
}

interface ColorPaletteProps {
  colors: ColorInfo[];
  title: string;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ colors, title }) => {
  return (
    <div className="mb-8 animate-fade-up animate-stagger-3">
      <h3 className="text-lg font-medium mb-3">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {colors.map((color, index) => (
          <div
            key={color.name}
            className={cn(
              "glass-panel rounded-lg p-3 transition-all duration-300 hover:shadow-md",
              `animate-fade-up animate-stagger-${(index % 5) + 1}`
            )}
          >
            <div
              className="color-swatch mb-2"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            ></div>
            <div className="text-sm font-medium">{color.name}</div>
            <div className="text-xs text-muted-foreground">{color.hex}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorPalette;
