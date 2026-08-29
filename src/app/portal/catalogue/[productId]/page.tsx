import { ProductDetailView } from "@/features/portal/components/product-detail-view";
import {
  DEFAULT_END_DATE,
  DEFAULT_START_DATE,
  readParam,
} from "@/features/portal/lib/catalogue-options";

const ProductDetailPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const [{ productId }, query] = await Promise.all([params, searchParams]);

  return (
    <ProductDetailView
      productId={productId}
      initialStartDate={readParam(query, "startDate") || DEFAULT_START_DATE}
      initialEndDate={readParam(query, "endDate") || DEFAULT_END_DATE}
    />
  );
};

export default ProductDetailPage;
