import { ProviderDetail } from "@/components/providers/provider-detail"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProviderDetail id={Number(id)} />
}
