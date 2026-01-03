import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface MetricsChartProps {
  metrics: Record<string, { label: string; value: number; color?: string }>;
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'donut' | 'stacked' | 'radar';
  title: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(221, 83%, 53%)', // blue
  'hsl(142, 76%, 36%)', // green  
  'hsl(262, 83%, 58%)', // purple
  'hsl(239, 84%, 67%)', // indigo
  'hsl(160, 84%, 39%)', // emerald
  'hsl(43, 96%, 56%)', // amber
];

export const MetricsChart = ({ metrics, chartType, title }: MetricsChartProps) => {
  const chartData = useMemo(() => {
    return Object.entries(metrics)
      .filter(([_, data]) => data.value > 0) // Filter out zero values
      .map(([key, data], index) => ({
        name: data.label,
        value: Math.round(data.value),
        key,
        fill: data.color || COLORS[index % COLORS.length],
      }));
  }, [metrics]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    Object.entries(metrics)
      .filter(([_, data]) => data.value > 0) // Filter out zero values
      .forEach(([key, data], index) => {
        config[key] = {
          label: data.label,
          color: data.color || COLORS[index % COLORS.length],
        };
      });
    return config;
  }, [metrics]);
  
  // Return null if no data
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground text-sm">
            Không có dữ liệu để hiển thị
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        );
      
      case 'bar':
        return (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        );
      
      case 'area':
        return (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        );
      
      case 'pie':
        return (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={(entry) => {
                  const percent = (entry.value / chartData.reduce((sum, item) => sum + item.value, 0) * 100).toFixed(1);
                  return `${entry.name}: ${percent}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ChartContainer>
        );
      
      case 'donut':
        return (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={(entry) => {
                  const percent = (entry.value / chartData.reduce((sum, item) => sum + item.value, 0) * 100).toFixed(1);
                  return `${entry.name}: ${percent}%`;
                }}
                outerRadius={80}
                innerRadius={50}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ChartContainer>
        );
      
      case 'stacked':
        return (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="value" stackId="a" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        );
      
      case 'radar':
        return (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Radar 
                name="Metrics" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.3)" 
                fillOpacity={0.6}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </RadarChart>
          </ChartContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};
