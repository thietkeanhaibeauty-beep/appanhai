export const formatCampaignAnalysis = (parsed: any): string => {
  let output = '\n✅ Phân tích thông tin:\n';
  output += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
  
  // Campaign Name
  if (parsed.campaignName) {
    output += `📝 Tên chiến dịch: ${parsed.campaignName}\n`;
  }
  
  // Age
  if (parsed.ageMin || parsed.ageMax) {
    output += `👤 Độ tuổi: ${parsed.ageMin || '?'}-${parsed.ageMax || '?'} tuổi\n`;
  }
  
  // Budget
  if (parsed.budget) {
    output += `💰 Ngân sách: ${parsed.budget.toLocaleString('vi-VN')} VNĐ/ngày\n`;
  }
  
  // Gender
  if (parsed.gender !== undefined && parsed.gender !== null) {
    const genderMap: Record<number, string> = {
      0: 'Tất cả',
      1: 'Nam',
      2: 'Nữ'
    };
    output += `👥 Giới tính: ${genderMap[parsed.gender]}\n`;
  }
  
  // Location - DETAILED BREAKDOWN
  if (parsed.locations && parsed.locations.length > 0) {
    output += '\n📍 VỊ TRÍ: ';
    
    const loc = parsed.locations[0];
    
    // Case 1: AI đã trả về LocationTarget object
    if (typeof loc === 'object' && 'type' in loc) {
      if (loc.type === 'coordinates') {
        output += 'Tọa độ\n';
        output += `  ├─ Latitude: ${loc.latitude}\n`;
        output += `  ├─ Longitude: ${loc.longitude}\n`;
        output += `  └─ Bán kính: ${loc.radius || parsed.locationRadius || '?'} km\n`;
      } else if (loc.type === 'country') {
        output += `Quốc gia\n`;
        output += `  └─ ${loc.country_code === 'VN' ? 'Việt Nam' : loc.country_code}\n`;
      } else if (loc.type === 'city') {
        output += `Thành phố\n`;
        output += `  ├─ Tên: ${loc.name}\n`;
        output += `  └─ Bán kính: ${loc.radius || parsed.locationRadius || '?'} km\n`;
      }
    } 
    // Case 2: AI vẫn trả về string (legacy)
    else if (typeof loc === 'string') {
      const locStr = loc.trim();
      
      // Sub-case 2a: Detect tọa độ (lat,lng)
      const coordMatch = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/.exec(locStr);
      if (coordMatch) {
        const latitude = coordMatch[1];
        const longitude = coordMatch[2];
        output += `Tọa độ\n`;
        output += `  ├─ Latitude: ${latitude}\n`;
        output += `  ├─ Longitude: ${longitude}\n`;
        output += `  └─ Bán kính: ${parsed.locationRadius || '?'} km\n`;
      } 
      // Sub-case 2b: Detect quốc gia
      else if (/^(việt nam|vietnam|vn)$/i.test(locStr)) {
        output += `Quốc gia\n`;
        output += `  └─ Việt Nam\n`;
      } 
      // Sub-case 2c: Thành phố (fallback)
      else {
        output += `Thành phố\n`;
        output += `  ├─ Tên: ${locStr}\n`;
        if (parsed.locationRadius) {
          output += `  └─ Bán kính: ${parsed.locationRadius} km\n`;
        }
      }
    }
  }
  
  // Interests
  if (parsed.interestKeywords && parsed.interestKeywords.length > 0) {
    output += `\n🎯 Sở thích: ${parsed.interestKeywords.join(', ')}\n`;
  }
  
  output += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
  return output;
};
