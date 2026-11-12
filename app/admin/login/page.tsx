import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/adminGuard';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin');
  return (
    <section className="panel mx-auto mt-[10vh] flex w-full max-w-[420px] flex-col gap-4 p-6">
      <p className="eyebrow m-0">Riddler</p>
      <h1 className="panel-title m-0 text-[32px] leading-none">Dashboard</h1>
      <LoginForm />
    </section>
  );
}
