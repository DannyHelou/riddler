import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'Privacy · Riddler' };

const EMAIL = 'dannyhelou817@gmail.com';

export default function PrivacyPage() {
  return (
    <Prose title="Privacy">
      <p className="m-0">Riddler has no accounts and asks for no personal details. Last updated November 12, 2026.</p>
      <p className="m-0">
        <strong>Your device ID.</strong> Your browser gets a random ID in a cookie, with a copy in local storage so a cleared cookie can be restored. It keeps you to one play per day and remembers your streak and results. It isn&apos;t linked to your name, email, or anything else about you.
      </p>
      <p className="m-0">
        <strong>Your answers.</strong> We store what you type, your time, and your score, so we can grade you and show everyone anonymous crowd charts after they finish, including the most common answers. Your sound and theme settings stay in your browser.
      </p>
      <p className="m-0">
        <strong>Game analytics.</strong> We keep a simple log of how the game is used: when you open it, which riddle you&apos;re on, whether you switch tabs or leave mid-riddle, and whether you finish, along with your country and whether you&apos;re on a phone or a computer. It&apos;s tied to the same random device ID, never to your IP address, and lives only in our own database. We use it to see how many people play and to fix problems. We never share or sell it, and it&apos;s never used for advertising. Events are deleted after 180 days.
      </p>
      <p className="m-0">
        <strong>Who processes it.</strong> The site runs on Vercel and the data is stored with Supabase. When a word answer is a close call, the riddle and your answer text (never your device ID) go to TypeSafe AI to be graded. We don&apos;t use advertising, third-party analytics, or cross-site tracking, and our fonts are served from this site.
      </p>
      <p className="m-0">
        <strong>How long.</strong> Plays are kept so daily results and streaks stay correct. Like any website, our host keeps short-lived server logs, including IP addresses, for security.
      </p>
      <p className="m-0">
        <strong>Your choices.</strong> Your plays aren&apos;t linked to you, so clearing this site&apos;s cookies and storage starts you fresh with a new ID. For any question about your data, email {EMAIL}.
      </p>
    </Prose>
  );
}
