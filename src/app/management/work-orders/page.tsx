import { Suspense } from "react";
import { LoadingState } from "@/components/ui/states";
import { WorkOrdersView } from "@/features/management/components/work-orders-view";

const ManagementWorkOrdersPage = () => (
  <Suspense fallback={<LoadingState label="Loading work orders" />}>
    <WorkOrdersView />
  </Suspense>
);

export default ManagementWorkOrdersPage;
