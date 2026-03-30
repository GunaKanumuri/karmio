import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { signupSchema, validateInput } from '@/lib/validation/schemas';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate input with Zod
        const validation = validateInput(signupSchema, body);
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: validation.error,
                    retryable: false,
                },
            }, { status: 400 });
        }

        const { email, password, full_name } = validation.data;
        const supabase = await createServerSupabase();

        // Create auth user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${new URL(request.url).origin}/auth-pages/callback`,
                data: { full_name },
            },
        });

        if (error) {
            if (error.message.includes('already registered') || error.message.includes('already been registered')) {
                return NextResponse.json({
                    success: false,
                    error: {
                        code: 'AUTH_EMAIL_EXISTS',
                        message: 'An account with this email already exists.',
                        action: 'Try signing in instead, or use a different email.',
                        retryable: false,
                    },
                }, { status: 409 });
            }

            return NextResponse.json({
                success: false,
                error: {
                    code: 'AUTH_SIGNUP_FAILED',
                    message: error.message || 'Could not create account. Please try again.',
                    retryable: true,
                },
            }, { status: 400 });
        }

        // Auto-create user record in users table
        if (data.user) {
            await supabase.from('users').upsert({
                id: data.user.id,
                email: data.user.email || email,
                full_name,
                onboarding_complete: false,
                country: 'US',
                subscription_tier: 'free',
            }, { onConflict: 'id' });

            // Create user_settings record
            await supabase.from('user_settings').upsert({
                user_id: data.user.id,
            }, { onConflict: 'user_id' }).select().single();
        }

        // Check if email confirmation is required
        const needsVerification = data.user && !data.session;

        return NextResponse.json({
            success: true,
            data: {
                needs_verification: needsVerification,
                email,
            },
        });
    } catch (err) {
        console.error('Signup error:', err);
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