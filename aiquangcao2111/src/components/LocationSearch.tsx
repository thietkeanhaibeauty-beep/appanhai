import { useState, useEffect, useRef } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { X, MapPin } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";

export interface LocationTarget {
  key: string;
  name: string;
  type: 'country' | 'region' | 'city' | 'zip' | 'geo_market' | 'electoral_district' | 'coordinates';
  country_code?: string;
  region_id?: string;
  radius?: number;
  latitude?: number;
  longitude?: number;
  distance_unit?: 'mile' | 'kilometer';
  supports_radius?: boolean;
}

interface LocationSearchProps {
  accessToken: string;
  adAccountId: string;
  selectedLocations: LocationTarget[];
  onLocationChange: (locations: LocationTarget[]) => void;
}

const LocationSearch = ({ accessToken, adAccountId, selectedLocations, onLocationChange }: LocationSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Coordinates input - single field
  const [coordinates, setCoordinates] = useState("");
  const [radius, setRadius] = useState("1");

  // Search locations from Facebook API (through proxy)
  const searchLocations = async (query: string) => {
    if (!query.trim() || query.length < 2) return;

    setLoading(true);
    try {
      const { fbProxy } = await import('@/services/facebookProxyService');

      // Call 2 APIs parallel: one for countries only, one for regions/cities
      const [countryData, allData] = await Promise.all([
        fbProxy.request<{ data: any[] }>({
          accessToken,
          endpoint: 'search',
          params: {
            type: 'adgeolocation',
            q: query,
            location_types: '["country"]'
          }
        }),
        fbProxy.request<{ data: any[] }>({
          accessToken,
          endpoint: 'search',
          params: {
            type: 'adgeolocation',
            q: query,
            location_types: '["region","city"]'
          }
        })
      ]);

      const countries = countryData.data || [];
      const otherResults = allData.data || [];

      // Normalize query để match "vietnam", "viet nam", "việt nam", "VN"
      const normalizedQuery = query.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .trim();

      // Hàm check exact/fuzzy match với quốc gia
      const isCountryMatch = (location: any) => {
        const name = location.name.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const code = location.country_code?.toLowerCase() || '';

        // Exact match với tên hoặc code
        if (name === normalizedQuery || code === normalizedQuery) return true;
        // Fuzzy match: query nằm trong tên quốc gia
        if (name.includes(normalizedQuery)) return true;

        return false;
      };

      // Sort countries: exact matches first
      const sortedCountries = countries.sort((a: any, b: any) => {
        const aMatch = isCountryMatch(a);
        const bMatch = isCountryMatch(b);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });

      // Sort other results by type
      const typeOrder = { region: 0, city: 1 };
      const sortedOthers = otherResults.sort((a: any, b: any) => {
        return (typeOrder[a.type as keyof typeof typeOrder] || 999) -
          (typeOrder[b.type as keyof typeof typeOrder] || 999);
      });

      // Limit results: 10 countries, 5 regions, 10 cities
      const limitedCountries = sortedCountries.slice(0, 10);
      const regions = sortedOthers.filter(l => l.type === 'region').slice(0, 5);
      const cities = sortedOthers.filter(l => l.type === 'city').slice(0, 10);

      setSearchResults([...limitedCountries, ...regions, ...cities]);
    } catch (error) {
      console.error("Failed to search locations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search - wait for user to stop typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && searchQuery.trim().length >= 2) {
        searchLocations(searchQuery.trim());
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 1000); // 1 second delay after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [editingRadius, setEditingRadius] = useState<string | null>(null);
  const [tempRadius, setTempRadius] = useState<string>("17");

  const addLocation = (location: any) => {
    // Check if city with radius support - open radius editor
    if (location.type === 'city' && location.supports_radius) {
      // Add with default 17km radius
      const newLocation: LocationTarget = {
        key: location.key,
        name: location.name,
        type: location.type,
        country_code: location.country_code,
        region_id: location.region_id,
        radius: 17,
        distance_unit: 'kilometer',
        supports_radius: true,
      };
      onLocationChange([...selectedLocations, newLocation]);
      setEditingRadius(location.key);
      setTempRadius("17");
    } else {
      // Country or region - no radius
      const newLocation: LocationTarget = {
        key: location.key,
        name: location.name,
        type: location.type,
        country_code: location.country_code,
        region_id: location.region_id,
      };
      onLocationChange([...selectedLocations, newLocation]);
    }

    setShowResults(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const addCoordinates = () => {
    // Parse coordinates from format "lat, lng" or "lat,lng"
    const parts = coordinates.split(',').map(p => p.trim());

    if (parts.length !== 2) {
      alert("Vui lòng nhập tọa độ theo định dạng: vĩ độ, kinh độ (VD: 21.0285, 105.8542)");
      return;
    }

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    const rad = parseFloat(radius);

    if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
      alert("Vui lòng nhập tọa độ và bán kính hợp lệ");
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert("Tọa độ không hợp lệ. Vĩ độ: -90 đến 90, Kinh độ: -180 đến 180");
      return;
    }

    if (rad < 1) {
      alert("Bán kính tối thiểu là 1 km");
      return;
    }

    // Use unique key with timestamp to avoid duplicates
    const coordLocation: LocationTarget = {
      key: `coord_${lat}_${lng}_${rad}_${Date.now()}`,
      name: `Tọa độ (${lat}, ${lng}) - ${rad}km`,
      type: 'coordinates',
      latitude: lat,
      longitude: lng,
      radius: rad,
      distance_unit: 'kilometer',
    };

    onLocationChange([...selectedLocations, coordLocation]);
    setCoordinates("");
    setRadius("1");
  };

  const updateRadius = (key: string, newRadius: number) => {
    onLocationChange(
      selectedLocations.map(loc =>
        loc.key === key ? { ...loc, radius: newRadius } : loc
      )
    );
  };

  const removeLocation = (key: string) => {
    onLocationChange(selectedLocations.filter(loc => loc.key !== key));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Quốc gia, Thành phố</Label>

        <div ref={searchRef} className="relative">
          <Command className="border rounded-md" shouldFilter={false}>
            <CommandInput
              placeholder="Tìm kiếm vị trí..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              onFocus={() => searchQuery.trim().length >= 2 && searchResults.length > 0 && setShowResults(true)}
            />
            {showResults && (
              <CommandList className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-md bg-popover shadow-md">
                {loading ? (
                  <div className="p-4 text-sm text-muted-foreground">Đang tìm kiếm...</div>
                ) : searchResults.length === 0 ? (
                  <CommandEmpty>
                    {searchQuery.length >= 2 ? "Không tìm thấy kết quả" : "Nhập ít nhất 2 ký tự"}
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {searchResults.map((location) => (
                      <CommandItem
                        key={location.key}
                        onSelect={() => addLocation(location)}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium">{location.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {location.type === 'country' && 'Quốc gia/Vùng vực'}
                            {location.type === 'region' && 'Bang'}
                            {location.type === 'city' && (
                              location.supports_radius
                                ? 'Thành phố (bán kính min 17km)'
                                : 'Thành phố'
                            )}
                            {' • '}{location.country_name}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            )}
          </Command>
        </div>

        {selectedLocations.length > 0 && (
          <div className="space-y-2 mt-2">
            <div className="text-xs text-muted-foreground mb-1">Đã chọn:</div>
            {selectedLocations.map((location) => (
              <div key={location.key} className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                <div className="flex-1">
                  <div className="font-medium text-sm">{location.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {location.type === 'country' && '🌍 Quốc gia'}
                    {location.type === 'region' && '🏛️ Bang/Tỉnh'}
                    {location.type === 'city' && '🏙️ Thành phố'}
                    {location.type === 'coordinates' && '📍 Tọa độ'}
                  </div>
                </div>

                {/* Hiển thị cột radius ngay khi thành phố hỗ trợ */}
                {location.supports_radius && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editingRadius === location.key ? tempRadius : location.radius?.toString() || "17"}
                      onChange={(e) => {
                        setEditingRadius(location.key);
                        setTempRadius(e.target.value);
                      }}
                      onBlur={() => {
                        const rad = parseFloat(tempRadius);
                        if (rad >= 17) {
                          updateRadius(location.key, rad);
                        } else {
                          alert("Bán kính tối thiểu là 17km");
                          setTempRadius(location.radius?.toString() || "17");
                        }
                        setEditingRadius(null);
                      }}
                      min="17"
                      className="w-20 text-sm"
                      placeholder="17"
                    />
                    <span className="text-xs text-muted-foreground">km</span>
                  </div>
                )}

                {location.radius && !location.supports_radius && (
                  <Badge variant="outline" className="text-xs">
                    {location.radius}km
                  </Badge>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLocation(location.key)}
                  title="Xóa"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 p-4 border rounded-lg">
        <Label>Hoặc nhập tọa độ (Vĩ độ, Kinh độ)</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="VD: 21.0285, 105.8542"
            value={coordinates}
            onChange={(e) => setCoordinates(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Bán kính (km)"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            min="1"
            className="w-24"
          />
          <Button onClick={addCoordinates} variant="secondary" size="sm">
            <MapPin className="mr-2 h-4 w-4" />
            Thêm
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LocationSearch;
