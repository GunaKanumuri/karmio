import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.errors[0].message,
          retryable: false,
        },
      }, { status: 400 });
    }

    const { email } = result.data;
    const supabase = await createServerSupabase();

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth-pages/callback?type=recovery`,
    });

    if (error) {
      console.error('Password reset error:', error);
      // Don't reveal whether email exists for security
      // Always return success to prevent email enumeration
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      success: true,
      data: { message: 'If an account exists, a reset link has been sent.' },
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        retryable: true,
      },
    }, { status: 500 });
  }
}