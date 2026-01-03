import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { MapPin, Navigation, Search, Loader2, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (lat: number, lng: number) => void;
    initialLat?: number;
    initialLng?: number;
    showRadius?: boolean;
    initialRadius?: number;
    onSaveWithRadius?: (lat: number, lng: number, radius: number) => void;
}

// Default center: Vietnam
const DEFAULT_CENTER: [number, number] = [21.0285, 105.8542];
const DEFAULT_ZOOM = 12;

// Component to handle map click events
const MapClickHandler = ({
    onLocationSelect
}: {
    onLocationSelect: (lat: number, lng: number) => void
}) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

// Component to recenter map (reduced zoom level from 15 to 13 for better view)
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng], 13);
        }
    }, [lat, lng, map]);
    return null;
};

// Draggable marker component
const DraggableMarker = ({
    position,
    onDragEnd
}: {
    position: [number, number];
    onDragEnd: (lat: number, lng: number) => void;
}) => {
    const markerRef = useRef<L.Marker>(null);

    const eventHandlers = {
        dragend() {
            const marker = markerRef.current;
            if (marker) {
                const latlng = marker.getLatLng();
                onDragEnd(latlng.lat, latlng.lng);
            }
        },
    };

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        />
    );
};

const LocationPickerDialog = ({
    open,
    onOpenChange,
    onSave,
    initialLat,
    initialLng,
    showRadius = false,
    initialRadius = 1,
    onSaveWithRadius,
}: LocationPickerDialogProps) => {
    // Position state
    const [position, setPosition] = useState<[number, number] | null>(
        initialLat && initialLng ? [initialLat, initialLng] : null
    );
    const [radius, setRadius] = useState(initialRadius);
    const [address, setAddress] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<L.Map | null>(null);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            if (initialLat && initialLng) {
                setPosition([initialLat, initialLng]);
                reverseGeocode(initialLat, initialLng);
            } else {
                setPosition(null);
                setAddress('');
            }
            setRadius(initialRadius);
            setError(null);
            setSearchQuery('');
        }
    }, [open, initialLat, initialLng, initialRadius]);

    // Reverse geocoding - get address from coordinates
    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                { headers: { 'Accept-Language': 'vi' } }
            );
            const data = await response.json();
            if (data.display_name) {
                // Get first 3 parts of address
                const shortAddress = data.display_name.split(',').slice(0, 3).join(', ');
                setAddress(shortAddress);
            }
        } catch (err) {
            console.error('Reverse geocode failed:', err);
        }
    };

    // Handle location selection from map click
    const handleLocationSelect = (lat: number, lng: number) => {
        setPosition([lat, lng]);
        reverseGeocode(lat, lng);
        setError(null);
    };

    // Get GPS location from device
    const handleGetGPS = () => {
        if (!navigator.geolocation) {
            setError('Trình duyệt không hỗ trợ GPS');
            return;
        }

        setGpsLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setPosition([lat, lng]);
                reverseGeocode(lat, lng);
                setGpsLoading(false);

                // Center map on new position (zoom 14 for better overview)
                if (mapRef.current) {
                    mapRef.current.setView([lat, lng], 14);
                }
            },
            (err) => {
                setGpsLoading(false);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError('Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép trong cài đặt trình duyệt.');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError('Không thể xác định vị trí. Hãy thử lại hoặc chọn trực tiếp trên bản đồ.');
                        break;
                    case err.TIMEOUT:
                        setError('Hết thời gian chờ GPS. Hãy thử lại.');
                        break;
                    default:
                        setError('Lỗi không xác định khi lấy vị trí.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    };

    // Search location by name using Nominatim
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=vn`,
                { headers: { 'Accept-Language': 'vi' } }
            );
            const data = await response.json();

            if (data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                setPosition([lat, lng]);
                setAddress(result.display_name.split(',').slice(0, 3).join(', '));

                // Center map (zoom 13 for better overview)
                if (mapRef.current) {
                    mapRef.current.setView([lat, lng], 13);
                }
            } else {
                setError('Không tìm thấy địa điểm. Hãy thử từ khóa khác.');
            }
        } catch (err) {
            setError('Lỗi khi tìm kiếm. Hãy thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // Handle save
    const handleSave = () => {
        if (!position) {
            setError('Vui lòng chọn vị trí trên bản đồ');
            return;
        }

        if (showRadius && onSaveWithRadius) {
            onSaveWithRadius(position[0], position[1], radius);
        } else {
            onSave(position[0], position[1]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
                <DialogHeader className="pb-2">
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <MapPin className="w-5 h-5 text-primary" />
                        Chọn vị trí trên bản đồ
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    {/* Search & GPS buttons */}
                    <div className="flex gap-2">
                        <div className="flex-1 flex gap-2 min-w-0">
                            <Input
                                placeholder="Tìm địa điểm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="flex-1 min-w-0 h-9 text-sm"
                            />
                            <Button
                                onClick={handleSearch}
                                disabled={loading || !searchQuery.trim()}
                                size="sm"
                                className="h-9 px-3 flex-shrink-0"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </Button>
                        </div>
                        <Button
                            onClick={handleGetGPS}
                            disabled={gpsLoading}
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 whitespace-nowrap flex-shrink-0"
                        >
                            {gpsLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Navigation className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Vị trí của tôi</span>
                                    <span className="sm:hidden">GPS</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="p-2 bg-destructive/10 text-destructive text-xs sm:text-sm rounded-md flex items-start gap-2">
                            <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Map */}
                    <div className="h-[250px] sm:h-[300px] rounded-lg overflow-hidden border">
                        <MapContainer
                            center={position || DEFAULT_CENTER}
                            zoom={position ? 15 : DEFAULT_ZOOM}
                            style={{ height: '100%', width: '100%' }}
                            ref={mapRef}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapClickHandler onLocationSelect={handleLocationSelect} />
                            {position && (
                                <>
                                    <DraggableMarker
                                        position={position}
                                        onDragEnd={handleLocationSelect}
                                    />
                                    {showRadius && (
                                        <Circle
                                            center={position}
                                            radius={radius * 1000}
                                            pathOptions={{
                                                color: '#f59e0b',
                                                fillColor: '#f59e0b',
                                                fillOpacity: 0.15,
                                                weight: 2,
                                            }}
                                        />
                                    )}
                                    <RecenterMap lat={position[0]} lng={position[1]} />
                                </>
                            )}
                        </MapContainer>
                    </div>

                    {/* Tip */}
                    <p className="text-xs text-muted-foreground">
                        💡 Click trên bản đồ hoặc <strong>kéo thả marker</strong> để di chuyển vị trí
                    </p>

                    {/* Selected location info */}
                    {position && (
                        <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <MapPin className="w-4 h-4" />
                                Vị trí đã chọn
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Vĩ độ (Lat)</Label>
                                    <div className="font-mono font-medium">{position[0].toFixed(8)}</div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Kinh độ (Lng)</Label>
                                    <div className="font-mono font-medium">{position[1].toFixed(8)}</div>
                                </div>
                            </div>
                            {address && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Địa chỉ</Label>
                                    <div className="text-xs sm:text-sm">{address}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Radius slider (optional) */}
                    {showRadius && position && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">Bán kính quảng cáo</Label>
                                <span className="text-sm font-medium text-primary">{radius} km</span>
                            </div>
                            <Slider
                                value={[radius]}
                                onValueChange={(v) => setRadius(v[0])}
                                min={1}
                                max={50}
                                step={1}
                                className="py-2"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-3 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={!position}>
                        <MapPin className="w-4 h-4 mr-1" />
                        Lưu tọa độ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LocationPickerDialog;
