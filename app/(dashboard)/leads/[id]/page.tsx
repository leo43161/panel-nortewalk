import { LeadDetail } from "@/components/leads/lead-detail"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <LeadDetail id={Number(id)} />
}
