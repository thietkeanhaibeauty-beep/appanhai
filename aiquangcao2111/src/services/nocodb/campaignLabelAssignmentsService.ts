import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface CampaignLabelAssignment {
  Id?: number;
  campaign_id?: string;  // Nullable - for campaign level
  adset_id?: string;     // For adset level
  ad_id?: string;        // For ad level
  label_id: number;
  CreatedAt?: string;
  UpdatedAt?: string;
}

/**
 * Get all label assignments for specific entities (campaigns, adsets, or ads)
 */
export async function getLabelAssignmentsByEntities(
  entityIds: string[],
  entityType: 'campaign' | 'adset' | 'ad'
): Promise<CampaignLabelAssignment[]> {
  if (entityIds.length === 0) return [];

  try {
    const fieldName = entityType === 'campaign' ? 'campaign_id'
      : entityType === 'adset' ? 'adset_id'
        : 'ad_id';

    // ✅ FIX: Batch IDs to prevent 414 URI Too Long error (max 50 IDs per request)
    const batchSize = 50;
    const allAssignments: CampaignLabelAssignment[] = [];

    for (let i = 0; i < entityIds.length; i += batchSize) {
      const batchIds = entityIds.slice(i, i + batchSize);
      const whereClause = `(${fieldName},in,${batchIds.join(',')})`;
      const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS)}?where=${encodeURIComponent(whereClause)}&limit=500`;

      const response = await fetch(url, {
        method: 'GET',
        headers: await getNocoDBHeaders(),
      });

      if (!response.ok) {
        console.error(`Failed to fetch label assignments batch: ${response.statusText}`);
        continue; // Skip failed batch, continue with others
      }

      const data = await response.json();
      const assignments = data.list || [];
      allAssignments.push(...assignments);
    }

    return allAssignments;
  } catch (error) {
    console.error('Error fetching label assignments:', error);
    return [];
  }
}


/**
 * @deprecated Use getLabelAssignmentsByEntities instead
 */
export async function getLabelAssignmentsByCampaigns(campaignIds: string[]): Promise<CampaignLabelAssignment[]> {
  return getLabelAssignmentsByEntities(campaignIds, 'campaign');
}

/**
 * Assign a label to any entity (campaign, adset, or ad)
 */
export async function assignLabel(
  entityId: string,
  entityType: 'campaign' | 'adset' | 'ad',
  labelId: number,
  userId?: string
): Promise<CampaignLabelAssignment> {
  // ✅ CRITICAL: Always require user_id - no fallback to test-user-001
  if (!userId) {
    throw new Error('userId is required for assignLabel. User must be authenticated.');
  }

  const body: any = {
    label_id: String(labelId), // ✅ Convert to string to match NocoDB schema
    user_id: userId // ✅ Always set user_id from authenticated user
  };

  if (entityType === 'campaign') body.campaign_id = entityId;
  else if (entityType === 'adset') body.adset_id = entityId;
  else body.ad_id = entityId;



  const response = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS), {
    method: 'POST',
    headers: await getNocoDBHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to assign label (${response.status})`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error === 'TABLE_NOT_FOUND') {
        errorMessage = 'Bảng campaign_label_assignments chưa được tạo. Vui lòng truy cập /create-label-assignments-table để tạo bảng.';
      } else {
        errorMessage += `: ${errorJson.message || errorText}`;
      }
    } catch {
      errorMessage += `: ${errorText || response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * @deprecated Use assignLabel instead
 */
export async function assignLabelToCampaign(
  campaignId: string,
  labelId: number
): Promise<CampaignLabelAssignment> {
  return assignLabel(campaignId, 'campaign', labelId);
}

/**
 * Assign multiple labels to multiple entities
 */
export async function bulkAssignLabels(
  entities: Array<{ id: string; type: 'campaign' | 'adset' | 'ad' }>,
  labelIds: number[],
  userId?: string
): Promise<void> {


  // Assign each label to each entity sequentially
  // Using individual API calls instead of bulk endpoint
  for (const entity of entities) {
    for (const labelId of labelIds) {
      try {
        await assignLabel(entity.id, entity.type, labelId, userId); // ✅ Pass userId

      } catch (error) {
        console.error(`❌ Failed to assign label ${labelId} to ${entity.type} ${entity.id}:`, error);
        throw error; // Stop on first error
      }
    }
  }


}

/**
 * Remove a label from any entity
 */
export async function removeLabel(
  entityId: string,
  entityType: 'campaign' | 'adset' | 'ad',
  labelId: number
): Promise<void> {


  // Find ALL assignment records
  const assignments = await getLabelAssignmentsByEntities([entityId], entityType);


  const matchingAssignments = assignments.filter((a) => String(a.label_id) === String(labelId));


  if (matchingAssignments.length === 0) {
    console.warn(`⚠️ [removeLabel] No assignments found for ${entityType} ${entityId} with label ${labelId}`);
    throw new Error('Assignment not found');
  }

  const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS);

  // Delete with detailed logging
  const results = await Promise.all(
    matchingAssignments.map(async (assignment) => {
      if (!assignment.Id) {
        console.error(`❌ [removeLabel] Assignment has no Id:`, assignment);
        return { success: false, error: 'Missing Id' };
      }



      // Construct Proxy Command
      const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS);
      const proxyBaseUrl = fullUrl.split('/api/v2')[0];
      const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS}/records`;

      const response = await fetch(proxyBaseUrl, {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
          path: path,
          method: 'DELETE',
          data: [{ Id: assignment.Id }] // ✅ NocoDB expects Array for DELETE
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error(`❌ [removeLabel] Failed to delete ${assignment.Id}:`, {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });
        throw new Error(`Failed to remove label: ${response.statusText} - ${responseText}`);
      }



      return { success: true, Id: assignment.Id };
    })
  );

  const successCount = results.filter(r => r.success).length;

}

