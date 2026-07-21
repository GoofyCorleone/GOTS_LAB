"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

interface AuthorsListProps {
  authors: string
  maxVisible?: number
  className?: string
}

export function AuthorsList({ authors, maxVisible = 2, className = "" }: AuthorsListProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Dividir autores por comas y limpiar espacios
  const authorArray = authors.split(',').map(author => author.trim())
  
  // Si hay 2 o menos autores, mostrar todos
  if (authorArray.length <= maxVisible) {
    return (
      <p className={`text-sm font-medium text-muted-foreground ${className}`}>
        {authors}
      </p>
    )
  }
  
  // Mostrar solo los primeros autores o todos según el estado
  const displayedAuthors = isExpanded 
    ? authorArray 
    : authorArray.slice(0, maxVisible)
  
  const remainingCount = authorArray.length - maxVisible

  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground">
        {displayedAuthors.join(', ')}
        {!isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 ml-2 text-xs text-primary hover:text-primary/80"
            onClick={() => setIsExpanded(true)}
          >
            y {remainingCount} más
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        )}
        {isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 ml-2 text-xs text-primary hover:text-primary/80"
            onClick={() => setIsExpanded(false)}
          >
            ver menos
            <ChevronUp className="h-3 w-3 ml-1" />
          </Button>
        )}
      </p>
    </div>
  )
}