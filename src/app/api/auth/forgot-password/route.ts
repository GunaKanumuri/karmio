import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const schema = z.object({
    email: z.string().email('Please enter a valid email address.'),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || 'Invalid input.' },
            }, { status: 400 });
        }

        const { email } = parsed.data;
        const supabase = await createServerSupabase();

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${new URL(request.url).origin}/auth-pages/callback`,
        });

        if (error) {
            console.error('Password reset error:', error.message);
            // Don't reveal if user exists — always return success
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Forgot password error:', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
        }, { status: 500 });
    }
}
