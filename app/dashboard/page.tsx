import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const { name, email, image } = session.user;

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-12">
      <main className="flex w-full max-w-3xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/icons/logo.svg"
              alt="Pickflix"
              width={40}
              height={40}
              className="rounded-md"
            />
            <span className="text-lg font-semibold text-fg">Pickflix</span>
          </div>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="rounded-full border border-border px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
            >
              Cerrar sesión
            </button>
          </form>
        </header>

        <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-5">
          {image && (
            <Image
              src={image}
              alt={name ?? "Avatar"}
              width={48}
              height={48}
              className="rounded-full"
            />
          )}
          <div className="flex flex-col">
            <span className="text-base font-medium text-fg">
              {name ?? "Sin nombre"}
            </span>
            <span className="text-sm text-fg-muted">{email}</span>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface px-6 py-8">
          <h2 className="text-xl font-semibold text-fg">Mis sesiones</h2>
          <p className="text-sm text-fg-muted">
            Acá vas a ver tus clubes de cine cuando arranquemos el Hito 2.
            Por ahora solo confirmamos que el login anda.
          </p>
        </section>
      </main>
    </div>
  );
}
