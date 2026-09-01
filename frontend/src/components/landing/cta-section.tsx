import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-24 bg-white relative z-10">
      <div className="container mx-auto px-4 md:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-950 px-8 py-20 md:px-16 md:py-24 text-white shadow-2xl">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
             <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiM2MzY2ZjEiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
          </div>
          
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Take your supply chain resilience to the next level today
            </h2>
            <p className="text-indigo-200 text-lg mb-10 max-w-2xl mx-auto">
              ARES gives your team the tools to uncover opportunities, understand financial performance, and make smarter sourcing decisions in real-time. Turn complex data into clear insights.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-bold text-indigo-950 transition-colors hover:bg-gray-100 shadow-lg"
              >
                Access Control Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
