/** Gras partiel avec **mot** — Courier uniquement (partagé lecture / éditeur). */
export function ViagoRichCourier({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
