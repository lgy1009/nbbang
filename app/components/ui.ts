import type { CSSProperties } from "react";

/** 마스킹테이프 색 지정 */
export function tapeStyle(color: string): CSSProperties {
  return { "--tape": color } as CSSProperties;
}
