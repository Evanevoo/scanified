import logger from '../utils/logger';
import { supabase } from '../supabase/client';

export class OrganizationDeletionService {
  /**
   * Soft delete an organization (mark as deleted but keep data, PERMANENTLY delete users)
   * @param {string} organizationId - The ID of the organization to delete
   * @param {string} reason - Reason for deletion
   * @param {string} userId - ID of user performing the deletion
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async softDeleteOrganization(organizationId, reason = '', userId = null) {
    try {
      logger.log('🗑️ Soft deleting organization:', organizationId);
      
      // First, get the organization info
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, deleted_at')
        .eq('id', organizationId)
        .single();

      if (orgError || !orgData) {
        return { success: false, message: 'Organization not found' };
      }

      if (orgData.deleted_at) {
        return { success: false, message: 'Organization is already deleted' };
      }

      logger.log('📋 Soft deleting organization:', orgData.name);

      // Step 1: Get all users in this organization
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('organization_id', organizationId);

      if (usersError) {
        logger.error('Error fetching users:', usersError);
      }

      logger.log(`Found ${users?.length || 0} users to permanently delete`);

      // Step 2: PERMANENTLY DELETE user profiles
      // This allows the email addresses to be reused
      if (users && users.length > 0) {
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('organization_id', organizationId);

        if (deleteError) {
          logger.error('Error deleting user profiles:', deleteError);
          return { 
            success: false, 
            message: `Failed to delete user profiles: ${deleteError.message}` 
          };
        } else {
          logger.log(`✅ Permanently deleted ${users.length} user profiles`);
        }
      }

      // Step 3: Delete pending invites
      const { error: invitesError } = await supabase
        .from('organization_invites')
        .delete()
        .eq('organization_id', organizationId);

      if (invitesError) {
        logger.warn('Error deleting invites:', invitesError);
      }

      // Step 4: Update organization to mark as deleted (soft delete for data retention)
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          deletion_reason: reason || 'No reason provided'
        })
        .eq('id', organizationId);

      if (updateError) {
        throw updateError;
      }

      logger.log('✅ Organization soft deleted successfully');

      return {
        success: true,
        message: `Organization "${orgData.name}" has been marked as deleted. ${users?.length || 0} user accounts have been permanently removed. The organization can be restored, but users will need new email addresses to rejoin.`
      };

    } catch (error) {
      logger.error('❌ Error soft deleting organization:', error);
      return {
        success: false,
        message: `Failed to delete organization: ${error.message}`
      };
    }
  }

  /**
   * Restore a soft-deleted organization (users are NOT restored - they were permanently deleted)
   * @param {string} organizationId - The ID of the organization to restore
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async restoreOrganization(organizationId) {
    try {
      logger.log('♻️ Restoring organization:', organizationId);
      
      // First, get the organization info
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, deleted_at')
        .eq('id', organizationId)
        .single();

      if (orgError || !orgData) {
        return { success: false, message: 'Organization not found' };
      }

      if (!orgData.deleted_at) {
        return { success: false, message: 'Organization is not deleted' };
      }

      logger.log('📋 Restoring organization:', orgData.name);

      // Update organization to mark as active
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null
        })
        .eq('id', organizationId);

      if (updateError) {
        throw updateError;
      }

      logger.log('✅ Organization restored successfully');

      return {
        success: true,
        message: `Organization "${orgData.name}" has been restored successfully. User accounts were permanently deleted and cannot be restored. Users will need to create new accounts with different email addresses to join the organization.`
      };

    } catch (error) {
      logger.error('❌ Error restoring organization:', error);
      return {
        success: false,
        message: `Failed to restore organization: ${error.message}`
      };
    }
  }

  /**
   * Permanently delete an organization and all its related data (USE WITH CAUTION!)
   * @param {string} organizationId - The ID of the organization to delete
   * @returns {Promise<{success: boolean, message: string, deletedCounts?: object}>}
   */
  static async permanentlyDeleteOrganization(organizationId) {
    try {
      logger.log('🗑️ Starting safe organization deletion for:', organizationId);
      
      // First, get the organization info
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', organizationId)
        .single();

      if (orgError || !orgData) {
        return { success: false, message: 'Organization not found' };
      }

      logger.log('📋 Deleting organization:', orgData.name);

      const deletedCounts = {};

      // Delete in the correct order to avoid foreign key violations
      
      // 1. Delete bottle scans
      const { count: bottleScansCount } = await supabase
        .from('bottle_scans')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts.bottle_scans = bottleScansCount || 0;
      logger.log(`✅ Deleted ${deletedCounts.bottle_scans} bottle scans`);

      // 2. Delete bottles
      const { count: bottlesCount } = await supabase
        .from('bottles')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts.bottles = bottlesCount || 0;
      logger.log(`✅ Deleted ${deletedCounts.bottles} bottles`);

      // 3. Delete customers
      const { count: customersCount } = await supabase
        .from('customers')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts.customers = customersCount || 0;
      logger.log(`✅ Deleted ${deletedCounts.customers} customers`);

      // 4. Delete rentals
      const { count: rentalsCount } = await supabase
        .from('rentals')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts.rentals = rentalsCount || 0;
      logger.log(`✅ Deleted ${deletedCounts.rentals} rentals`);

      // 5. Delete invoices
      const { count: invoicesCount } = await supabase
        .from('invoices')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts.invoices = invoicesCount || 0;
      logger.log(`✅ Deleted ${deletedCounts.invoices} invoices`);

      // 6. Delete organization invites
      const { count: invitesCount } = await supabase
        .from('organization_invites')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts.organization_invites = invitesCount || 0;
      logger.log(`✅ Deleted ${deletedCounts.organization_invites} organization invites`);

      // 7. Delete profiles (users)
      const { count: profilesCount } = await supabase
        .from('profiles')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts.profiles = profilesCount || 0;
      logger.log(`✅ Deleted ${deletedCounts.profiles} user profiles`);

      // 8. Finally, delete the organization
      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId);

      if (deleteError) {
        throw deleteError;
      }

      logger.log('🎉 Organization deletion completed successfully');

      return {
        success: true,
        message: `Organization "${orgData.name}" and all related data deleted successfully`,
        deletedCounts
      };

    } catch (error) {
      logger.error('❌ Error deleting organization:', error);
      return {
        success: false,
        message: `Failed to delete organization: ${error.message}`
      };
    }
  }

  /**
   * Get organization deletion preview (what will be deleted)
   * @param {string} organizationId - The ID of the organization
   * @returns {Promise<{success: boolean, data?: object, message?: string}>}
   */
  static async getDeletionPreview(organizationId) {
    try {
      // Get organization info
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', organizationId)
        .single();

      if (orgError || !orgData) {
        return { success: false, message: 'Organization not found' };
      }

      // Get counts of related data
      const [
        { count: bottleScansCount },
        { count: bottlesCount },
        { count: customersCount },
        { count: rentalsCount },
        { count: invoicesCount },
        { count: invitesCount },
        { count: profilesCount }
      ] = await Promise.all([
        supabase.from('bottle_scans').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('bottles').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('organization_invites').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId)
      ]);

      return {
        success: true,
        data: {
          organization: orgData,
          counts: {
            bottle_scans: bottleScansCount || 0,
            bottles: bottlesCount || 0,
            customers: customersCount || 0,
            rentals: rentalsCount || 0,
            invoices: invoicesCount || 0,
            organization_invites: invitesCount || 0,
            profiles: profilesCount || 0
          }
        }
      };

    } catch (error) {
      logger.error('Error getting deletion preview:', error);
      return {
        success: false,
        message: `Failed to get deletion preview: ${error.message}`
      };
    }
  }
}

