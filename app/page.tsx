import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  const primaryHref = session?.user ? "/dashboard" : "/login";
  const primaryLabel = session?.user ? "Ir al dashboard" : "Iniciar sesión";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="flex w-full max-w-2xl flex-col items-center gap-10 text-center">
        <Image
          src="/icons/logo.svg"
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
          <Link
            href={primaryHref}
            className="rounded-full bg-brand-500 px-6 py-3 font-medium text-fg-on-brand transition-colors hover:bg-brand-600 active:bg-brand-700"
          >
            {primaryLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
