import { JobDetail } from "@/features/fitter/components/job-detail";

const FitterJobPage = async ({
  params,
}: {
  params: Promise<{ workOrderId: string }>;
}) => {
  const { workOrderId } = await params;

  return <JobDetail workOrderId={workOrderId} />;
};

export default FitterJobPage;
