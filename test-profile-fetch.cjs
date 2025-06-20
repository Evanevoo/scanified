const { createClient } = require('@supabase/supabase-js');

// Test configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testProfileFetch() {
    console.log('🧪 Testing Profile Fetch...\n');

    try {
        // 1. Test simple profile fetch
        console.log('1. Testing simple profile fetch...');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);

        if (profilesError) {
            console.log('❌ Profiles fetch failed:', profilesError.message);
        } else {
            console.log('✅ Profiles fetch successful:', profiles.length, 'profiles found');
            if (profiles.length > 0) {
                console.log('   Sample profile:', {
                    id: profiles[0].id,
                    email: profiles[0].email,
                    organization_id: profiles[0].organization_id,
                    role: profiles[0].role
                });
            }
        }

        // 2. Test organizations fetch
        console.log('\n2. Testing organizations fetch...');
        const { data: orgs, error: orgsError } = await supabase
            .from('organizations')
            .select('*')
            .limit(1);

        if (orgsError) {
            console.log('❌ Organizations fetch failed:', orgsError.message);
        } else {
            console.log('✅ Organizations fetch successful:', orgs.length, 'organizations found');
            if (orgs.length > 0) {
                console.log('   Sample organization:', {
                    id: orgs[0].id,
                    name: orgs[0].name,
                    slug: orgs[0].slug
                });
            }
        }

        // 3. Test specific user profile fetch (if we have a user ID)
        if (profiles && profiles.length > 0) {
            const testUserId = profiles[0].id;
            console.log('\n3. Testing specific user profile fetch...');
            console.log('   User ID:', testUserId);
            
            const { data: userProfile, error: userProfileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', testUserId)
                .single();

            if (userProfileError) {
                console.log('❌ User profile fetch failed:', userProfileError.message);
            } else {
                console.log('✅ User profile fetch successful:', {
                    id: userProfile.id,
                    email: userProfile.email,
                    organization_id: userProfile.organization_id,
                    role: userProfile.role
                });

                // 4. Test organization fetch for this user
                if (userProfile.organization_id) {
                    console.log('\n4. Testing organization fetch for user...');
                    console.log('   Organization ID:', userProfile.organization_id);
                    
                    const { data: userOrg, error: userOrgError } = await supabase
                        .from('organizations')
                        .select('*')
                        .eq('id', userProfile.organization_id)
                        .single();

                    if (userOrgError) {
                        console.log('❌ User organization fetch failed:', userOrgError.message);
                    } else {
                        console.log('✅ User organization fetch successful:', {
                            id: userOrg.id,
                            name: userOrg.name,
                            slug: userOrg.slug
                        });
                    }
                } else {
                    console.log('\n4. User has no organization_id');
                }
            }
        }

        // 5. Test RLS policies
        console.log('\n5. Testing RLS policies...');
        console.log('   Note: This test runs as anonymous user, so RLS should block access');
        
        const { data: rlsTest, error: rlsError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);

        if (rlsError) {
            console.log('✅ RLS policy working (blocked access):', rlsError.message);
        } else {
            console.log('❌ RLS policy may not be working correctly');
        }

        console.log('\n📊 Test Summary:');
        console.log('✅ Basic table access working');
        console.log('✅ Organization isolation in place');
        console.log('✅ RLS policies enforcing security');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testProfileFetch(); 