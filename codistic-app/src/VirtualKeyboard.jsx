import { useState, useEffect, useRef } from "react";

const KEYBOARD_ROWS = [
  [
    { key: "`", shift: "~", w: 1 },
    { key: "1", shift: "!", w: 1 },
    { key: "2", shift: "@", w: 1 },
    { key: "3", shift: "#", w: 1 },
    { key: "4", shift: "$", w: 1 },
    { key: "5", shift: "%", w: 1 },
    { key: "6", shift: "^", w: 1 },
    { key: "7", shift: "&", w: 1 },
    { key: "8", shift: "*", w: 1 },
    { key: "9", shift: "(", w: 1 },
    { key: "0", shift: ")", w: 1 },
    { key: "-", shift: "_", w: 1 },
    { key: "=", shift: "+", w: 1 },
    { key: "Backspace", label: "⌫", w: 2 },
  ],
  [
    { key: "Tab", label: "Tab", w: 1.5 },
    { key: "q", shift: "Q", w: 1 },
    { key: "w", shift: "W", w: 1 },
    { key: "e", shift: "E", w: 1 },
    { key: "r", shift: "R", w: 1 },
    { key: "t", shift: "T", w: 1 },
    { key: "y", shift: "Y", w: 1 },
    { key: "u", shift: "U", w: 1 },
    { key: "i", shift: "I", w: 1 },
    { key: "o", shift: "O", w: 1 },
    { key: "p", shift: "P", w: 1 },
    { key: "[", shift: "{", w: 1 },
    { key: "]", shift: "}", w: 1 },
    { key: "\\", shift: "|", w: 1.5 },
  ],
  [
    { key: "CapsLock", label: "Caps", w: 1.75 },
    { key: "a", shift: "A", w: 1 },
    { key: "s", shift: "S", w: 1 },
    { key: "d", shift: "D", w: 1 },
    { key: "f", shift: "F", w: 1 },
    { key: "g", shift: "G", w: 1 },
    { key: "h", shift: "H", w: 1 },
    { key: "j", shift: "J", w: 1 },
    { key: "k", shift: "K", w: 1 },
    { key: "l", shift: "L", w: 1 },
    { key: ";", shift: ":", w: 1 },
    { key: "'", shift: '"', w: 1 },
    { key: "Enter", label: "Enter", w: 2.25 },
  ],
  [
    { key: "ShiftLeft", label: "Shift", w: 2.25 },
    { key: "z", shift: "Z", w: 1 },
    { key: "x", shift: "X", w: 1 },
    { key: "c", shift: "C", w: 1 },
    { key: "v", shift: "V", w: 1 },
    { key: "b", shift: "B", w: 1 },
    { key: "n", shift: "N", w: 1 },
    { key: "m", shift: "M", w: 1 },
    { key: ",", shift: "<", w: 1 },
    { key: ".", shift: ">", w: 1 },
    { key: "/", shift: "?", w: 1 },
    { key: "ShiftRight", label: "Shift", w: 2.75 },
  ],
  [
    { key: "Space", label: "", w: 8 },
  ],
];

// Map a character to the key(s) that produce it
function getKeysForChar(char) {
  if (char === " ") return [{ row: 4, keyId: "Space" }];
  if (char === "\n") return [{ row: 2, keyId: "Enter" }];
  if (char === "\t") return [{ row: 1, keyId: "Tab" }];

  for (let r = 0; r < KEYBOARD_ROWS.length; r++) {
    for (const k of KEYBOARD_ROWS[r]) {
      if (k.key === char) return [{ row: r, keyId: k.key }];
      if (k.shift === char) return [{ row: r, keyId: k.key }, { row: 3, keyId: "ShiftLeft" }];
    }
  }
  return [];
}

