const testUseAuthQuery = async () => {
  setTestResult({ status: 'loading', message: 'Testing useAuth query...' });
  
  try {
    console.log('Testing useAuth query for user:', user?.id);
    
    // First fetch the profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log('Profile fetch result:', { profileData, profileError });
    
    if (profileError) {
      throw new Error(`Profile fetch failed: ${profileError.message}`);
    }
    
    // If profile has organization_id, fetch the organization
    if (profileData?.organization_id) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profileData.organization_id)
        .single();
      
      console.log('Organization fetch result:', { orgData, orgError });
      
      if (orgError) {
        throw new Error(`Organization fetch failed: ${orgError.message}`);
      }
      
      setTestResult({
        status: 'success',
        message: `Query successful! Profile: ${JSON.stringify(profileData, null, 2)}, Organization: ${JSON.stringify(orgData, null, 2)}`
      });
    } else {
      setTestResult({
        status: 'success',
        message: `Profile loaded but no organization_id: ${JSON.stringify(profileData, null, 2)}`
      });
    }
  } catch (error) {
    console.error('Test failed:', error);
    setTestResult({
      status: 'failed',
      message: `Error: ${error.message}`
    });
  }
}; 