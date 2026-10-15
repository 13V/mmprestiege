import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./themed-select.css";

/** A controlled select with a themed, viewport-positioned listbox. */
export default function ThemedSelect({
  label,
  value,
  onChange,
  options,
  id,
  disabled = false,
}) {
  const generatedId = useId();
  const controlId = id || `themed-select-${generatedId.replace(/:/g, "")}`;
  const listboxId = `${controlId}-listbox`;
  const triggerRef = useRef(null);
  const listboxRef = useRef(null);
  const searchRef = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];
  const unavailable = disabled || options.length === 0;
  const positioned = position !== null;

  function showMenu(index = selectedIndex) {
    if (unavailable) return;
    searchRef.current = { text: "", time: 0 };
    setActiveIndex(Math.max(0, Math.min(index, options.length - 1)));
    setOpen(true);
  }

  function closeMenu(restoreFocus = false) {
    setOpen(false);
    searchRef.current = { text: "", time: 0 };
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }

  function choose(index) {
    if (!options[index]) return;
    onChange(options[index].value);
    closeMenu(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const edge = 12;
      const gap = 6;
      const below = window.innerHeight - rect.bottom - edge - gap;
      const above = rect.top - edge - gap;
      const intendedHeight = Math.min(240, options.length * 38 + 12);
      const opensAbove = below < intendedHeight && above > below;
      const availableHeight = Math.max(38, opensAbove ? above : below);
      const maxHeight = Math.min(240, availableHeight);
      const actualHeight = Math.min(intendedHeight, maxHeight);
      const width = Math.min(
        rect.width,
        Math.max(1, window.innerWidth - edge * 2),
      );
      const left = Math.max(
        edge,
        Math.min(rect.left, window.innerWidth - width - edge),
      );
      const top = opensAbove
        ? Math.max(edge, rect.top - gap - actualHeight)
        : Math.max(edge, rect.bottom + gap);
      setPosition({
        top,
        left,
        width,
        maxHeight,
        fontSize: window.getComputedStyle(trigger).fontSize,
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event) {
      if (
        !triggerRef.current?.contains(event.target) &&
        !listboxRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", dismissOutside, true);
    return () =>
      document.removeEventListener("pointerdown", dismissOutside, true);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !position) return;
    const list = listboxRef.current;
    const option = list?.children[activeIndex];
    if (!option) return;
    const optionTop = option.offsetTop;
    const optionBottom = optionTop + option.offsetHeight;
    if (optionTop < list.scrollTop) list.scrollTop = optionTop;
    else if (optionBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = optionBottom - list.clientHeight;
    }
  }, [activeIndex, open, positioned]);

  useEffect(() => {
    if (unavailable) setOpen(false);
  }, [unavailable]);

  function handleKeyDown(event) {
    if (unavailable) return;
    if (event.key === "Tab") {
      closeMenu();
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open)
        showMenu(
          selectedIndex < 0 && direction < 0
            ? options.length - 1
            : selectedIndex,
        );
      else
        setActiveIndex(
          (index) => (index + direction + options.length) % options.length,
        );
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const index = event.key === "Home" ? 0 : options.length - 1;
      if (!open) showMenu(index);
      else setActiveIndex(index);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else showMenu();
      return;
    }
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const now = Date.now();
      const previous =
        now - searchRef.current.time < 700 ? searchRef.current.text : "";
      const text = previous + event.key.toLocaleLowerCase();
      searchRef.current = { text, time: now };
      // Repeated initial letters cycle through matching options, like a native select.
      const query = [...text].every((letter) => letter === text[0])
        ? text[0]
        : text;
      const start =
        previous && query.length > 1
          ? activeIndex
          : (open ? activeIndex : selectedIndex) + 1;
      const ordered = options.map(
        (_, offset) => (Math.max(0, start) + offset) % options.length,
      );
      const match = ordered.find((index) =>
        options[index].label.toLocaleLowerCase().startsWith(query),
      );
      if (!open) setOpen(true);
      if (match !== undefined) setActiveIndex(match);
      else if (!open) setActiveIndex(Math.max(0, selectedIndex));
    }
  }

  return (
    <div className="themed-select">
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        className="themed-select__trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open ? `${controlId}-option-${activeIndex}` : undefined
        }
        data-value={value}
        disabled={unavailable}
        onClick={() => (open ? closeMenu() : showMenu())}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          if (!listboxRef.current?.contains(event.relatedTarget)) closeMenu();
        }}
      >
        <span className="themed-select__value">
          {selected?.label ?? "Select an option"}
        </span>
        <svg
          className="themed-select__chevron"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={listboxRef}
            id={listboxId}
            className="themed-select__listbox"
            role="listbox"
            aria-label={label}
            style={position}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${controlId}-option-${index}`}
                className={`themed-select__option${activeIndex === index ? " is-active" : ""}`}
                role="option"
                aria-selected={option.value === value}
                data-value={option.value}
                onPointerMove={() => setActiveIndex(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="m3 8 3 3 7-7" />
                  </svg>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
