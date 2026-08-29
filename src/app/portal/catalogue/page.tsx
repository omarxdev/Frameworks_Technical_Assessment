import { CatalogueView } from "@/features/portal/components/catalogue-view";
import { filtersFromSearchParams } from "@/features/portal/lib/catalogue-options";

const CataloguePage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const params = await searchParams;

  return <CatalogueView initialFilters={filtersFromSearchParams(params)} />;
};

export default CataloguePage;
