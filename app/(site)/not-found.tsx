import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-start gap-5 px-4 py-16">
      <h1 className="pixel m-0 text-[14px] leading-[1.6]">Lost in the clouds</h1>
      <p className="m-0 text-[22px] text-haze">That page isn&apos;t here.</p>
      <Link href="/" className="btn-primary px-8">Back to today</Link>
    </div>
  );
}
