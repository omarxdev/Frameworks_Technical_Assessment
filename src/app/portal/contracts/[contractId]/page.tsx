import { ContractDetailView } from "@/features/portal/components/contract-detail-view";

const ContractDetailPage = async ({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) => {
  const { contractId } = await params;

  return <ContractDetailView contractId={contractId} />;
};

export default ContractDetailPage;
