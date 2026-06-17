import { useEffect, useRef, useState } from "react";

/**
 * Custom code-bracket cursor: < > that follows the mouse with easing.
 * Expands to <  > on interactive elements.
 * Respects theme accent color. Hides on touch devices and over code blocks.
 */
export default function CustomCursor({ accent }) {
  const bracketRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Detect touch-only devices
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsTouch(mq.matches);
    const handler = (e) => setIsTouch(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (isTouch) return;

    const onMouseMove = (e) => {
      if (bracketRef.current) {
        bracketRef.current.style.left = `${e.clientX}px`;
        bracketRef.current.style.top = `${e.clientY}px`;
      }
    };

    const onMouseEnter = () => setVisible(true);
    const onMouseLeave = () => setVisible(false);

    const onMouseDown = () => setClicked(true);
    const onMouseUp = () => setClicked(false);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseenter", onMouseEnter);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isTouch]);

  // Expand on interactive elements, hide on code blocks
  useEffect(() => {
    if (isTouch) return;

    const handleOver = (e) => {
      const el = e.target;
      // Hide inside code block / editor body
      if (
        el.closest(".code-display") ||
        el.closest(".editor-body") ||
        el.closest(".hidden-typer")
      ) {
        setHidden(true);
        return;
      }
      setHidden(false);
      // Expand on interactive elements
      if (
        el.closest("a") ||
        el.closest("button") ||
        el.closest(".ctrl-btn") ||
        el.closest(".reload-btn") ||
        el.closest(".btn-nav") ||
        el.closest(".btn-nav-accent") ||
        el.closest(".btn-primary") ||
        el.closest(".btn-secondary") ||
        el.closest(".stat-card") ||
        el.closest(".theme-option") ||
        el.closest(".theme-create-btn") ||
        el.closest(".footer-link") ||
        el.closest(".focus-exit-btn") ||
        el.closest(".editor-dot") ||
        el.closest("input") ||
        el.closest("textarea")
      ) {
        setExpanded(true);
      } else {
        setExpanded(false);
      }
    };

    document.addEventListener("mouseover", handleOver);
    return () => document.removeEventListener("mouseover", handleOver);
  }, [isTouch]);

  if (isTouch) return null;

  // Parse accent hex to RGB for rgba
  const hexToRgb = (hex) => {
    const h = hex.replace("#", "");
    return `${parseInt(h.substring(0, 2), 16)}, ${parseInt(h.substring(2, 4), 16)}, ${parseInt(h.substring(4, 6), 16)}`;
  };
  const accentRgb = hexToRgb(accent || "#3B82F6");

  return (
    <>
      <style>{`
        .custom-cursor-brackets {
          pointer-events: none;
          position: fixed;
          top: -100px;
          left: -100px;
          z-index: 99999;
          transform: translate(-50%, -50%);
          will-change: left, top, opacity;
          display: flex;
          align-items: center;
          gap: 1px;
          font-family: 'JetBrains Mono', ui-monospace, Consolas, monospace;
          font-weight: 600;
          font-size: 18px;
          line-height: 1;
          color: rgba(${accentRgb}, 0.85);
          filter: drop-shadow(0 0 6px rgba(${accentRgb}, 0.35));
          mix-blend-mode: difference;
          transition: opacity 0.2s ease;
        }
        .custom-cursor-brackets .bracket-left,
        .custom-cursor-brackets .bracket-right {
          transition: transform 0.15s ease-out,
                      color 0.15s ease;
          display: inline-block;
        }
        .custom-cursor-brackets .bracket-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(${accentRgb}, 0.85);
          transition: opacity 0.08s ease-out,
                      transform 0.08s ease-out;
          flex-shrink: 0;
        }
        .custom-cursor-brackets .bracket-dot.clicked {
          opacity: 0;
          transform: scale(0);
        }
        /* Expanded: parentheses spread, dot becomes ellipse */
        .custom-cursor-brackets.expanded .bracket-left {
          transform: translateX(-3px);
          color: rgba(${accentRgb}, 1);
        }
        .custom-cursor-brackets.expanded .bracket-right {
          transform: translateX(3px);
          color: rgba(${accentRgb}, 1);
        }
        .custom-cursor-brackets.expanded .bracket-dot {
          background: rgba(${accentRgb}, 1);
        }
        .custom-cursor-brackets.expanded {
          filter: drop-shadow(0 0 10px rgba(${accentRgb}, 0.5));
        }
        .custom-cursor-hidden {
          opacity: 0 !important;
        }
        /* Hide default cursor everywhere except code blocks */
        *, *::before, *::after {
          cursor: none !important;
        }
        .code-display, .code-display *,
        .editor-body, .editor-body *,
        .hidden-typer {
          cursor: text !important;
        }
      `}</style>
      <div
        ref={bracketRef}
        className={`custom-cursor-brackets${expanded ? " expanded" : ""}${!visible || hidden ? " custom-cursor-hidden" : ""}`}
      >
        <span className="bracket-left">(</span>
        <span className={`bracket-dot${clicked ? " clicked" : ""}`} />
        <span className="bracket-right">)</span>
      </div>
    </>
  );
}
