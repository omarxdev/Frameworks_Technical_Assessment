import { ContractDetailView } from "@/features/management/components/contract-detail-view";

const ManagementContractPage = async ({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) => {
  const { contractId } = await params;

  return <ContractDetailView contractId={contractId} />;
};

export default ManagementContractPage;
