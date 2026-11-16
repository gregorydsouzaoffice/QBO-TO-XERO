"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function Redirect() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return") ?? "/migration/connect"

  useEffect(() => {
    router.replace(ret)
  }, [router, ret])

  return null
}

export default function Page() {
  return (
    <Suspense>
      <Redirect />
    </Suspense>
  )
}
