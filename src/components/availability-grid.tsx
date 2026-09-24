"use client";
import { useEffect, useRef } from "react";
import { Check, Clock3 } from "lucide-react";
import type { SchoolData, PlanInput } from "@/domain/types";
import { minutes, clock, dayNames } from "@/domain/dates";
import { normalizeAvailability } from "@/domain/study-plan/engine";
export function slotsToAvailability(
  slots: string[],
  settings: SchoolData["settings"],
): PlanInput["availability"] {
  return normalizeAvailability(
    slots.map((key) => {
      const [day, time] = key.split("|");
      return {
        weekday: Number(day),
        startTime: time,
        endTime: clock(minutes(time) + settings.availabilitySlotMinutes),
      };
    }),
  );
}
export function AvailabilityGrid({
  settings,
  value,
  onChange,
}: {
  settings: SchoolData["settings"];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const drag = useRef<boolean | null>(null);
  const current = useRef(value);
  current.current = value;
  useEffect(() => {
    const end = () => {
      drag.current = null;
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);
  const times: number[] = [];
  for (
    let t = minutes(settings.startTime);
    t + settings.availabilitySlotMinutes <= minutes(settings.endTime);
    t += settings.availabilitySlotMinutes
  )
    times.push(t);
  const update = (key: string, selected: boolean) => {
    const next = selected
      ? [...new Set([...current.current, key])]
      : current.current.filter((k) => k !== key);
    current.current = next;
    onChange(next);
  };
  const windows = slotsToAvailability(value, settings);
  return (
    <>
      <div className="availability-scroll">
        <div
          className="availability-grid"
          onPointerMove={(event) => {
            if (event.pointerType === "mouse" || drag.current === null) return;
            const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>("button[data-slot]");
            if (cell && event.currentTarget.contains(cell)) update(cell.dataset.slot!, drag.current);
          }}
          style={{
            gridTemplateColumns: `65px repeat(${settings.weekdays.length}, minmax(48px, 1fr))`,
          }}
        >
          <div className="grid-heading">
            <Clock3 size={15} />
          </div>
          {settings.weekdays.map((d) => (
            <div key={d} className="grid-heading">
              {dayNames[d]}
            </div>
          ))}
          {times.map((t) => (
            <div className="grid-row" key={t}>
              <span className="grid-time">{clock(t)}</span>
              {settings.weekdays.map((d) => {
                const key = `${d}|${clock(t)}`,
                  selected = value.includes(key);
                return (
                  <button
                    type="button"
                    key={key}
                    data-slot={key}
                    style={{ touchAction: "none" }}
                    className={`time-slot ${selected ? "selected" : ""}`}
                    aria-label={`${dayNames[d]} ${clock(t)} às ${clock(t + settings.availabilitySlotMinutes)}`}
                    aria-pressed={selected}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      e.currentTarget.focus();
                      drag.current = !selected;
                      update(key, !selected);
                    }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse" && drag.current !== null)
                        update(key, drag.current);
                    }}
                    onClick={(e) => {
                      if (e.detail === 0) update(key, !selected);
                    }}
                  >
                    {selected ? <Check size={16} /> : <span>+</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="availability-summary">
        <span>
          <i className="legend-square" /> Horários disponíveis
        </span>
        <strong>
          {Math.floor((value.length * settings.availabilitySlotMinutes) / 60)}h
          {(value.length * settings.availabilitySlotMinutes) % 60
            ? ` ${(value.length * settings.availabilitySlotMinutes) % 60}min`
            : ""}{" "}
          por semana
        </strong>
      </div>
      {windows.length > 0 && (
        <div className="selected-windows">
          {windows.map((w) => (
            <span key={`${w.weekday}-${w.startTime}`}>
              {dayNames[w.weekday]} {w.startTime}–{w.endTime}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
