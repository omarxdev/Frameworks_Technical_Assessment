import { ClientDetailView } from "@/features/management/components/client-detail-view";

const ManagementClientPage = async ({
  params,
}: {
  params: Promise<{ organisationId: string }>;
}) => {
  const { organisationId } = await params;

  return <ClientDetailView organisationId={organisationId} />;
};

export default ManagementClientPage;
