import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3efe8] px-6 py-10 text-stone-900">
      <section className="w-full max-w-lg border border-stone-300 bg-[#fffdf8] px-6 py-8 shadow-[8px_8px_0_0_#cfc2b2] sm:px-10 sm:py-10">
        <header className="flex items-center justify-between border-b border-stone-200 pb-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          <span>Daily practice</span>
          <span>01</span>
        </header>

        <div className="py-9">
          <p className="mb-3 text-sm font-medium text-[#b45335]">A small start</p>
          <h1 className="font-serif text-4xl leading-tight tracking-tight text-stone-950 sm:text-5xl">
            Keep showing up.
          </h1>
          <p className="mt-4 max-w-sm leading-7 text-stone-600">
            One click at a time. Use the counter as a tiny reminder that progress
            is built from simple actions.
          </p>
        </div>

        <div className="flex items-end justify-between border-y border-stone-200 py-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Total clicks
            </p>
            <p className="mt-2 font-serif text-7xl leading-none tabular-nums text-stone-950">
              {count}
            </p>
          </div>
          <p className="pb-1 text-sm text-stone-500">
            {count === 1 ? 'click' : 'clicks'} made
          </p>
        </div>

        <div className="pt-7">
          <button
            type="button"
            onClick={() => setCount((currentCount) => currentCount + 1)}
            className="w-full bg-[#b45335] px-5 py-3.5 font-semibold text-white transition hover:bg-[#963f27] focus:outline-none focus:ring-2 focus:ring-[#b45335] focus:ring-offset-2 focus:ring-offset-[#fffdf8] active:translate-y-px"
          >
            Add one click
          </button>

          {count > 0 && (
            <button
              type="button"
              onClick={() => setCount(0)}
              className="mt-4 block w-full text-center text-sm text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-950"
            >
              Start over
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
