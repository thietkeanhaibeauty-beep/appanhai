import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

type HealthStatus = 'healthy' | 'warning' | 'critical';

interface SystemService {
  name: string;
  status: HealthStatus;
  uptime?: string;
  lastCheck?: string;
}

interface SystemHealthIndicatorProps {
  services: SystemService[];
}

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Tốt',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Cảnh báo',
  },
  critical: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Nghiêm trọng',
  },
};

export const SystemHealthIndicator: React.FC<SystemHealthIndicatorProps> = ({
  services,
}) => {
  const overallStatus: HealthStatus = services.some((s) => s.status === 'critical')
    ? 'critical'
    : services.some((s) => s.status === 'warning')
    ? 'warning'
    : 'healthy';

  const StatusIcon = statusConfig[overallStatus].icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 ${statusConfig[overallStatus].color}`} />
          Tình trạng hệ thống
          <Badge
            variant="outline"
            className={`ml-auto ${statusConfig[overallStatus].bgColor} ${statusConfig[overallStatus].color}`}
          >
            {statusConfig[overallStatus].label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.map((service) => {
            const ServiceIcon = statusConfig[service.status].icon;
            return (
              <div
                key={service.name}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <ServiceIcon
                    className={`h-4 w-4 ${statusConfig[service.status].color}`}
                  />
                  <div>
                    <p className="font-medium">{service.name}</p>
                    {service.uptime && (
                      <p className="text-xs text-muted-foreground">
                        Hoạt động: {service.uptime}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={statusConfig[service.status].bgColor}>
                  {statusConfig[service.status].label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
