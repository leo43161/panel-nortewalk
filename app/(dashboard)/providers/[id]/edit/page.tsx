import { ProviderEdit } from "@/components/providers/provider-edit"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProviderEdit id={Number(id)} />
}
