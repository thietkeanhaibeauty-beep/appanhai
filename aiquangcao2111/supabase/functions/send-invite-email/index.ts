/**
 * Send Workspace Invite Email
 * Sử dụng Supabase inviteUserByEmail với redirectTo tùy chỉnh
 * Template email trong Supabase cần dùng {{ .RedirectTo }} thay vì {{ .ConfirmationURL }}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteEmailRequest {
  email: string;
  workspaceName: string;
  inviterName: string;
  role: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, workspaceName, inviterName, role } = await req.json() as InviteEmailRequest;

    if (!email || !workspaceName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, workspaceName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 Sending invite email to ${email} for workspace ${workspaceName}`);

    // App URL - tự động detect môi trường
    // Production: aiautofb.com, Development: localhost:8080
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8080';

    // Link đến trang invite-accept (KHÔNG tự động đăng nhập)
    const inviteAcceptUrl = `${appUrl}/auth/invite-accept?email=${encodeURIComponent(email)}&workspace=${encodeURIComponent(workspaceName)}`;

    console.log(`🔗 Invite URL: ${inviteAcceptUrl}`);

    // Gọi inviteUserByEmail với redirectTo
    // Template email trong Supabase phải dùng {{ .RedirectTo }} để hiển thị link này
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        workspace_invite: true,
        workspace_name: workspaceName,
        inviter_name: inviterName,
        role: role,
      },
      redirectTo: inviteAcceptUrl,
    });

    if (error) {
      // Nếu user đã tồn tại, gửi magic link thay vì invite
      if (error.message.includes('already') ||
        error.message.includes('registered') ||
        error.message.includes('exists')) {

        console.log(`ℹ️ User ${email} already exists, sending magic link...`);

        const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
          email: email,
          options: {
            emailRedirectTo: inviteAcceptUrl,
            data: {
              workspace_invite: true,
              workspace_name: workspaceName,
              inviter_name: inviterName,
              role: role,
            }
          }
        });

        if (otpError) {
          console.error('❌ Failed to send OTP:', otpError);
          return new Response(
            JSON.stringify({ error: otpError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Đã gửi email đăng nhập đến ${email}`,
            userExists: true,
            emailSentAt: new Date().toISOString()
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('❌ Failed to send invite:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Invite email sent to ${email}`);
    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã gửi lời mời đến ${email}`,
        userId: data?.user?.id,
        emailSentAt: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
