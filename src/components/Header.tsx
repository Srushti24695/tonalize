
import React from 'react';

const Header = () => {
  return (
    <header className="w-full max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col items-center space-y-2 animate-fade-in">
        <div className="text-xs font-medium text-primary/80 tracking-wider uppercase">
          Skin Tone Analysis
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Tonalize
        </h1>
        <p className="text-muted-foreground text-center max-w-lg mt-2">
          Upload your photo to discover your skin's undertones and find your perfect color palette
        </p>
      </div>
    </header>
  );
};

export default Header;
