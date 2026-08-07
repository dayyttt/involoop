"use client";

const CHANNELS = [
  { name: "WhatsApp", color: "#25D366", icon: "wa" },
  { name: "Gmail", color: "#EA4335", icon: "mail" },
  { name: "LinkedIn", color: "#0A66C2", icon: "in" },
  { name: "Instagram", color: "#E4405F", icon: "ig" },
  { name: "Telegram", color: "#229ED9", icon: "tg" },
  { name: "Discord", color: "#5865F2", icon: "dc" },
];

function BrandIcon({ icon }: { icon: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true, fill: "none" } as const;
  const p = (d: string) => <path fill="currentColor" d={d} />;
  switch (icon) {
    case "wa":
      return (
        <svg {...common}>
          <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.2c-.3.8-1.4 1.5-2.3 1.7-.6.1-1.4.3-4-.9a14 14 0 0 1-5.5-5.2c-.6-.9-1.4-2.4-1.4-3.9 0-1.4.7-2.1 1-2.4.3-.3.6-.4.9-.4h.7c.2 0 .5-.1.8.6l1 2.5c.1.2.1.4 0 .6l-.4.7c-.2.2-.3.4-.1.7a9 9 0 0 0 4.2 3.7c.3.2.5.1.7-.1l.8-.9c.2-.3.4-.2.7-.1l2.4 1.2c.3.2.6.3.7.5 0 .1 0 .6-.2 1Z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <path fill="currentColor" d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm8 7.2L5.3 7h13.4L12 12.2Z" />
        </svg>
      );
    case "in":
      return (
        <svg {...common}>
          <path fill="currentColor" d="M4.5 4.5A2.5 2.5 0 0 1 8.2 3a2.5 2.5 0 0 1 0 3 2.5 2.5 0 0 1-3.7-1.5ZM4 8.5h4V20H4V8.5Zm7 0h3.8v1.6h.1c.5-1 1.8-2 3.7-2 4 0 4.4 2.6 4.4 6V20h-4v-5.2c0-1.2 0-2.9-1.8-2.9s-2 1.3-2 2.7V20h-4V8.5Z" />
        </svg>
      );
    case "ig":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <circle cx="17.5" cy="6.5" r="1.4" fill="currentColor" />
        </svg>
      );
    case "tg":
      return (
        <svg {...common}>
          <path fill="currentColor" d="m3 11.5 17-7-4 16-4.5-5.5L15 9l-6.5 4L3 11.5Z" />
        </svg>
      );
    case "dc":
      return (
        <svg {...common}>
          <path fill="currentColor" d="M20 5.6A16 16 0 0 0 15.6 4l-.2.5a13 13 0 0 1 4 2l-.4-.1c-1.6-.8-3.3-1.2-5-1.2s-3.4.4-5 1.2l-.4.1a13 13 0 0 1 4-2L13.4 4A16 16 0 0 0 8 5.6C4.3 9.2 3.4 12.8 3.8 16.2A16 16 0 0 0 8.6 19l1-1.7c-.8-.3-1.5-.7-2.2-1.1l.5-.4A10.8 10.8 0 0 0 12 17a10.8 10.8 0 0 0 4.1-.9l.5.4c-.7.4-1.4.8-2.2 1.1l1 1.7a16 16 0 0 0 4.8-2.8c.5-4-.8-7.5-4.2-11ZM9 14.2c-.8 0-1.4-.7-1.4-1.6 0-.9.6-1.6 1.4-1.6s1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6Zm6 0c-.8 0-1.4-.7-1.4-1.6 0-.9.6-1.6 1.4-1.6s1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6Z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ChannelMarquee({ label }: { label: string }) {
  const doubled = [...CHANNELS, ...CHANNELS];
  return (
    <div>
      <p className="marquee-label">{label}</p>
      <div className="marquee">
        <div className="marquee-track">
          {doubled.map((c, i) => (
            <span className="channel-chip" key={`${c.name}-${i}`}>
              <BrandIcon icon={c.icon} />
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
