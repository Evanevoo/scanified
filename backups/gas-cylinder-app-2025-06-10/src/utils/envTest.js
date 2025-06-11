export function testEnvironmentVariables() {
    const envVars = {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    };

    const results = {
        success: true,
        missing: [],
        message: ''
    };

    // Check if variables are defined
    if (!envVars.supabaseUrl) {
        results.missing.push('VITE_SUPABASE_URL');
        results.success = false;
    }
    
    if (!envVars.supabaseAnonKey) {
        results.missing.push('VITE_SUPABASE_ANON_KEY');
        results.success = false;
    }

    // Construct result message
    if (results.success) {
        results.message = 'All environment variables are properly configured!';
    } else {
        results.message = `Missing environment variables: ${results.missing.join(', ')}`;
    }

    return results;
} 