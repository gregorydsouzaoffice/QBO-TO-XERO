"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

interface ReckonLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export default function ReckonLogo({ className = "", size = "md" }: ReckonLogoProps) {
  const sizes = {
    sm: { width: 120, height: 32 },
    md: { width: 160, height: 42 },
    lg: { width: 200, height: 53 },
  }

  const { width, height } = sizes[size]
  const [imgSrc, setImgSrc] = useState("/images/mmc-convert-logo.png")

  const handleError = () => {
    setImgSrc(`/placeholder.svg?height=${height}&width=${width}&query=MMC Convert logo`)
  }

  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <Image
        src={imgSrc || "/placeholder.svg"}
        alt="MMC Convert"
        width={width}
        height={height}
        className="h-auto"
        priority
        onError={handleError}
      />
    </Link>
  )
}
