import { useState, useRef, useEffect } from 'react';

export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open || !iconRef.current || !bubbleRef.current) return;

    const icon = iconRef.current.getBoundingClientRect();
    const bubble = bubbleRef.current;
    const padding = 8;

    // Position below the icon, centered
    let top = icon.bottom + padding;
    let left = icon.left + icon.width / 2 - bubble.offsetWidth / 2;

    // Keep within viewport horizontally
    if (left < padding) left = padding;
    if (left + bubble.offsetWidth > window.innerWidth - padding) {
      left = window.innerWidth - bubble.offsetWidth - padding;
    }

    // If no room below, show above
    if (top + bubble.offsetHeight > window.innerHeight - padding) {
      top = icon.top - bubble.offsetHeight - padding;
    }

    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
  }, [open]);

  return (
    <span className="info-tip" ref={iconRef} onClick={() => setOpen((v) => !v)}>
      i
      {open && (
        <>
          <div className="info-tip-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <span className="info-tip-bubble" ref={bubbleRef}>{text}</span>
        </>
      )}
    </span>
  );
}
