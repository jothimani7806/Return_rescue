import React, { useEffect, useState, useRef } from 'react';

export default function CountUp({
  to,
  from = 0,
  duration = 1.2,
  separator = ',',
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) {
  const [value, setValue] = useState(from);
  const startTime = useRef(null);
  const target = Number(to) || 0;

  useEffect(() => {
    let animationFrame;
    const startVal = value;
    const start = performance.now();

    const update = (now) => {
      const elapsed = (now - start) / (duration * 1000);
      if (elapsed < 1) {
        // Ease out quad
        const progress = 1 - (1 - elapsed) * (1 - elapsed);
        const current = startVal + (target - startVal) * progress;
        setValue(current);
        animationFrame = requestAnimationFrame(update);
      } else {
        setValue(target);
      }
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
