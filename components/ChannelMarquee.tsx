"use client";

import LogoLoop, { type LogoLoopItem } from "@/components/reactbits/LogoLoop";

const CHANNELS: (LogoLoopItem & { name: string; color: string })[] = [
  { src: "/brands/whatsapp.svg", name: "WhatsApp", color: "#25D366", alt: "WhatsApp" },
  { src: "/brands/gmail.svg", name: "Gmail", color: "#EA4335", alt: "Gmail" },
  { src: "/brands/linkedin.svg", name: "LinkedIn", color: "#0A66C2", alt: "LinkedIn" },
  { src: "/brands/instagram.svg", name: "Instagram", color: "#E4405F", alt: "Instagram" },
  { src: "/brands/telegram.svg", name: "Telegram", color: "#229ED9", alt: "Telegram" },
  { src: "/brands/discord.svg", name: "Discord", color: "#5865F2", alt: "Discord" },
];

export default function ChannelMarquee({ label }: { label?: string }) {
  return (
    <div>
      {label ? <p className="marquee-label">{label}</p> : null}
      <LogoLoop
        logos={CHANNELS}
        speed={55}
        logoHeight={44}
        gap={72}
        pauseOnHover
        fadeOut
        scaleOnHover
        ariaLabel={label ?? "Channels you already use"}
        renderItem={(item) => {
          const channel = item as (typeof CHANNELS)[number];
          return (
            <span className="channel-chip" style={{ "--brand": channel.color } as React.CSSProperties}>
              <img src={channel.src} alt={channel.name} />
              <span className="channel-chip-name">{channel.name}</span>
            </span>
          );
        }}
      />
    </div>
  );
}
