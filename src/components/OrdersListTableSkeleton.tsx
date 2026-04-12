import { ORDERS_LIST_COLUMN_LABELS } from '@/constants/ordersListTable'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const ROWS = 8

export function OrdersListTableSkeleton() {
  return (
    <Table className="orders-table">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {ORDERS_LIST_COLUMN_LABELS.map((label) => (
            <TableHead key={label}>{label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: ROWS }).map((_, i) => (
          <TableRow key={i} className="hover:bg-transparent">
            {Array.from({ length: ORDERS_LIST_COLUMN_LABELS.length }, (_, j) => (
              <TableCell key={j}>
                <Skeleton className="h-4 w-full max-w-32" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
