"use client";

// review #4 — THE PAPER PACK and the TV lobby screen only ever offered a
// 4-char code + a URL to hand-type; `content/tutorial-script.ts` already
// names "the join QR, printed, at the door" as part of the kit and nothing
// generated one. `qrcode-generator` is the one new dep this pass adds — it's
// tiny (no runtime deps of its own) and getting Reed-Solomon error
// correction right by hand isn't worth the risk on something guests actually
// have to scan one-handed at a party. We draw the modules ourselves (rather
// than the lib's own SVG string) so the quiet zone and colors stay React
// props, not dangerouslySetInnerHTML.
import qrcode from "qrcode-generator";

// spec minimum quiet zone is 4 modules — skimping on it is the single most
// common reason a "why won't this scan" QR fails on a phone camera
const QUIET_ZONE = 4;

export function QrCode({
  value,
  size = 120,
  fg = "#0a0a0a",
  bg = "#ffffff",
  className,
  label,
}: {
  value: string;
  size?: number;
  fg?: string;
  bg?: string;
  className?: string;
  label?: string;
}) {
  if (!value) return null;
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const modules = qr.getModuleCount();
  const total = modules + QUIET_ZONE * 2;
  const cell = size / total;
  let d = "";
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (qr.isDark(row, col)) {
        const x = (col + QUIET_ZONE) * cell;
        const y = (row + QUIET_ZONE) * cell;
        d += `M${x.toFixed(2)},${y.toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h${(-cell).toFixed(2)}z`;
      }
    }
  }
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={label ?? "QR code to join"}
      className={className}
    >
      <rect width={size} height={size} fill={bg} />
      <path d={d} fill={fg} />
    </svg>
  );
}
