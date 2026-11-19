/** Required on every screen (brief §4.5, §15). */
export function PrototypeFooter({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  return (
    <p
      className={`text-[11px] tracking-wide ${dark ? 'text-white/45' : 'text-ink-muted'} ${className}`}
    >
      Prototype · illustrative data · not a medical device
    </p>
  );
}
