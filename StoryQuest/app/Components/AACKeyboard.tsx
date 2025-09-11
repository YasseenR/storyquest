//StoryQuest/app/Components/AACKeyboard.tsx

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import useAACSounds from "./useAACSounds";

 interface AACKeyboardProps {
   onSelect: (word: string) => void; 
   symbols: { word: string; image: string }[];
   backgroundColor?: string;
   buttonColor?: string;
   blockButtons?: boolean;
 }

 const AACKeyboard: React.FC<AACKeyboardProps> = ({ 
  onSelect, 
  symbols, 
  backgroundColor = "#b4fcdc", 
  buttonColor = "#63d2cb",
  blockButtons = false
}) => {

  const { playSound } = useAACSounds();
  
     // Style for the blocking overlay
     const blockAACButtonOverlayStyle: React.CSSProperties = {
         position: 'absolute',
         top: 0,
         left: 0,
         width: '100%',
         height: '100%',
         zIndex: 10,
         backgroundColor: 'rgba(0, 0, 0, 0.4)',
         cursor: 'not-allowed',
     };

     const handleButtonClick = (word: string) => {
    // Play sound immediately during the click handler
    playSound(word);
    
    // Delay the selection handling slightly to ensure audio plays
    setTimeout(() => {
      onSelect(word);
    }, 0);
  };


   return (
     <div 
      className="p-2 border border-gray-300 rounded-lg shadow-md transform transition duration-500 hover:scale-105"
      style={{ backgroundColor }}
      >
      {/* Block overlay */}
      {blockButtons && (
          <div style={blockAACButtonOverlayStyle}></div>
      )}
       <h3 className="text-xl font-bold mb-2 text-center text-white">AAC Keyboard</h3>
       <div className="grid grid-cols-2 gap-2">
         {symbols.map((symbol) => (
           <motion.button
             key={symbol.word}
             className="p-1 text-white rounded flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
             style={{ backgroundColor: buttonColor }}
             onClick={() => handleButtonClick(symbol.word)}
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             aria-label={`Select ${symbol.word}`}
             tabIndex={0}
           >
             <img src={symbol.image} alt={symbol.word} className="w-16 h-16 mb-1" />
             <span className="text-sm md:text-base">{symbol.word}</span>
           </motion.button>
         ))}
       </div>
     </div>
   );
 };

 export default AACKeyboard;

 