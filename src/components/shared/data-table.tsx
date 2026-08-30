import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  role?: "title" | "badge" | "action";
  align?: "right";
  nowrap?: boolean;
  className?: string;
};

const byRole = <T,>(columns: DataColumn<T>[], role: DataColumn<T>["role"]) =>
  columns.find((column) => column.role === role);

export const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  footer,
  className,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  footer?: { label: string; value: React.ReactNode };
  className?: string;
}) => {
  const title = byRole(columns, "title");
  const badge = byRole(columns, "badge");
  const action = byRole(columns, "action");
  const details = columns.filter((column) => !column.role);

  return (
    <>
      <Card className={cn("hidden overflow-x-auto md:block", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.header}
                  className={cn(column.align === "right" && "text-right")}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.header}
                    className={cn(
                      column.align === "right" && "text-right",
                      column.nowrap && "whitespace-nowrap",
                      column.className
                    )}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {footer && (
              <TableRow>
                <TableCell
                  colSpan={columns.length - 1}
                  className="text-right font-medium"
                >
                  {footer.label}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {footer.value}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <Card key={rowKey(row)}>
            <CardContent className="flex flex-col gap-3">
              {(title || badge) && (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {title && (
                    <div className="min-w-0 font-medium">{title.cell(row)}</div>
                  )}
                  {badge && <div className="shrink-0">{badge.cell(row)}</div>}
                </div>
              )}

              {details.length > 0 && (
                <dl className="flex flex-col gap-1.5 text-sm">
                  {details.map((column) => (
                    <div
                      key={column.header}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
                    >
                      <dt className="text-muted-foreground text-xs">
                        {column.header}
                      </dt>
                      <dd className="min-w-0 text-right">{column.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {action && <div>{action.cell(row)}</div>}
            </CardContent>
          </Card>
        ))}

        {footer && (
          <Card>
            <CardContent className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{footer.label}</span>
              <span className="font-semibold tabular-nums">{footer.value}</span>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};
