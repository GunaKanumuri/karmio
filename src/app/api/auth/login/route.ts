import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { loginSchema, validateInput } from '@/lib/validation/schemas';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate input with Zod
        const validation = validateInput(loginSchema, body);
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

        const { email, password } = validation.data;
        const supabase = await createServerSupabase();

        // Attempt login
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            // Map Supabase errors to spec error codes
            if (error.message.includes('Invalid login credentials')) {
                return NextResponse.json({
                    success: false,
                    error: {
                        code: 'AUTH_INVALID_CREDENTIALS',
                        message: 'Email or password is incorrect.',
                        action: 'Check your credentials or reset your password.',
                        retryable: true,
                    },
                }, { status: 401 });
            }

            if (error.message.includes('Email not confirmed')) {
                return NextResponse.json({
                    success: false,
                    error: {
                        code: 'AUTH_EMAIL_NOT_VERIFIED',
                        message: 'Please verify your email first.',
                        action: 'Check your inbox for a verification link.',
                        retryable: false,
                    },
                }, { status: 403 });
            }

            return NextResponse.json({
                success: false,
                error: {
                    code: 'AUTH_LOGIN_FAILED',
                    message: 'Login failed. Please try again.',
                    retryable: true,
                },
            }, { status: 401 });
        }

        if (!data.user) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'AUTH_LOGIN_FAILED',
                    message: 'Login failed. Please try again.',
                    retryable: true,
                },
            }, { status: 401 });
        }

        // Fetch user profile
        let { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        // Auto-create profile if first login
        if (!profile) {
            const { data: newProfile } = await supabase
                .from('users')
                .upsert({
                    id: data.user.id,
                    email: data.user.email || '',
                    full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
                    onboarding_complete: false,
                    country: 'US',
                    subscription_tier: 'free',
                }, { onConflict: 'id' })
                .select('*')
                .single();
            profile = newProfile;
        }

        return NextResponse.json({
            success: true,
            data: {
                user: profile,
                redirect: profile?.onboarding_complete ? '/dashboard/home' : '/onboarding/location',
            },
        }, {
            headers: {
                'X-RateLimit-Limit': '5',
                'X-RateLimit-Remaining': '4',
                'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 900),
            },
        });
    } catch (err) {
        console.error('Login error:', err);
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
