import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

const ChartContainerComponent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyleComponent id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainerComponent.displayName = "Chart";

const ChartStyleComponent = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([themeName, themeSelector]) => `
${themeSelector} {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[themeName] || itemConfig.color;
    return color ? `  --${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join("\n")}
}
`),
      }}
    />
  );
};

const ChartTooltipComponent = RechartsPrimitive.Tooltip;

const ChartTooltipContentComponent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, indicator = "dot", hideIcon = false, ...props }: any, ref) => {
  const { config } = useChart();
  const payload = props.payload as any[];
  const content = props.content as any;
  const nameKey = props.nameKey as string | undefined;

  React.useMemo(() => {
    if (!payload || payload.length === 0) {
      return [];
    }

    return payload.map((item: any) => {
      const itemPayload = item.payload || {};
      const name = nameKey && itemPayload[nameKey] ? itemPayload[nameKey] : item.name;
      const configEntry = Object.entries(config).find(([_, configItem]) => configItem.label === name);
      const indicatorColor = configEntry ? configEntry[1]?.color || item.color : item.color;

      return {
        ...item,
        name,
        value: item.value,
        color: indicatorColor,
        payload: itemPayload,
      };
    });
  }, [payload, config, nameKey]);

  const { fullWidth, padding, content: contentProp, ...rest } = content || {};

  if (hideIcon || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className={cn("grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-sidebar-border bg-background p-3 text-xs shadow-xl", className)} {...rest}>
      {payload.length > 1 && (
        <div className="flex flex-col gap-1 border-b border-sidebar-border pb-2">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center gap-2 [&>svg]:h-3.5 [&>svg]:w-3.5">
              {item.value !== undefined && (
                <>
                  <div
                    className="shrink-0 rounded-[2px] border-[--chart-color] bg-[--chart-color]"
                    style={
                      {
                        "--chart-color": item.color,
                      } as React.CSSProperties
                    }
                  >
                    {indicator === "dot" && (
                      <RechartsPrimitive.Dot
                        tabIndex={-1}
                        cx={0}
                        cy={0}
                        r={2}
                        fill={item.color}
                        stroke="#fff"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 justify-between leading-tight text-muted-foreground">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="font-mono font-medium tabular-nums">{item.value}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {payload.length === 1 && (
        <div className="flex items-center gap-2 [&>svg]:h-3.5 [&>svg]:w-3.5">
          {payload[0].value !== undefined && (
            <>
              <div
                className="shrink-0 rounded-[2px] border-[--chart-color] bg-[--chart-color]"
                style={
                  {
                    "--chart-color": payload[0].color,
                  } as React.CSSProperties
                }
              >
                {indicator === "dot" && (
                  <RechartsPrimitive.Dot
                    tabIndex={-1}
                    cx={0}
                    cy={0}
                    r={2}
                    fill={payload[0].color}
                    stroke="#fff"
                  />
                )}
                {indicator === "line" && (
                  <RechartsPrimitive.Line
                    tabIndex={-1}
                    points={[
                      { x: 0, y: 0 },
                      { x: 18, y: 0 },
                    ]}
                    stroke={payload[0].color}
                    strokeWidth={2}
                  />
                )}
                {indicator === "dashed" && (
                  <RechartsPrimitive.Line
                    tabIndex={-1}
                    points={[
                      { x: 0, y: 0 },
                      { x: 18, y: 0 },
                    ]}
                    stroke={payload[0].color}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                )}
              </div>
              <div className="flex flex-1 justify-between leading-tight">
                <span className="truncate font-medium">{payload[0].name}</span>
                <span className="font-mono font-medium tabular-nums">{payload[0].value}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});
ChartTooltipContentComponent.displayName = "ChartTooltip";

const ChartLegendComponent = RechartsPrimitive.Legend;

const ChartLegendContentComponent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, hideIcon = false, ...props }: any, ref) => {
  const { config } = useChart();
  const payload = props.payload as any[];
  const verticalAlign = props.verticalAlign as "top" | "bottom" | "middle" | undefined;
  const nameKey = props.nameKey as string | undefined;

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}
    >
      {payload.map((item: any) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div
            key={item.value}
            className={cn("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground")}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContentComponent.displayName = "ChartLegend";

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

export const ChartContainer = ChartContainerComponent;
export const ChartTooltip = ChartTooltipComponent;
export const ChartTooltipContent = ChartTooltipContentComponent;
export const ChartLegend = ChartLegendComponent;
export const ChartLegendContent = ChartLegendContentComponent;
export const ChartStyle = ChartStyleComponent;
