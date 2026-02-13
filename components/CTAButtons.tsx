import Link from "next/link";

const BUTTON_WIDTH = 320;
const BUTTON_HEIGHT = 100;

const buttonImageStyle = (imageUrl: string) => ({
  position: "absolute" as const,
  width: `${BUTTON_HEIGHT}px`,
  height: `${BUTTON_WIDTH}px`,
  left: "50%",
  top: "50%",
  marginLeft: `-${BUTTON_HEIGHT / 2}px`,
  marginTop: `-${BUTTON_WIDTH / 2}px`,
  backgroundImage: `url(${imageUrl})`,
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  transform: "rotate(-90deg)",
});

export default function CTAButtons() {
  return (
    <section
      className="flex flex-row flex-nowrap items-center justify-center gap-6 pt-10"
      aria-label="Accès à l'application"
    >
      <Link
        href="/login"
        className="relative inline-flex h-[100px] w-[320px] shrink-0 items-center justify-center overflow-hidden transition hover:opacity-90"
      >
        <span
          className="absolute inset-0 z-0"
          style={buttonImageStyle("/bouton-orange.png")}
          aria-hidden
        />
        <span
          className="relative z-10 px-2 text-center font-mono text-[15px] font-normal leading-tight text-[#2c221c]"
          style={{ fontFamily: "var(--font-ibm-plex-mono), monospace" }}
        >
          Se connecter
        </span>
      </Link>

      <Link
        href="/demo"
        className="relative inline-flex h-[100px] w-[320px] shrink-0 items-center justify-center overflow-hidden transition hover:opacity-90"
      >
        <span
          className="absolute inset-0 z-0"
          style={buttonImageStyle("/bouton%20blanc.png")}
          aria-hidden
        />
        <span
          className="relative z-10 px-2 text-center font-mono text-[15px] font-normal leading-tight text-[#333333]"
          style={{ fontFamily: "var(--font-ibm-plex-mono), monospace" }}
        >
          Tester
        </span>
      </Link>
    </section>
  );
}
