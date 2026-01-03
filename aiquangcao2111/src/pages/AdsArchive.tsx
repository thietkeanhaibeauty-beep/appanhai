import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Search, Archive, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from "@/services/nocodb/config";

const TABLE_INSIGHTS_ARCHIVE = NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_ARCHIVE;

interface AdRecord {
    Id: number;
    campaign_name: string;
    adset_name: string;
    ad_name: string;
    status: string;
    effective_status: string;
    spend: number;
    impressions: number;
    clicks: number;
    results: number;
    cost_per_result: number;
    date_start: string;
    date_stop: string;
    account_name: string;
    level: string;
}

export default function AdsArchive() {
    const [data, setData] = useState<AdRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [levelFilter, setLevelFilter] = useState("all");
    const { toast } = useToast();
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all records from Archive table via secure proxy
            const url = `${getNocoDBUrl(TABLE_INSIGHTS_ARCHIVE)}?limit=1000&sort=-date_start`;

            const res = await fetch(url, {
                headers: await getNocoDBHeaders(),
            });

            if (!res.ok) throw new Error("Failed to fetch archive data");

            const json = await res.json();
            setData(json.list || []);

            toast({
                title: "Đã tải dữ liệu lưu trữ",
                description: `Tìm thấy ${json.list?.length || 0} bản ghi.`,
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Lỗi",
                description: "Không thể tải dữ liệu lưu trữ.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const matchesSearch =
                (item.campaign_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (item.adset_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (item.ad_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());

            const matchesLevel = levelFilter === "all" || item.level === levelFilter;

            return matchesSearch && matchesLevel;
        });
    }, [data, searchTerm, levelFilter]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat("vi-VN").format(value);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                            <Archive className="h-8 w-8 text-orange-500" />
                            Kho Lưu Trữ Quảng Cáo
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Xem lại các chiến dịch, nhóm quảng cáo và quảng cáo đã bị xóa hoặc lưu trữ.
                        </p>
                    </div>
                </div>
                <Button onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Tải lại
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex gap-4 flex-1">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm kiếm theo tên..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Select value={levelFilter} onValueChange={setLevelFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Cấp độ" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả cấp độ</SelectItem>
                                    <SelectItem value="campaign">Chiến dịch</SelectItem>
                                    <SelectItem value="adset">Nhóm quảng cáo</SelectItem>
                                    <SelectItem value="ad">Quảng cáo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ngày</TableHead>
                                    <TableHead>Tên đối tượng</TableHead>
                                    <TableHead>Cấp độ</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Chi tiêu</TableHead>
                                    <TableHead className="text-right">Kết quả</TableHead>
                                    <TableHead className="text-right">Chi phí/KQ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            Không có dữ liệu lưu trữ nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((record) => (
                                        <TableRow key={record.Id}>
                                            <TableCell>{record.date_start}</TableCell>
                                            <TableCell className="font-medium">
                                                {record.level === 'campaign' ? record.campaign_name :
                                                    record.level === 'adset' ? record.adset_name :
                                                        record.ad_name}
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {record.account_name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {record.level === 'adset' ? 'Nhóm QC' :
                                                        record.level === 'campaign' ? 'Chiến dịch' : 'Quảng cáo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={record.status === 'DELETED' ? 'destructive' : 'secondary'}>
                                                    {record.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(record.spend)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatNumber(record.results)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(record.cost_per_result)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
