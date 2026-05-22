import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="flex w-full max-w-md flex-col items-center gap-8 rounded-2xl border border-border bg-surface px-8 py-12 text-center">
        <Image
          src="/icons/logo.svg"
          alt="Pickflix"
          width={80}
          height={80}
          priority
          className="rounded-xl"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-fg">Iniciá sesión</h1>
          <p className="text-sm text-fg-muted">
            Necesitás una cuenta para crear y administrar sesiones de cine.
            Los invitados pueden votar sin registrarse.
          </p>
        </div>

        <form action={signInWithGoogle} className="w-full">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-full bg-brand-500 px-6 py-3 font-medium text-fg-on-brand transition-colors hover:bg-brand-600 active:bg-brand-700"
          >
            Continuar con Google
          </button>
        </form>
      </main>
    </div>
  );
}
