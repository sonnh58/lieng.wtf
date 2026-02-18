import { useEffect, useState, useRef } from 'react';

interface TurnTimerProps {
  timeLeft: number;
  maxTime?: number;
}

export function TurnTimer({ timeLeft, maxTime = 30 }: TurnTimerProps) {
  const [displayTime, setDisplayTime] = useState(timeLeft);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayTime(timeLeft);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayTime((prev) => {
        if (prev <= 1) { if (intervalRef.current) clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timeLeft]);

  const pct = (displayTime / maxTime) * 100;
  const color = pct > 50 ? 'text-[--color-success]' : pct > 25 ? 'text-[--color-gold]' : 'text-[--color-accent]';
  const circumference = 2 * Math.PI * 20;

  return (
    <div className="relative w-8 h-8 sm:w-10 sm:h-10">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" strokeWidth="3" fill="none" className="stroke-[--color-border]" />
        <circle
          cx="24" cy="24" r="20" strokeWidth="3" fill="none" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className={`${color} transition-[stroke-dashoffset] duration-1000 ease-linear`}
          style={{ stroke: 'currentColor' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[9px] sm:text-xs font-bold ${color}`}>{displayTime}</span>
      </div>
    </div>
  );
}
