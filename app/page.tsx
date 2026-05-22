import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="flex w-full max-w-2xl flex-col items-center gap-10 text-center">
        <Image
          src="/icons/logo.png"
          alt="Pickflix"
          width={120}
          height={120}
          priority
          className="rounded-2xl shadow-lg shadow-black/40"
        />

        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
            Pickflix
          </h1>
          <p className="text-lg text-fg-muted">
            Armá una sesión, cargá las pelis candidatas, compartí el link y que
            tus amigos voten. La que más quieran ver, gana.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="rounded-full bg-brand-500 px-6 py-3 font-medium text-fg-on-brand transition-colors hover:bg-brand-600 active:bg-brand-700"
          >
            Crear sesión
          </button>
          <button
            type="button"
            className="rounded-full border border-border px-6 py-3 font-medium text-fg transition-colors hover:bg-surface hover:border-border-strong"
          >
            Cómo funciona
          </button>
        </div>

        {/* Vote palette preview — útil mientras iteramos el sistema de colores */}
        <div className="mt-8 grid w-full grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-success/40 bg-success-soft px-4 py-3 text-success">
            Sí, la quiero ver
          </div>
          <div className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-warning">
            Tal vez
          </div>
          <div className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-danger">
            No
          </div>
        </div>
      </main>
    </div>
  );
}
