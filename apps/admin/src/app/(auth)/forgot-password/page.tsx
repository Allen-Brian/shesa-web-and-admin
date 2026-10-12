import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Logo,
} from '@shesa/ui';

import { ForgotPasswordForm } from './forgot-password-form';

export const metadata = {
  title: 'Shesa Admin — Reset password',
};

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Logo size={56} className="mb-2" />
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter the email tied to your Shesa account and we&apos;ll send a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
