import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, X, Sparkles, Clock, HelpCircle, TrendingUp, TrendingDown, Minus, Settings, ChevronLeft, Calendar } from 'lucide-react';
import { capitalizeName } from '../lib/stringUtils';
import { supabase } from '../lib/supabase';

const getTimeIcon = (hour: number) => {
  if (hour >= 5 && hour < 12) return '🌅';
  if (hour >= 12 && hour < 18) return '☀️';
  if (hour >= 18 && hour < 22) return '🌆';
  return '🌙';
};

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerName: string;
  userName: string;
  stats: any;
  loading: boolean;
}

export default function StatsModal({
  isOpen,
  onClose,
  partnerName,
  userName,
  stats,
  loading
}: StatsModalProps) {
  const [heartprintType, setHeartprintType] = useState<'tot' | 'ranking' | 'text' | 'wwe' | 'all' | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayTotMatch, setDisplayTotMatch] = useState(0);
  const [displayRankingMatch, setDisplayRankingMatch] = useState(0);
  const [displayTextMatch, setDisplayTextMatch] = useState(0);
  const [displayWweMatch, setDisplayWweMatch] = useState(0);
  const [scoreTrend, setScoreTrend] = useState<{ delta: number; direction: 'up' | 'down' | 'same' } | null>(null);
  const [minTimerDone, setMinTimerDone] = useState(false);
  const [fadeGears, setFadeGears] = useState(false);
  const [renderStats, setRenderStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'1w' | '4w' | 'max'>('max');
  const [chartView, setChartView] = useState<'curve' | 'heatmap'>('curve');
  const chartRef = React.useRef<SVGSVGElement>(null);

  const visibleHistory = React.useMemo(() => {
    if (!stats?.scoreHistory) return [];
    const sorted = [...stats.scoreHistory].sort((a, b) => a.date.localeCompare(b.date));
    if (timeRange === 'max') return sorted;

    const now = new Date();
    let daysToSubtract = 7;
    if (timeRange === '4w') daysToSubtract = 28;

    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - daysToSubtract);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    return sorted.filter(pt => pt.date >= cutoffStr);
  }, [stats?.scoreHistory, timeRange]);

  const handlePointer = (clientX: number) => {
    if (!chartRef.current || visibleHistory.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const paddingLeft = 22;
    const paddingRight = 8;
    const paddingLeftPx = paddingLeft * (rect.width / 300);
    const paddingRightPx = paddingRight * (rect.width / 300);
    const xActive = clientX - rect.left - paddingLeftPx;
    const widthActive = rect.width - paddingLeftPx - paddingRightPx;
    const percentage = Math.max(0, Math.min(1, xActive / widthActive));
    const index = Math.round(percentage * (visibleHistory.length - 1));
    setSelectedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handlePointer(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1 || e.type === 'mousemove') {
      handlePointer(e.clientX);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  };

  // Handle popstate for native back button / gesture
  React.useEffect(() => {
    if (!isOpen) return;

    const handlePopState = (e: PopStateEvent) => {
      if (showHistory) {
        setShowHistory(false);
        setSelectedIndex(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, showHistory]);

  React.useEffect(() => {
    if (isOpen && showHistory) {
      window.history.pushState({ statsHistoryOpen: true }, '');
    }
  }, [isOpen, showHistory]);

  const handleClose = () => {
    if (showHistory) {
      window.history.back();
      return;
    }
    onClose();
  };

  // Reset when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setMinTimerDone(false);
      setFadeGears(false);
      setRenderStats(false);
      setShowHistory(false);
      setSelectedIndex(null);
      setTimeRange('max');
      
      const timer = setTimeout(() => {
        setMinTimerDone(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // When loading is false AND timer is done AND stats is available, trigger fade-out
  React.useEffect(() => {
    if (isOpen && minTimerDone && !loading && stats) {
      setFadeGears(true);
      const tid = setTimeout(() => {
        setRenderStats(true);
      }, 300); // 300ms transition time
      return () => clearTimeout(tid);
    }
  }, [isOpen, minTimerDone, loading, stats]);

  // Start counter animations as soon as gears start to fade out (pointer-events set to none)
  const isGearsLoading = !fadeGears;

  const lastTargetsRef = React.useRef<{ score: number; tot: number; ranking: number; text: number; wwe: number } | null>(null);

  // Animate Bisou Score and match percentages from 0 to target when modal opens or stats change
  React.useEffect(() => {
    if (isOpen && stats && !isGearsLoading) {
      const targets = {
        score: stats.bisouScore || 0,
        tot: stats.totMatch || 0,
        ranking: stats.rankingMatch || 0,
        text: stats.textMatch || 0,
        wwe: stats.wweMatch || 0
      }; 

      const isSameTargets = lastTargetsRef.current &&
        lastTargetsRef.current.score === targets.score &&
        lastTargetsRef.current.tot === targets.tot &&
        lastTargetsRef.current.ranking === targets.ranking &&
        lastTargetsRef.current.text === targets.text &&
        lastTargetsRef.current.wwe === targets.wwe;

      if (isSameTargets) {
        return; // Don't restart the animation if targets haven't changed!
      }

      lastTargetsRef.current = targets;
      
      const duration = 3000; 
      const delay = 0; 
      let startTime: number | null = null;

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;

        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 2.5);
        
        setDisplayScore(targets.score * easeOut);
        setDisplayTotMatch(Math.round(targets.tot * easeOut));
        setDisplayRankingMatch(Math.round(targets.ranking * easeOut));
        setDisplayTextMatch(Math.round(targets.text * easeOut));
        setDisplayWweMatch(Math.round(targets.wwe * easeOut));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      const raf = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(raf);
    } else if (!isOpen || isGearsLoading) {
      lastTargetsRef.current = null;
      setDisplayScore(0);
      setDisplayTotMatch(0);
      setDisplayRankingMatch(0);
      setDisplayTextMatch(0);
      setDisplayWweMatch(0);
    }
  }, [isOpen, stats, isGearsLoading]);

  // Calculate trend from previous score (now server-side calculated!)
  React.useEffect(() => {
    if (isOpen && stats?.bisouScore != null && !isGearsLoading) {
      try {
        const prevScore = stats.prevBisouScore;
        
        if (prevScore === null || prevScore === undefined) {
          setScoreTrend(null);
          return;
        }

        const delta = parseFloat((stats.bisouScore - prevScore).toFixed(1));
        if (delta > 0) setScoreTrend({ delta, direction: 'up' });
        else if (delta < 0) setScoreTrend({ delta: Math.abs(delta), direction: 'down' });
        else setScoreTrend({ delta: 0, direction: 'same' });
      } catch {
        setScoreTrend(null);
      }
    } else if (!isOpen || isGearsLoading) {
      setScoreTrend(null);
    }
  }, [isOpen, stats?.bisouScore, stats?.prevBisouScore, isGearsLoading]);

  React.useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const { error } = await supabase.rpc('increment_stats_views');
          if (error) console.error("Failed to increment stats views:", error);
        } catch (err) {
          console.error("Failed to increment stats views:", err);
        }
      })();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop px-4 will-change-[opacity,backdrop-filter]">
      <div className="absolute inset-0" onClick={handleClose} />
      <div className={`modal-content pt-6 px-4 pb-0 flex flex-col overflow-hidden transition-all duration-300 ${
        showHistory ? 'h-[92vh] max-h-[92vh]' : 'h-[520px] max-h-[92vh]'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[var(--secondary)]" />
            </div>
            <div>
              <h3 className="font-black text-[#1F1939] text-base leading-tight">
                {showHistory ? "Score-Verlauf" : "Eure Bisou-Statistik"}
              </h3>
              <p className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-widest">
                {showHistory ? "Letzte 90 Tage" : "der letzten 30 Tage"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showHistory && (
              <div className="flex bg-purple-50 p-0.5 rounded-xl border border-purple-100/50">
                <button
                  onClick={() => setChartView('curve')}
                  className={`p-1 rounded-lg transition-all ${
                    chartView === 'curve'
                      ? 'bg-white text-[var(--secondary)] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[#1F1939]'
                  }`}
                  title="Kurven-Ansicht"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setChartView('heatmap')}
                  className={`p-1 rounded-lg transition-all ${
                    chartView === 'heatmap'
                      ? 'bg-white text-[var(--secondary)] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[#1F1939]'
                  }`}
                  title="Heatmap-Ansicht"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button onClick={handleClose} className="p-1.5 bg-purple-50 rounded-full text-[var(--muted)] hover:bg-purple-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>



        <div className="relative w-full flex-1 scrollbar-none overflow-hidden flex flex-col pb-4">
          {/* Gears overlay */}
          {(!renderStats || loading) && (
            <div
              style={{
                opacity: fadeGears && !loading ? 0 : 1,
                transition: 'opacity 0.25s ease',
              }}
              className="absolute inset-0 flex flex-col items-center justify-center py-12 px-4 space-y-6 bg-white z-10"
            >
              <div className="relative w-20 h-20 flex items-center justify-center">
                <Settings className="w-14 h-14 text-[var(--secondary)] animate-[spin_5s_linear_infinite] absolute top-1 left-1" />
                <Settings className="w-9 h-9 text-purple-300 animate-[spin_3s_linear_infinite_reverse] absolute bottom-1 right-1" />
              </div>
              <div className="text-center space-y-1.5 animate-pulse mt-4">
                <p className="text-xs font-black text-[#1F1939] uppercase tracking-wider">Antworten werden verglichen</p>
                <p className="text-[10px] font-bold text-[var(--muted)]">Bisou-Score wird per HeartPrint™ berechnet</p>
              </div>
            </div>
          )}

          {/* Stats content */}
          {stats && (
            <div
              style={{
                opacity: fadeGears && !loading ? 1 : 0,
                transition: 'opacity 0.25s ease',
                pointerEvents: fadeGears && !loading ? 'auto' : 'none',
              }}
              className="space-y-2.5 w-full flex-1 flex flex-col min-h-0 max-h-full overflow-hidden"
            >
              {showHistory ? (
                /* History curve view (interactive like a finance/fitness app) */
                (() => {
                  const defaultIndex = visibleHistory && visibleHistory.length > 0 ? visibleHistory.length - 1 : 0;
                  const currentIndex = selectedIndex !== null ? selectedIndex : defaultIndex;
                  const activeDay = visibleHistory && visibleHistory[currentIndex] ? visibleHistory[currentIndex] : null;
                  const dayMilestones = activeDay?.milestones || [];

                  // Fixed steady colors for consistency (no shifts when scrubbing)
                  const gradientColor = "#FF5A5A";
                  const gradientOpacity = "0.15";
                  const strokeColor = "#FF5A5A";

                  const allDatesInRange = (() => {
                    if (!visibleHistory || visibleHistory.length === 0) return [];
                    const start = new Date(visibleHistory[0].date);
                    const end = new Date(visibleHistory[visibleHistory.length - 1].date);
                    const dates = [];
                    const cur = new Date(start);
                    while (cur <= end) {
                      dates.push(cur.toISOString().split('T')[0]);
                      cur.setDate(cur.getDate() + 1);
                    }
                    return dates;
                  })();

                  const firstDate = allDatesInRange[0];
                  const lastDate = allDatesInRange[allDatesInRange.length - 1];
                  const startWeekday = firstDate ? (new Date(firstDate).getDay() + 6) % 7 : 0;
                  const endWeekday = lastDate ? (new Date(lastDate).getDay() + 6) % 7 : 0;

                  const heatmapCells = (() => {
                    if (allDatesInRange.length === 0) return [];
                    const cells = [];
                    // Pad start
                    for (let i = 0; i < startWeekday; i++) {
                      cells.push({ isPlaceholder: true, key: `pad-start-${i}` });
                    }
                    // Real days
                    allDatesInRange.forEach((dateStr) => {
                      const pt = visibleHistory.find(d => d.date === dateStr);
                      cells.push({
                        isPlaceholder: false,
                        date: dateStr,
                        score: pt ? pt.score : null,
                        milestones: pt ? pt.milestones : [],
                        key: dateStr
                      });
                    });
                    // Pad end
                    const padEndCount = 6 - endWeekday;
                    for (let i = 0; i < padEndCount; i++) {
                      cells.push({ isPlaceholder: true, key: `pad-end-${i}` });
                    }
                    return cells;
                  })();

                  const getHeatmapColor = (score: number | null) => {
                    if (score === null) return 'rgba(138, 92, 245, 0.05)';
                    const opacity = 0.15 + (score / 10) * 0.85;
                    return `rgba(255, 90, 90, ${opacity})`;
                  };

                  return (
                    <div className="space-y-4 animate-fade-in flex flex-col items-center w-full flex-1 min-h-0 max-h-full overflow-hidden">
                      <div className="text-center py-2 w-full flex flex-col items-center space-y-3 shrink-0">
                        <div className="text-center">
                          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">
                            {activeDay ? formatDate(activeDay.date) : "Aktueller Wert"}
                          </p>
                          <div className="flex items-baseline justify-center gap-1">
                            <span 
                              className="text-4xl font-black tabular-nums transition-all duration-300"
                              style={{ color: strokeColor }}
                            >
                              {(activeDay ? activeDay.score : stats.bisouScore).toFixed(1)}
                            </span>
                            <span className="text-xs font-bold text-rose-400">/ 10</span>
                          </div>
                        </div>

                        {/* Sleek Segmented Control for Time Range */}
                        <div className="flex bg-purple-50/50 dark:bg-purple-950/30 p-0.5 rounded-full border border-purple-100/30 dark:border-purple-900/10 w-[200px] h-7 items-center justify-between select-none">
                          {(['1w', '4w', 'max'] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                setTimeRange(r);
                                setSelectedIndex(null);
                              }}
                              className={`flex-1 h-full text-[9px] font-black uppercase tracking-wider rounded-full transition-all ${
                                timeRange === r
                                  ? 'bg-white dark:bg-[#1E1B2E] text-[var(--primary)] shadow-sm'
                                  : 'text-[var(--muted)] hover:text-[#1F1939] dark:hover:text-white'
                              }`}
                            >
                              {r === '1w' ? '1 Woche' : r === '4w' ? '4 Wochen' : 'Max'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {visibleHistory && visibleHistory.length > 1 ? (
                        <div className="relative w-full bg-purple-50/20 rounded-3xl py-4 px-4 border border-purple-100/50 flex flex-col items-center justify-center min-h-[179px] shrink-0">
                          {chartView === 'curve' ? (
                            <svg
                              ref={chartRef}
                              className="w-full h-auto overflow-visible touch-none cursor-crosshair select-none"
                              viewBox="0 0 300 145"
                              width="100%"
                              onTouchStart={handleTouchMove}
                              onTouchMove={handleTouchMove}
                              onMouseMove={handleMouseMove}
                              onMouseDown={(e) => {
                                handlePointer(e.clientX);
                              }}
                            >
                              <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={gradientColor} stopOpacity={gradientOpacity} />
                                  <stop offset="100%" stopColor={gradientColor} stopOpacity="0.0" />
                                </linearGradient>
                                <filter id="dotShadow" x="-20%" y="-20%" width="140%" height="140%">
                                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={strokeColor} floodOpacity="0.3" />
                                </filter>
                              </defs>

                              {/* Grid lines */}
                              {[0, 2.5, 5, 7.5, 10].map((gridVal) => {
                                const y = 140 - (gridVal / 10) * 120;
                                const isZero = gridVal === 0;
                                return (
                                  <g key={gridVal} opacity="0.45">
                                    <line x1="22" y1={isZero ? y - 0.5 : y} x2="292" y2={isZero ? y - 0.5 : y} stroke="#8C88A5" strokeWidth="1" strokeDasharray={isZero ? "0" : "3 3"} />
                                    <text x="4" y={y - 4} fill="#4A4468" fontSize="8" fontWeight="bold">{gridVal}</text>
                                  </g>
                                );
                              })}

                              {/* Render line & fill path */}
                              {(() => {
                                const paddingLeft = 22;
                                const paddingRight = 8;
                                const points = visibleHistory.map((pt: any, i: number) => {
                                  const x = paddingLeft + (i / (visibleHistory.length - 1)) * (300 - paddingLeft - paddingRight);
                                  const y = 140 - (pt.score / 10) * 120;
                                  return { x, y };
                                });

                                const pathD = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                                const areaD = `${pathD} L 292 140 L 22 140 Z`;
                                const selPt = points[currentIndex];

                                return (
                                  <>
                                    {/* Milestone stacked dots on the chart timeline */}
                                    {visibleHistory.map((pt: any, idx: number) => {
                                      const mCount = pt.milestones?.length || 0;
                                      if (mCount === 0) return null;
                                      let px = paddingLeft + (idx / (visibleHistory.length - 1)) * (300 - paddingLeft - paddingRight);
                                      if (idx === 0) px += 2.2;
                                      else if (idx === visibleHistory.length - 1) px -= 2.2;
                                      return (
                                        <g key={`ms-dots-${pt.date}-${idx}`}>
                                          {Array.from({ length: Math.min(5, mCount) }).map((_, dotIdx) => {
                                            const py = 137 - dotIdx * 5; // stack upwards
                                            return (
                                              <circle
                                                key={dotIdx}
                                                cx={px}
                                                cy={py}
                                                r="2.2"
                                                fill="#FBBF24"
                                                stroke="#FFF"
                                                strokeWidth="0.4"
                                              />
                                            );
                                          })}
                                        </g>
                                      );
                                    })}

                                    <path d={areaD} fill="url(#chartGradient)" />
                                    <path
                                      d={pathD}
                                      fill="none"
                                      stroke={strokeColor}
                                      strokeWidth="3.5"
                                      strokeLinecap="butt"
                                      strokeLinejoin="round"
                                    />
                                    
                                    {selPt && (
                                      <line
                                        x1={selPt.x}
                                        y1="20"
                                        x2={selPt.x}
                                        y2="140"
                                        stroke="var(--secondary)"
                                        strokeWidth="1.5"
                                        strokeDasharray="2 2"
                                        opacity={selectedIndex !== null ? "0.7" : "0.35"}
                                      />
                                    )}
                                    {selPt && (
                                      <g filter="url(#dotShadow)">
                                        <circle cx={selPt.x} cy={selPt.y} r="8" fill="#FFF" />
                                        <circle cx={selPt.x} cy={selPt.y} r="5" fill="var(--primary)" />
                                      </g>
                                    )}
                                  </>
                                );
                              })()}
                            </svg>
                          ) : (
                            /* GitHub-style Heatmap Grid */
                            <div className="flex items-center gap-2 select-none py-1 animate-fade-in w-full justify-center min-h-[145px]">
                              {/* Weekday labels */}
                              <div className="flex flex-col justify-between text-[7.5px] text-[var(--muted)] font-black uppercase pr-1.5 h-[120px] py-1 shrink-0">
                                <span>Mo</span>
                                <span className="opacity-0">Di</span>
                                <span>Mi</span>
                                <span className="opacity-0">Do</span>
                                <span>Fr</span>
                                <span className="opacity-0">Sa</span>
                                <span>So</span>
                              </div>

                              {/* Heatmap grid */}
                              <div 
                                className="grid grid-rows-7 grid-flow-col gap-[3.5px] justify-center"
                                style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
                              >
                                {heatmapCells.map((cell: any) => {
                                  if (cell.isPlaceholder) {
                                    return (
                                      <div 
                                        key={cell.key} 
                                        className="w-[14px] h-[14px] bg-transparent" 
                                      />
                                    );
                                  }

                                  const isSelected = selectedIndex !== null && visibleHistory[selectedIndex]?.date === cell.date;
                                  const cellIndex = visibleHistory.findIndex(d => d.date === cell.date);
                                  const hasMilestones = cell.milestones && cell.milestones.length > 0;

                                  return (
                                    <button
                                      key={cell.key}
                                      onClick={() => {
                                        if (cellIndex !== -1) {
                                          setSelectedIndex(cellIndex);
                                        }
                                      }}
                                      className={`w-[14px] h-[14px] rounded-[3px] transition-all relative ${
                                        isSelected 
                                          ? 'ring-2 ring-[var(--secondary)] ring-offset-1 ring-offset-white dark:ring-offset-[#1E1B2E] scale-110 z-10' 
                                          : 'hover:scale-105 hover:z-10'
                                      }`}
                                      style={{
                                        backgroundColor: getHeatmapColor(cell.score),
                                        border: cell.score === null ? '1px solid rgba(138, 92, 245, 0.15)' : 'none'
                                      }}
                                      title={`${cell.date}: ${cell.score !== null ? cell.score.toFixed(1) : 'Keine Daten'}`}
                                    >
                                      {hasMilestones && (
                                        <span className="absolute bottom-[1.5px] right-[1.5px] w-1.5 h-1.5 rounded-full bg-[#FBBF24] border-[0.5px] border-white" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-purple-50/20 rounded-3xl border border-purple-100/50 flex flex-col items-center justify-center p-6 text-center">
                          <p className="text-xs font-bold text-[#4A4468]">Keine Daten für diesen Zeitraum.</p>
                          <p className="text-[10px] text-[var(--muted)] mt-1">Beantwortet fleißig Fragen, um euren Verlauf zu füllen!</p>
                        </div>
                      )}

                      {/* Day milestones display list */}
                      {visibleHistory && visibleHistory.length > 1 && (
                        <div className="w-full space-y-1.5 select-none flex-1 min-h-0 flex flex-col justify-start">
                          {dayMilestones.length > 0 ? (
                            <>
                              <p className="text-[8px] font-black text-amber-500 uppercase tracking-wider text-center justify-center h-3.5 shrink-0 flex items-center w-full">
                                ✨ Meilenstein{dayMilestones.length > 1 ? 'e' : ''} an diesem Tag ({dayMilestones.length})
                              </p>
                              <div className="flex-1 overflow-y-auto scrollbar-none scroll-smooth grid grid-cols-1 gap-1.5 min-h-0 items-start w-full px-0.5">
                                {dayMilestones.map((m: any) => (
                                  <div key={m.id} className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-2.5 text-left transition-all animate-[scaleUp_0.2s_ease-out] w-full">
                                    <span className="text-xl shrink-0">{m.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="text-[10px] font-black text-[#1F1939] leading-tight truncate">{m.name}</h5>
                                      <p className="text-[8.5px] font-bold text-[var(--muted)] leading-tight truncate mt-0.5">{m.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center bg-purple-50/20 border border-purple-100/50 rounded-2xl w-full h-[114px] shrink-0 text-center">
                              <p className="text-[9px] font-bold text-[var(--muted)] opacity-60">Keine Meilensteine an diesem Tag freigeschaltet</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                /* Original stats overview */
                <div className="space-y-2.5 flex-1 flex flex-col justify-between min-h-0 w-full">
                  {/* Top Area stats */}
                  <div className="grid grid-cols-2 gap-2.5 shrink-0">
                    <div className="bg-purple-50/40 rounded-3xl p-3.5 border border-purple-100/50 flex flex-col justify-between h-[72px]">
                      <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest mb-1">Gemeinsam Aktiv</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[var(--secondary)]">{stats.totalAnswers}</span>
                        <span className="text-[9px] font-bold text-[#4A4468]">Tage</span>
                      </div>
                    </div>
                    <div 
                      className="bg-rose-50/40 rounded-3xl p-3.5 border border-rose-100/50 flex flex-col justify-between h-[72px] cursor-pointer active:scale-95 transition-transform" 
                      onClick={() => setShowHistory(true)}
                    >
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Bisou Score</p>
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline">
                          <span className="text-2xl font-black text-[var(--primary)] tabular-nums min-w-[45px]">
                            {displayScore.toFixed(1)}
                          </span>
                          <span className="text-[9px] font-bold text-rose-400 ml-1">/ 10</span>
                        </div>
                        {scoreTrend && (
                          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                            scoreTrend.direction === 'up' 
                              ? 'bg-emerald-50 text-emerald-500' 
                              : scoreTrend.direction === 'down' 
                              ? 'bg-red-50 text-red-400' 
                              : 'bg-gray-50 text-gray-400'
                          }`}>
                            {scoreTrend.direction === 'up' && <TrendingUp className="w-2.5 h-2.5" strokeWidth={3} />}
                            {scoreTrend.direction === 'down' && <TrendingDown className="w-2.5 h-2.5" strokeWidth={3} />}
                            {scoreTrend.direction === 'same' && <Minus className="w-2.5 h-2.5" strokeWidth={3} />}
                            <span>{scoreTrend.direction === 'same' ? '±0' : scoreTrend.delta.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Match rates 2x2 Grid */}
                  <div className="bg-white border-2 border-purple-50 rounded-2xl p-3.5 shrink-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--secondary)]" />
                      <h4 className="text-[9px] font-black text-[#1F1939] uppercase tracking-widest">Übereinstimmung</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-center">
                      {/* TOT Match */}
                      <div 
                        onClick={() => setHeartprintType('tot')}
                        className="flex flex-col items-center justify-center p-1.5 bg-purple-100/50 rounded-xl border border-purple-100/80 min-h-[48px] cursor-pointer active:scale-95 transition-transform"
                      >
                        <span className="text-[7px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">Dies oder das</span>
                        <span className="text-sm font-black text-[var(--secondary)]">{displayTotMatch}%</span>
                      </div>

                      {/* Ranking Match */}
                      <div 
                        onClick={() => setHeartprintType('ranking')}
                        className="flex flex-col items-center justify-center p-1.5 bg-purple-100/50 rounded-xl border border-purple-100/80 min-h-[48px] cursor-pointer active:scale-95 transition-transform"
                      >
                        <span className="text-[7px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">Ranking</span>
                        <span className="text-sm font-black text-[var(--secondary)]">{displayRankingMatch}%</span>
                      </div>

                      {/* Text Match */}
                      <div 
                        onClick={() => setHeartprintType('text')}
                        className="flex flex-col items-center justify-center p-1.5 bg-purple-100/50 rounded-xl border border-purple-100/80 min-h-[48px] cursor-pointer active:scale-95 transition-transform"
                      >
                        <span className="text-[7px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">Freitext</span>
                        <span className="text-sm font-black text-[var(--secondary)]">{displayTextMatch}%</span>
                      </div>

                      {/* WWE Match */}
                      <div 
                        onClick={() => setHeartprintType('wwe')}
                        className="flex flex-col items-center justify-center p-1.5 bg-purple-100/50 rounded-xl border border-purple-100/80 min-h-[48px] cursor-pointer active:scale-95 transition-transform"
                      >
                        <span className="text-[7px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5 leading-tight text-center">Wer würde eher</span>
                        <span className="text-sm font-black text-[var(--secondary)]">{displayWweMatch}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Answer Habits */}
                  <div className="bg-white border-2 border-purple-50 rounded-2xl p-2.5 shrink-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--secondary)]" />
                      <h4 className="text-[9px] font-black text-[#1F1939] uppercase tracking-widest">Antwort-Gewohnheiten</h4>
                    </div>

                    {/* Avg answer time chips */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="flex items-center gap-2 py-1.5 px-2.5 bg-purple-50/40 rounded-xl border border-purple-100">
                        <span className="text-base">{getTimeIcon(stats.myHabit)}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-[#1F1939] leading-tight">{stats.myHabit}:00</span>
                          <span className="text-[7px] font-black text-[var(--secondary)] uppercase tracking-[0.1em]">{capitalizeName(userName.split(' ')[0])}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 py-1.5 px-2.5 bg-orange-50/40 rounded-xl border border-orange-100">
                        <span className="text-base">{getTimeIcon(stats.partnerHabit)}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-[#1F1939] leading-tight">{stats.partnerHabit}:00</span>
                          <span className="text-[7px] font-black text-orange-500 uppercase tracking-[0.1em]">{capitalizeName(partnerName.split(' ')[0])}</span>
                        </div>
                      </div>
                    </div>

                    {/* Who answers first text */}
                    {stats.myFirstPercent != null && (
                      <div className="pt-2.5 border-t border-purple-50/60 flex items-center justify-center gap-1.5">
                        <p className="text-[10px] text-[#4A4468] font-bold leading-none">
                          In letzter Zeit antwortet{' '}
                          <span className="text-[var(--secondary)] font-black text-[11px]">
                            {stats.myFirstPercent === 50
                              ? 'keiner'
                              : stats.myFirstPercent > 50
                              ? capitalizeName(userName.split(' ')[0])
                              : capitalizeName(partnerName.split(' ')[0])}
                          </span>{' '}
                          zuerst.
                        </p>
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-50 border border-purple-100/60 text-[8px] font-black text-[var(--secondary)] leading-none -mt-[1px]">
                          {stats.myFirstPercent === 50
                            ? '50%'
                            : stats.myFirstPercent > 50
                            ? `${stats.myFirstPercent}%`
                            : `${100 - stats.myFirstPercent}%`}
                        </span>
                      </div>
                    )}
                  </div>


                  <div className="flex items-center justify-center gap-1.5 mt-2 shrink-0">
                    <p className="text-[8px] text-[var(--muted)] opacity-50 uppercase tracking-[0.12em] font-bold">
                      Berechnet mit dem HeartPrint™-Algorithmus
                    </p>
                    <button 
                      onClick={() => setHeartprintType('all')}
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity focus:outline-none shrink-0 -mt-[1px] heartprint-info-pulse"
                    >
                      <HelpCircle className="w-full h-full" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {heartprintType && (
        <div className="modal-backdrop !backdrop-blur-none px-4 !z-[3000] will-change-[opacity] transition-all animate-fade-in">
          <div className="absolute inset-0" onClick={() => setHeartprintType(null)} />
          <div className="modal-content pt-6 px-4 pb-0 h-[520px] max-h-[92vh] flex flex-col w-full max-w-sm relative z-10 animate-entrance shadow-2xl border border-purple-100/50 overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-purple-50 pb-3 shrink-0">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[var(--secondary)]" />
                </div>
                <div className="flex flex-col pt-0.5">
                  <h4 className="text-[13px] font-black text-[#1F1939] leading-tight">HeartPrint™-Algorithmus</h4>
                  <p className="font-bold text-[9px] text-[var(--muted)] opacity-70 leading-none mt-0.5">by Bisou</p>
                </div>
              </div>
              <button 
                onClick={() => setHeartprintType(null)} 
                className="p-1.5 bg-purple-50 rounded-full text-[var(--muted)] hover:bg-purple-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div 
              className="flex-1 overflow-y-auto scrollbar-none px-1 pb-6 space-y-4 text-[#4A4468] text-[11px] leading-relaxed"
              style={{ hyphens: 'auto', WebkitHyphens: 'auto' }}
              lang="de"
            >
              <p className="px-0.5">
                Der <strong>Bisou-Score</strong> zeigt euren <span className="whitespace-nowrap">Beziehungs-Matchwert</span> der letzten 30 Tage. Er wird mit dem <span className="whitespace-nowrap"><strong>HeartPrint™-Algorithmus</strong></span> errechnet, der alle vier Fragetypen (Dies oder das, Ranglisten, Wer würde eher und Freitexte) gleich gewichtet.
              </p>

              <div className="rounded-2xl p-3 bg-purple-50/40 border border-purple-100/50 space-y-2.5 px-3">
                <h5 className="font-black text-[var(--secondary)] uppercase text-[9px] tracking-wider mb-0.5">So funktioniert die Berechnung:</h5>
                <p className="text-[10px] opacity-90 leading-relaxed">
                  Für jede eurer täglichen Fragen erkennt der <span className="whitespace-nowrap"><strong>HeartPrint™-Algorithmus</strong></span> automatisch, ob eine hohe Übereinstimmung oder eine geringe bzw. komplementäre Übereinstimmung für eine harmonische Beziehung spricht.
                </p>
                <p className="text-[10px] opacity-90 leading-relaxed">
                  • <strong>Übereinstimmung:</strong> Bringt euch Punkte, wenn ihr dieselbe Option wählt, Prioritäten teilt oder inhaltlich sehr ähnliche Gedanken äußert (z. B. bei gemeinsamen Werten oder Interessen).
                </p>
                <p className="text-[10px] opacity-90 leading-relaxed">
                  • <strong>Ergänzung:</strong> Bringt euch Punkte, wenn ihr euch gegenseitig ergänzt oder gegensätzliche Meinungen habt (z. B. bei der Rollenaufteilung im Haushalt oder Persönlichkeitsmerkmalen, die einander ausgleichen).
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
