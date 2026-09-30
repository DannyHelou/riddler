import Link from 'next/link';
import { ThemeToggle } from './SiteHeader';

export function SiteFooter() {
  return (
    <footer className="px-4 pt-6 pb-8 text-[18px] text-haze md:px-10">
      <div className="mx-auto flex max-w-[1040px] flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <span>Three riddles a day, same for everyone</span>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6">
          <Link href="/about" className="text-haze no-underline hover:text-moonlight">About</Link>
          <Link href="/privacy" className="text-haze no-underline hover:text-moonlight">Privacy</Link>
          <Link href="/contact" className="text-haze no-underline hover:text-moonlight">Contact</Link>
          <span className="hidden md:inline">
            <ThemeToggle />
          </span>
        </nav>
      </div>
    </footer>
  );
}
