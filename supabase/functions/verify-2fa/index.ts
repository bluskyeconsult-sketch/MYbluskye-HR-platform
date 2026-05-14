// ============================================
// Edge Function: Verify 2FA
// Validates TOTP code and enables 2FA or verifies login
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as speakeasy from 'https://esm.sh/speakeasy@2.0.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { userId, token, secret, backupCodes, action } = await req.json()

        if (!userId || !token) {
            return new Response(
                JSON.stringify({ error: 'Missing userId or token' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseClient = createSupabaseClient(req)

        // Get user's 2FA data
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('two_factor_secret, two_factor_enabled')
            .eq('id', userId)
            .single()

        if (profileError) {
            return new Response(
                JSON.stringify({ error: 'User not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const secretKey = secret || profile.two_factor_secret
        
        if (!secretKey && action !== 'login') {
            return new Response(
                JSON.stringify({ error: 'No 2FA secret found' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Verify TOTP token
        const verified = speakeasy.totp.verify({
            secret: secretKey,
            encoding: 'base32',
            token: token,
            window: 1 // Allow 1 step before/after for time drift
        })

        if (action === 'enable') {
            if (verified) {
                // Enable 2FA permanently
                await supabaseClient
                    .from('profiles')
                    .update({
                        two_factor_enabled: true,
                        two_factor_last_verified: new Date().toISOString()
                    })
                    .eq('id', userId)

                // Log event
                await supabaseClient.rpc('log_2fa_event', {
                    p_user_id: userId,
                    p_action: 'enabled',
                    p_metadata: JSON.stringify({ success: true })
                })

                return new Response(
                    JSON.stringify({ verified: true }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            } else {
                return new Response(
                    JSON.stringify({ verified: false, message: 'Invalid verification code' }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        } else if (action === 'login') {
            if (verified) {
                // Update last verified timestamp
                await supabaseClient
                    .from('profiles')
                    .update({ two_factor_last_verified: new Date().toISOString() })
                    .eq('id', userId)

                // Log successful login
                await supabaseClient.rpc('log_2fa_event', {
                    p_user_id: userId,
                    p_action: 'verified',
                    p_metadata: JSON.stringify({ success: true })
                })

                return new Response(
                    JSON.stringify({ verified: true }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            } else {
                // Log failed attempt
                await supabaseClient.rpc('log_2fa_event', {
                    p_user_id: userId,
                    p_action: 'failed',
                    p_metadata: JSON.stringify({ invalid_token: true })
                })

                return new Response(
                    JSON.stringify({ verified: false, message: 'Invalid verification code' }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error verifying 2FA:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

function createSupabaseClient(req: Request) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: { Authorization: req.headers.get('Authorization')! },
        },
    })
}
