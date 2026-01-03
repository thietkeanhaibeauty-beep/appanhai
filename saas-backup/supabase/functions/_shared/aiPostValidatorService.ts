export interface ValidatePostResult {
  success: boolean;
  pageId?: string;
  postId?: string;
  fullPostId?: string;
  error?: string;
}

export const aiPostValidatorService = {
  /**
   * Validate and extract post ID from URL or ID
   */
  async validatePostId(input: string, accessToken: string): Promise<ValidatePostResult> {
    try {
      // Try to extract post ID from various formats
      let postId = input.trim();
      
      // Format 1: Full URL (e.g., https://www.facebook.com/pageId/posts/postId)
      const urlMatch = postId.match(/facebook\.com\/([^\/]+)\/posts\/([^\/\?]+)/);
      if (urlMatch) {
        const [, pageIdOrUsername, extractedPostId] = urlMatch;
        postId = extractedPostId;
      }
      
      // Format 2: Direct post ID format (pageId_postId)
      const directMatch = postId.match(/^(\d+)_(\d+)$/);
      if (directMatch) {
        const [, pageId, extractedPostId] = directMatch;
        return {
          success: true,
          pageId,
          postId: extractedPostId,
          fullPostId: postId,
        };
      }
      
      // Format 3: Just the numeric post ID
      if (/^\d+$/.test(postId)) {
        // Need to fetch the post to get the page ID
        try {
          const response = await fetch(
            `https://graph.facebook.com/v21.0/${postId}?fields=from&access_token=${accessToken}`
          );
          const data = await response.json();
          
          if (data.error) {
            return {
              success: false,
              error: data.error.message || 'Invalid post ID',
            };
          }
          
          const pageId = data.from?.id;
          if (!pageId) {
            return {
              success: false,
              error: 'Could not determine page ID from post',
            };
          }
          
          return {
            success: true,
            pageId,
            postId,
            fullPostId: `${pageId}_${postId}`,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Failed to validate post',
          };
        }
      }
      
      return {
        success: false,
        error: 'Invalid post URL or ID format',
      };
    } catch (error: any) {
      console.error('Validate post ID error:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate post',
      };
    }
  },
};
