"use client";

import { useEffect, useState } from "react";

const KEY = "tp-greeted";

/** "Namaskaram 🙏" the very first time on this device, then a time-of-day greeting. */
export function Greeting({ name, timeGreeting }: { name: string; timeGreeting: string }) {
  const [text, setText] = useState(`${timeGreeting}, ${name}`);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        localStorage.setItem(KEY, "1");
        setText(`Namaskaram, ${name} 🙏`);
      }
    } catch {}
  }, [name]);

  return <span key={text} className="animate-fade-in">{text}</span>;
}
