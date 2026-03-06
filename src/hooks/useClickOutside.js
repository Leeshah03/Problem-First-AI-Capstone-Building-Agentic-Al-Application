import { useEffect } from "react";

export function useClickOutside(ref, isActive, onClickOutside) {
  useEffect(() => {
    if (!isActive) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClickOutside();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, isActive, onClickOutside]);
}
