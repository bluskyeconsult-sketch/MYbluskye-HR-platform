// ============================================
// Edge Function: Generate 2FA Secret
// Creates TOTP secret and QR code for authenticator app
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as speakeasy from 'https://esm.sh/speakeasy@2.0.0'
import * as QRCode from 'https://esm.sh/qrcode@1.5.1'

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
        const { userId, email } = await req.json()

        if (!userId || !email) {
            return new Response(
                JSON.stringify({ error: 'Missing userId or email' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
            name: `ODUSBABA:${email}`,
            length: 20,
            issuer: 'ODUSBABA'
        })

        // Generate QR code as data URL
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

        // Generate 10 backup codes
        const backupCodes = Array.from({ length: 10 }, () => {
            return Math.random().toString(36).substring(2, 10).toUpperCase()
        })

        // Store secret and backup codes temporarily (will be enabled after verification)
        const supabaseClient = createSupabaseClient(req)

        await supabaseClient
            .from('profiles')
            .update({
                two_factor_secret: secret.base32,
                two_factor_backup_codes: backupCodes,
                two_factor_enabled: false
            })
            .eq('id', userId)

        return new Response(
            JSON.stringify({
                secret: secret.base32,
                qrCodeUrl,
                backupCodes
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error generating 2FA secret:', error)
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
