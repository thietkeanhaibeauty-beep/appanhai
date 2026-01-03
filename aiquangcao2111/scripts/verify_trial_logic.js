import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDcxMTYsImV4cCI6MjA3OTI4MzExNn0.iRHg-xMZ1i_qb0xnQ6vDivcFEEdrpYb0Z6cSkgOLLyU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyTrialLogic() {
    console.log('🧪 Starting Trial Logic Verification...');

    // 1. Create a random user
    const email = `test_trial_${Date.now()}@example.com`;
    const password = 'Password123!';
    console.log(`👤 Creating test user: ${email}`);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (signUpError) {
        console.error('❌ Signup failed:', signUpError.message);
        return;
    }

    const userId = signUpData.user?.id;
    console.log(`✅ User created: ${userId}`);

    // 2. Manually invoke assign-trial-subscription (simulating frontend)
    console.log('🔄 Invoking assign-trial-subscription...');
    const { error: trialError } = await supabase.functions.invoke('assign-trial-subscription', {
        body: { userId }
    });

    if (trialError) {
        console.error('❌ Failed to assign trial:', trialError);
        return;
    }
    console.log('✅ Trial assigned.');

    // Wait a bit for propagation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Sign in to get session/token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (signInError) {
        console.error('❌ Signin failed:', signInError.message);
        return;
    }

    const token = signInData.session.access_token;
    console.log('🔑 Got access token.');

    // 4. Call get-feature-flags
    console.log('🔍 Calling get-feature-flags...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-feature-flags`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`❌ get-feature-flags failed: ${response.status} - ${text}`);
        return;
    }

    const flagsData = await response.json();

    // 5. Verify results
    console.log('📊 Verification Results:');

    const isTrialUser = flagsData.isTrialUser;
    console.log(`- isTrialUser: ${isTrialUser} ${isTrialUser === true ? '✅' : '❌'}`);

    const aiCreative = flagsData.features['ai_creative_campaign'];
    console.log(`- ai_creative_campaign: ${aiCreative?.enabled} ${aiCreative?.enabled === true ? '✅' : '❌'}`);
    console.log(`- Source: ${aiCreative?.source} ${aiCreative?.source === 'user_override' ? '✅' : '❌'}`);

    if (isTrialUser && aiCreative?.enabled) {
        console.log('🎉 TEST PASSED: Trial assigned and features enabled!');
    } else {
        console.error('🔥 TEST FAILED: Check logs above.');
    }
}

verifyTrialLogic();
