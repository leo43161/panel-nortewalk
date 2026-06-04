import { ExperienceEditor } from "@/components/experiences/experience-editor"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <ExperienceEditor
      id={Number(id)}
      backHref="/provider/experiencias"
      showFeaturedToggle={false}
    />
  )
}
