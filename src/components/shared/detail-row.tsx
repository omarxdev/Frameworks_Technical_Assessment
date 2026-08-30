import { Eyebrow } from "@/components/ui/typography";

export const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="border-border flex flex-col gap-0.5 border-b py-2.5 last:border-b-0">
    <Eyebrow as="dt" className="whitespace-normal">
      {label}
    </Eyebrow>
    <dd className="text-sm font-medium break-words">{value}</dd>
  </div>
);
