
import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full max-w-4xl mx-auto py-8 px-4 mt-auto">
      <div className="flex flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground text-center">
          undertoneally — Find your perfect color palette based on your unique skin tone
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          For best results, use a well-lit photo with natural lighting
        </p>
      </div>
    </footer>
  );
};

export default Footer;
