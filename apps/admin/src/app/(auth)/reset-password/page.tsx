import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Logo } from '@shesa/ui';

import { getServerClient } from '@/lib/supabase-server';

import { ResetPasswordForm } from './reset-password-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shesa Admin — Choose a new password',
};

export default async function ResetPasswordPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?error=reset_expired');
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Logo size={56} className="mb-2" />
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Pick something at least 8 characters long.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
