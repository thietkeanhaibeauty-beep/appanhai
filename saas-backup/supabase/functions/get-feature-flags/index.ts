import { getUserFromRequest } from '../_shared/auth.ts';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EffectiveFeature {
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  source: 'global' | 'role' | 'user_override' | 'subscription';
  category: string;
}

async function fetchFromNocoDB(tableId: string, params?: Record<string, string>, options?: { silent?: boolean }) {
  const url = new URL(`${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  }

  if (!options?.silent) {
    console.log('🔍 Fetching from NocoDB:', url.toString());
  }

  const response = await fetch(url.toString(), {
    headers: getNocoDBHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (!options?.silent) {
      console.error('❌ NocoDB request failed:', {
        status: response.status,
        url: url.toString(),
        body: errorBody,
      });
    }
    throw new Error(`NocoDB request failed: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Getting feature flags for user');

    const user = await getUserFromRequest(req);
    console.log('✅ Authenticated user:', user.id);

    // Get user roles from NocoDB
    const userRolesData = await fetchFromNocoDB(NOCODB_CONFIG.TABLES.USER_ROLES, {
      where: `(user_id,eq,${user.id})`,
    });

    const roles = (userRolesData.list || []).map((r: any) => r.role);
    console.log('📋 User roles from NocoDB:', roles);

    // Get user's active subscription from NocoDB (include both 'active' and 'trial' status)
    const subscriptionsData = await fetchFromNocoDB(NOCODB_CONFIG.TABLES.USER_SUBSCRIPTIONS, {
      where: `(user_id,eq,${user.id})~and(status,in,active,trial)`,
      limit: '1',
      sort: '-CreatedAt',
    });
    const activeSubscription = subscriptionsData.list?.[0];

    // Determine subscription tier from package_id (Trial/Starter/Pro/Enterprise/Team)
    let subscriptionTier: string | null = null;
    if (activeSubscription?.package_id) {
      // package_id contains tier name like "Trial", "Starter", "Pro", "Enterprise", "Team"
      subscriptionTier = activeSubscription.package_id;
      console.log('💳 User subscription tier:', subscriptionTier);
    } else {
      console.log('⚠️ No active subscription found for user');
    }

    // =====================================================
    // Get workspace member role (owner/admin/marketing/sales)
    // =====================================================
    let workspaceMemberRole: string | null = null;
    try {
      const membershipData = await fetchFromNocoDB(NOCODB_CONFIG.TABLES.WORKSPACE_MEMBERS, {
        where: `(user_id,eq,${user.id})~and(status,eq,active)`,
        limit: '1',
      }, { silent: true });
      const membership = membershipData.list?.[0];
      if (membership?.role) {
        workspaceMemberRole = membership.role;
        console.log('👥 Workspace member role:', workspaceMemberRole);
      }
    } catch (err) {
      console.log('⚠️ Could not get workspace membership (table may not exist)');
    }


    // Get all feature flags from NocoDB
    const allFlagsData = await fetchFromNocoDB(NOCODB_CONFIG.TABLES.FEATURE_FLAGS);
    const allFlags = allFlagsData.list || [];
    console.log('📋 Feature flags count:', allFlags.length);

    // Get all role-based features from NocoDB (now with package tier columns)
    const roleFeaturesData = await fetchFromNocoDB(NOCODB_CONFIG.TABLES.ROLE_FEATURE_FLAGS, {
      limit: '1000',
    });
    const allRoleFeatures = roleFeaturesData.list || [];
    console.log('📋 Role features count:', allRoleFeatures.length);

    // Determine user's primary role
    const userRole = roles.includes('super_admin')
      ? 'super_admin'
      : roles.includes('admin')
        ? 'admin'
        : 'user';

    console.log('👤 User role:', userRole);

    // Get user overrides from NocoDB (optional - may not exist)
    let userOverrides: any[] = [];
    try {
      const userOverridesData = await fetchFromNocoDB(NOCODB_CONFIG.TABLES.USER_FEATURE_OVERRIDES, {
        where: `(user_id,eq,${user.id})`,
      }, { silent: true });
      userOverrides = userOverridesData.list || [];
      console.log('📋 User overrides count:', userOverrides.length);
    } catch (err) {
      console.log('⚠️ Could not get user feature overrides (table may not exist)');
    }

    // Calculate effective features
    const effectiveFeatures: Record<string, EffectiveFeature> = {};
    const isSuperAdmin = roles.includes('super_admin');

    for (const flag of allFlags) {
      // Check user override first (highest priority)
      const userOverride = userOverrides.find((o: any) => o.feature_key === flag.key);
      if (userOverride) {
        effectiveFeatures[flag.key] = {
          key: flag.key,
          name: flag.name,
          description: flag.description,
          enabled: userOverride.enabled,
          source: 'user_override',
          category: flag.category || 'general',
        };
        continue;
      }

      // Check role-based permission OR subscription tier permission
      const roleFeature = allRoleFeatures.find((rf: any) => rf.feature_key === flag.key);

      if (roleFeature) {
        let featureEnabled = false;
        let source: 'role' | 'subscription' = 'subscription';

        // SIMPLIFIED LOGIC:
        // 1. Super Admin always gets all features
        // 2. Other users get features based on their subscription tier only

        if (isSuperAdmin) {
          // Super Admin override - always enabled
          featureEnabled = true;
          source = 'role';
          console.log(`✅ Feature ${flag.key}: super_admin override`);
        } else if (subscriptionTier) {
          // Feature access based on subscription tier column
          const tierEnabled = roleFeature[subscriptionTier];
          let wsRoleEnabled = true; // Default true if no workspace role

          // Check workspace member role if user has one
          if (workspaceMemberRole) {
            const wsRoleColumn = `ws_${workspaceMemberRole}`; // ws_owner, ws_admin, ws_marketing, ws_sales
            wsRoleEnabled = Boolean(roleFeature[wsRoleColumn]);
            console.log(`👥 Feature ${flag.key}: ws_role=${workspaceMemberRole}, column=${wsRoleColumn}, enabled=${wsRoleEnabled}`);
          }

          // Feature enabled if BOTH tier and workspace role allow it
          featureEnabled = Boolean(tierEnabled) && wsRoleEnabled;
          console.log(`📦 Feature ${flag.key}: tier=${subscriptionTier}(${tierEnabled}), ws_role=${workspaceMemberRole}(${wsRoleEnabled}), final=${featureEnabled}`);
        } else {
          // No subscription = no features
          featureEnabled = false;
          console.log(`⚠️ Feature ${flag.key}: no subscription, disabled`);
        }


        effectiveFeatures[flag.key] = {
          key: flag.key,
          name: flag.name,
          description: flag.description,
          enabled: featureEnabled,
          source: source,
          category: flag.category || 'general',
        };
      } else {
        // No role feature defined - LOG THIS!
        console.warn(`⚠️ Feature ${flag.key} NOT found in ROLE_FEATURE_FLAGS table!`);

        // super admin gets global default
        if (isSuperAdmin) {
          effectiveFeatures[flag.key] = {
            key: flag.key,
            name: flag.name,
            description: flag.description,
            enabled: flag.enabled,
            source: 'global',
            category: flag.category || 'general',
          };
        }
        // Non-super-admin users don't see features without role permissions
      }


    }

    console.log('✅ Calculated effective features:', Object.keys(effectiveFeatures).length);

    return new Response(
      JSON.stringify({
        features: effectiveFeatures,
        roles,

      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in get-feature-flags:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
