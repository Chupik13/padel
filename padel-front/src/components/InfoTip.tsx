import { useState } from 'react';

export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="info-tip" onClick={() => setOpen((v) => !v)}>
      i
      {open && (
        <>
          <div className="info-tip-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <span className="info-tip-bubble">{text}</span>
        </>
      )}
    </span>
  );
}
