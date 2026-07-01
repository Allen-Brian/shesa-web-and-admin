import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shesa/ui';

import { getServerClient } from '@/lib/supabase-server';

import { ResetPasswordForm } from './form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shesa — Choose a new password',
};

export default async function ResetPasswordPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/?error=reset_expired');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Pick something at least 8 characters long.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