/**
 * @deprecated Use removeLabel instead
 */
export async function removeLabelFromCampaign(
  campaignId: string,
  labelId: number
): Promise<void> {
  return removeLabel(campaignId, 'campaign', labelId);
}

/**
 * Delete all assignments for a specific label ID (used when deleting a label)
 */
export async function deleteLabelAssignmentsByLabelId(labelId: number): Promise<void> {
  try {
    const whereClause = `(label_id,eq,${labelId})`;
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS)}?where=${encodeURIComponent(whereClause)}`;



    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch assignments: ${response.statusText}`);
    }

    const data = await response.json();
    const assignments = data.list || [];



    if (assignments.length === 0) return;

    // Delete all assignments
    // Construct Proxy Command
    const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS);
    const proxyBaseUrl = fullUrl.split('/api/v2')[0];
    const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS}/records`;

    const deleteResponse = await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'DELETE',
        data: assignments.map(a => ({ Id: a.Id }))
      }),
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(`Failed to delete assignments: ${deleteResponse.statusText} - ${errorText}`);
    }


  } catch (error) {
    console.error(`Error deleting assignments for label ${labelId}:`, error);
    throw error;
  }
}
/**
 * Get assignment counts for multiple labels
 */
export async function getAssignmentCountsByLabelIds(labelIds: number[]): Promise<Record<number, number>> {
  if (labelIds.length === 0) return {};

  try {
    const whereClause = `(label_id,in,${labelIds.join(',')})`;
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS)}?where=${encodeURIComponent(whereClause)}&limit=1000`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch assignment counts: ${response.statusText}`);
    }

    const data = await response.json();
    const assignments = data.list || [];

    // Group by label_id
    const counts: Record<number, number> = {};
    assignments.forEach((a: any) => {
      const labelId = Number(a.label_id);
      counts[labelId] = (counts[labelId] || 0) + 1;
    });

    return counts;
  } catch (error) {
    console.error('Error fetching assignment counts:', error);
    return {};
  }
}
