/**
 * Phone-sized portal (brief §6): full screen on a phone; on a laptop, a centred phone frame so it reads as a
 * phone on stage. `dark` = navy session screens.
 */
export function PhoneFrame({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`min-h-dvh sm:flex sm:items-center sm:justify-center sm:py-6 ${dark ? 'sm:bg-paper-shade' : 'sm:bg-paper-shade/60'}`}>
      <div
        className={`relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden sm:h-[min(880px,calc(100dvh-48px))] sm:min-h-0 sm:w-[400px] sm:rounded-[46px] sm:shadow-[0_40px_80px_-30px_rgba(4,20,28,0.55),0_0_0_10px_#04141c,0_0_0_11px_rgba(255,255,255,0.08)] ${
          dark ? 'bg-navy text-white' : 'bg-paper text-ink'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Speaker slot of the frame (laptop only) */}
        <div className="pointer-events-none absolute top-2.5 left-1/2 z-50 hidden h-[22px] w-[96px] -translate-x-1/2 rounded-full bg-navy-deep sm:block" />
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