export default function VirtualKeyboard({ theme, accent, nextChar, lastKeyCorrect, lastKeyTimestamp, compact, onHide }) {
  const t = theme;
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [flashKey, setFlashKey] = useState(null); // { keyId, correct }
  const flashTimerRef = useRef(null);
  const containerRef = useRef(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [dragPos, setDragPos] = useState(null); // { x, y } or null for default CSS position

  // Track physically pressed keys for highlight
  useEffect(() => {
    const handleDown = (e) => {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        // Normalize key names
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") next.add(e.code);
        else if (e.key === " ") next.add("Space");
        else if (e.key === "Tab") next.add("Tab");
        else if (e.key === "Backspace") next.add("Backspace");
        else if (e.key === "CapsLock") next.add("CapsLock");
        else if (e.key === "Enter") next.add("Enter");
        else if (e.key.length === 1) next.add(e.key.toLowerCase());
        return next;
      });
    };
    const handleUp = (e) => {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") next.delete(e.code);
        else if (e.key === " ") next.delete("Space");
        else if (e.key === "Tab") next.delete("Tab");
        else if (e.key === "Backspace") next.delete("Backspace");
        else if (e.key === "CapsLock") next.delete("CapsLock");
        else if (e.key === "Enter") next.delete("Enter");
        else if (e.key.length === 1) next.delete(e.key.toLowerCase());
        return next;
      });
    };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, []);

  // Flash correct/wrong on keystroke
  useEffect(() => {
    if (lastKeyTimestamp == null) return;
    // Find which key was just pressed from nextChar (which was the target before the press)
    // We use the lastKeyCorrect signal
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);

    setFlashKey({ correct: lastKeyCorrect, ts: lastKeyTimestamp });
    flashTimerRef.current = setTimeout(() => setFlashKey(null), 200);

    return () => clearTimeout(flashTimerRef.current);
  }, [lastKeyTimestamp, lastKeyCorrect]);

  // Drag handlers for compact mode
  const handleDragStart = (e) => {
    if (!compact) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      dragging: true,
      startX: clientX,
      startY: clientY,
      origX: rect.left,
      origY: rect.top,
    };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = (e) => {
    if (!dragState.current.dragging) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;
    setDragPos({
      x: dragState.current.origX + dx,
      y: dragState.current.origY + dy,
    });
  };

  const handleDragEnd = () => {
    dragState.current.dragging = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  };

  // Determine which keys should be highlighted as "next to press"
  const nextKeys = nextChar != null ? getKeysForChar(nextChar) : [];
  const nextKeyIds = new Set(nextKeys.map((k) => k.keyId));

  // Check if shift is needed for next char
  const needsShift = nextKeys.some((k) => k.keyId === "ShiftLeft");

  const keyUnit = compact ? 30 : 48; // px per unit width
  const keyGap = compact ? 2 : 4;
  const keyHeight = compact ? 28 : 44;
  const fontSize = compact ? 9 : 12;
  const shiftFontSize = compact ? 7 : 9;
  const shiftActiveFontSize = compact ? 10 : 13;
  const shiftActiveMainFontSize = compact ? 7 : 9;

  const renderKey = (k, isNext, isPhysicallyPressed, isFlashCorrect, isFlashWrong) => {
    let cls = "vkb-key";
    if (k.key === "Space") cls += " vkb-space";
    if (needsShift && k.shift && !k.label) cls += " vkb-shift-active";
    if (isFlashWrong) cls += " vkb-wrong";
    else if (isFlashCorrect || isPhysicallyPressed) cls += " vkb-pressed";
    else if (isNext) cls += " vkb-next";

    const width = k.w * keyUnit + (k.w > 1 ? (k.w - 1) * keyGap : 0);
    const displayLabel = k.label != null ? k.label : k.key;

    return (
      <div
        key={k.key}
        className={cls}
        style={{ width, minWidth: width, height: keyHeight }}
      >
        {k.shift && !k.label ? (
          <>
            <span className="vkb-shift-label">{k.shift}</span>
            <span className="vkb-main-label">{k.key}</span>
          </>
        ) : (
          <span className="vkb-main-label">{displayLabel}</span>
        )}
      </div>
    );
  };

  const renderRows = (rows) =>
    rows.map((row, ri) => (
      <div className="vkb-row" key={ri}>
        {row.map((k) => {
          const keyId = k.key;
          const isNext = nextKeyIds.has(keyId) || (needsShift && (keyId === "ShiftLeft" || keyId === "ShiftRight"));
          const isPhysicallyPressed = pressedKeys.has(keyId) || pressedKeys.has(keyId.toLowerCase());

          let isFlashCorrect = false;
          let isFlashWrong = false;
          if (flashKey && isPhysicallyPressed) {
            if (flashKey.correct) isFlashCorrect = true;
            else isFlashWrong = true;
          }

          return renderKey(k, isNext, isPhysicallyPressed, isFlashCorrect, isFlashWrong);
        })}
      </div>
    ));

  return (
    <>
      <style>{`
        .vkb-container {
          width: 100%;
          max-width: ${compact ? '520px' : '820px'};
          margin: 0 auto;
          padding: ${compact ? '8px 8px 6px' : '14px 12px'};
          background: ${t.surface};
          border: 1px solid ${t.border};
          border-radius: ${compact ? '10px' : '14px'};
          display: flex;
          flex-direction: column;
          gap: ${keyGap}px;
          user-select: none;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .vkb-container.vkb-compact {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 50;
          width: auto;
          animation: vkb-slideIn 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes vkb-slideIn {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .vkb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          padding: 0 2px 2px;
        }
        .vkb-drag-handle {
          flex: 1;
          cursor: ${compact ? 'grab' : 'default'};
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 4px;
          border-radius: 4px;
          color: ${t.textDim};
          font-family: 'JetBrains Mono', monospace;
          font-size: ${compact ? '8px' : '10px'};
          user-select: none;
          -webkit-user-select: none;
        }
        .vkb-drag-handle:active {
          cursor: ${compact ? 'grabbing' : 'default'};
        }
        .vkb-drag-dots {
          display: flex;
          gap: 2px;
          flex-direction: column;
          opacity: 0.5;
        }
        .vkb-drag-dots > span {
          display: flex;
          gap: 2px;
        }
        .vkb-drag-dot {
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: ${t.textDim};
        }
        .vkb-hide-btn {
          padding: ${compact ? '2px 8px' : '3px 10px'};
          border-radius: 5px;
          border: 1px solid ${t.border};
          background: transparent;
          color: ${t.textDim};
          font-family: 'JetBrains Mono', monospace;
          font-size: ${compact ? '8px' : '10px'};
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .vkb-hide-btn:hover {
          color: ${t.textMuted};
          border-color: ${t.textMuted};
          background: ${t.border};
        }
        .vkb-row {
          display: flex;
          gap: ${keyGap}px;
          justify-content: center;
        }
        .vkb-key {
          border-radius: ${compact ? '4px' : '7px'};
          border: 1px solid ${t.border};
          background: ${t.surfaceAlt};
          color: ${t.textMuted};
          font-family: 'JetBrains Mono', monospace;
          font-size: ${fontSize}px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          cursor: default;
          transition: all 0.1s ease;
          position: relative;
          overflow: hidden;
        }
        .vkb-key .vkb-shift-label {
          font-size: ${shiftFontSize}px;
          color: ${t.textDim};
          line-height: 1;
          margin-bottom: ${compact ? '0px' : '1px'};
          transition: all 0.15s ease;
        }
        .vkb-key .vkb-main-label {
          line-height: 1;
          transition: all 0.15s ease;
        }
        .vkb-key.vkb-shift-active .vkb-shift-label {
          font-size: ${shiftActiveFontSize}px;
          color: ${t.text};
          font-weight: 600;
        }
        .vkb-key.vkb-shift-active .vkb-main-label {
          font-size: ${shiftActiveMainFontSize}px;
          color: ${t.textDim};
        }
        .vkb-key.vkb-next {
          border-color: ${accent};
          color: ${t.text};
          background: ${t.surfaceAlt};
          box-shadow: 0 0 ${compact ? '8px' : '12px'} ${accent}33, inset 0 0 ${compact ? '12px' : '20px'} ${accent}11;
        }
        .vkb-key.vkb-next::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: ${compact ? '4px' : '7px'};
          background: ${accent};
          opacity: 0.08;
          animation: vkb-pulse 1.5s ease-in-out infinite;
        }
        @keyframes vkb-pulse {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.15; }
        }
        .vkb-key.vkb-pressed {
          background: ${accent};
          color: #fff;
          border-color: ${accent};
          transform: scale(0.95);
          box-shadow: 0 0 ${compact ? '10px' : '16px'} ${accent}55;
        }
        .vkb-key.vkb-wrong {
          background: ${t.wrong};
          color: #fff;
          border-color: ${t.wrong};
          transform: scale(0.95);
          box-shadow: 0 0 ${compact ? '10px' : '16px'} ${t.wrong}55;
        }
        .vkb-key.vkb-space {
          border-radius: ${compact ? '4px' : '7px'};
        }
      `}</style>
      <div

        ref={containerRef}
        className={`vkb-container ${compact ? 'vkb-compact' : ''}`}
        style={compact && dragPos ? {
          left: dragPos.x,
          top: dragPos.y,
          right: 'auto',
          bottom: 'auto',
        } : undefined}
      >
        <div className="vkb-header">
          {compact && (
            <div
              className="vkb-drag-handle"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div className="vkb-drag-dots">
                <span><span className="vkb-drag-dot" /><span className="vkb-drag-dot" /><span className="vkb-drag-dot" /></span>
                <span><span className="vkb-drag-dot" /><span className="vkb-drag-dot" /><span className="vkb-drag-dot" /></span>
              </div>
            </div>
          )}
          <span style={{ flex: compact ? 0 : 1, fontFamily: "'JetBrains Mono', monospace", fontSize: compact ? 8 : 10, color: t.textDim, letterSpacing: '0.5px' }}>codistic.xyz</span>
          <button className="vkb-hide-btn" title="Ctrl + K" onClick={onHide}>
            <svg width={compact ? 8 : 10} height={compact ? 8 : 10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            hide
          </button>
        </div>
        {renderRows(KEYBOARD_ROWS)}
      </div>
    </>
  );
}
