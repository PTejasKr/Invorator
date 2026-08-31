import React, { useState } from 'react';
import { Rnd } from 'react-rnd';

export default function StampCanvas({ children, stampUrl, signatureUrl, isInteractive = true }) {
  const [stampPos, setStampPos] = useState({ x: 300, y: 600, width: 120, height: 120 });
  const [sigPos, setSigPos] = useState({ x: 450, y: 650, width: 150, height: 50 });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* The Invoice Document underneath */}
      <div className="invoice-document" style={{ width: '100%' }}>
        {children}
      </div>

      {/* Draggable Stamp Overlay */}
      {stampUrl && (
        <Rnd
          position={{ x: stampPos.x, y: stampPos.y }}
          size={{ width: stampPos.width, height: stampPos.height }}
          onDragStop={(e, d) => {
            setStampPos(prev => ({ ...prev, x: d.x, y: d.y }));
          }}
          onResizeStop={(e, direction, ref, delta, position) => {
            setStampPos({
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height),
              ...position,
            });
          }}
          bounds="parent"
          disableDragging={!isInteractive}
          enableResizing={isInteractive}
          style={{ zIndex: 50 }}
        >
          <img 
            src={stampUrl} 
            alt="Company Stamp" 
            style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.8, pointerEvents: 'none' }} 
          />
        </Rnd>
      )}

      {/* Draggable Signature Overlay */}
      {signatureUrl && (
        <Rnd
          position={{ x: sigPos.x, y: sigPos.y }}
          size={{ width: sigPos.width, height: sigPos.height }}
          onDragStop={(e, d) => {
            setSigPos(prev => ({ ...prev, x: d.x, y: d.y }));
          }}
          onResizeStop={(e, direction, ref, delta, position) => {
            setSigPos({
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height),
              ...position,
            });
          }}
          bounds="parent"
          disableDragging={!isInteractive}
          enableResizing={isInteractive}
          style={{ zIndex: 50 }}
        >
          <img 
            src={signatureUrl} 
            alt="Authorized Signature" 
            style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.9, pointerEvents: 'none' }} 
          />
        </Rnd>
      )}
    </div>
  );
}
