import { MessageCircle, Shield, Heart } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          {/* Logo/Brand */}
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            Mora
          </h1>
          <p className="mb-8 text-xl text-zinc-600 dark:text-zinc-400">
            Break the cycle of transactional conflict.
          </p>

          {/* Value Proposition */}
          <p className="mb-12 text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
            Your pocket companion for transforming relationship conflict. Move
            from <span className="font-semibold text-red-600">fear of losing</span>{" "}
            to <span className="font-semibold text-green-600">fear of hurting</span>.
          </p>

          {/* CTA Button - Will become Google Sign In */}
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-zinc-900 px-8 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            disabled
          >
            Coming Soon
          </button>

          {/* Features Preview */}
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <MessageCircle className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Unpack
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Understand what she&apos;s really saying beneath the words.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Shield className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Drop the Shield
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Catch defensive logic before it damages the connection.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Heart className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Repair
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Draft responses that connect, not perform.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <p>Mora &copy; {new Date().getFullYear()}. Built with care.</p>
      </footer>
    </div>
  );
}
