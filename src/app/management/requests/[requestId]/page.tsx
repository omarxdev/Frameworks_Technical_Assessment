import { RequestDetailView } from "@/features/management/components/request-detail-view";

const ManagementRequestDetailPage = async ({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) => {
  const { requestId } = await params;

  return <RequestDetailView requestId={requestId} />;
};

export default ManagementRequestDetailPage;
