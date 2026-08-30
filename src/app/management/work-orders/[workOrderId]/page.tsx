import { WorkOrderDetailView } from "@/features/management/components/work-order-detail-view";

const ManagementWorkOrderPage = async ({
  params,
}: {
  params: Promise<{ workOrderId: string }>;
}) => {
  const { workOrderId } = await params;

  return <WorkOrderDetailView workOrderId={workOrderId} />;
};

export default ManagementWorkOrderPage;
