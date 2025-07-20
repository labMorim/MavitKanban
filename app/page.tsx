"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import {
  Plus,
  GripVertical,
  Trash2,
  Edit,
  Settings,
  LayoutGrid,
  CheckCircle2,
  Circle,
  Clock,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Upload,
  Download,
  ImagePlus,
  X,
} from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

// Types
type Priority = "High" | "Medium" | "Low"
type CardData = {
  id: string
  title: string
  description?: string
  isCompleted: boolean
  priority: Priority | null
  deadline: string | null
}

type ColumnData = {
  id: string
  title: string
  color: string
  limit?: number
  cards: CardData[]
}

type BoardData = {
  id: string
  name: string
  columns: ColumnData[]
}

const columnColors = [
  { name: "Gray", class: "bg-gray-500/20" },
  { name: "Rose", class: "bg-rose-500/20" },
  { name: "Sky", class: "bg-sky-500/20" },
  { name: "Teal", class: "bg-teal-500/20" },
  { name: "Amber", class: "bg-amber-500/20" },
  { name: "Violet", class: "bg-violet-500/20" },
]

const predefinedBgColors = [
  { name: "Default", class: "" },
  { name: "Slate", class: "bg-slate-950" },
  { name: "Stone", class: "bg-stone-950" },
  { name: "Cyan", class: "bg-cyan-950" },
  { name: "Indigo", class: "bg-indigo-950" },
  { name: "Purple", class: "bg-purple-950" },
]

const initialBoards: BoardData[] = [
  {
    id: "board-1",
    name: "Project Phoenix",
    columns: [
      {
        id: "col-1",
        title: "To Do",
        color: columnColors[1].class,
        limit: 5,
        cards: [
          {
            id: "card-1",
            title: "Design the main dashboard with a very long title to test text wrapping",
            description: "Create a modern and intuitive dashboard design.",
            isCompleted: false,
            priority: "High",
            deadline: new Date().toISOString(),
          },
          {
            id: "card-2",
            title: "Set up the database schema",
            isCompleted: false,
            priority: "Medium",
            deadline: null,
          },
        ],
      },
      {
        id: "col-2",
        title: "In Progress",
        color: columnColors[2].class,
        cards: [
          {
            id: "card-3",
            title: "Develop the authentication flow",
            description: "Use NextAuth.js for authentication.",
            isCompleted: false,
            priority: "High",
            deadline: null,
          },
        ],
      },
      {
        id: "col-3",
        title: "Done",
        color: columnColors[3].class,
        cards: [{ id: "card-4", title: "Initial project setup", isCompleted: true, priority: "Low", deadline: null }],
      },
    ],
  },
]

const sortCards = (cards: CardData[]): CardData[] => {
  const priorityOrder: Record<Priority, number> = { High: 1, Medium: 2, Low: 3 }
  return [...cards].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1
    if (a.priority && b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority]
    if (a.priority) return -1
    if (b.priority) return 1
    return 0
  })
}

export default function KanbanPage() {
  const [boards, setBoards] = useState<BoardData[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [background, setBackground] = useState("")
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const bgImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsClient(true)
    const savedBoards = localStorage.getItem("kanbanBoards")
    const savedActiveBoardId = localStorage.getItem("activeKanbanBoardId")
    const savedBackground = localStorage.getItem("kanbanBackground")

    if (savedBoards) {
      const parsedBoards = JSON.parse(savedBoards)
      setBoards(parsedBoards)
      if (savedActiveBoardId && parsedBoards.some((b: BoardData) => b.id === savedActiveBoardId)) {
        setActiveBoardId(savedActiveBoardId)
      } else {
        setActiveBoardId(parsedBoards[0]?.id || null)
      }
    } else {
      setBoards(initialBoards)
      setActiveBoardId(initialBoards[0]?.id || null)
    }

    if (savedBackground) {
      setBackground(savedBackground)
    }
  }, [])

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("kanbanBoards", JSON.stringify(boards))
      if (activeBoardId) {
        localStorage.setItem("activeKanbanBoardId", activeBoardId)
      }
      localStorage.setItem("kanbanBackground", background)
    }
  }, [boards, activeBoardId, background, isClient])

  const activeBoard = boards.find((b) => b.id === activeBoardId)

  const handleExport = () => {
    if (!boards.length) return
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(boards, null, 2))}`
    const link = document.createElement("a")
    link.href = jsonString
    link.download = `kanban-board-export-${new Date().toISOString().split("T")[0]}.json`
    link.click()
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result
        if (typeof text !== "string") throw new Error("File is not readable")
        const importedBoards = JSON.parse(text)
        if (Array.isArray(importedBoards)) {
          setBoards(importedBoards)
          setActiveBoardId(importedBoards[0]?.id || null)
        } else {
          throw new Error("Invalid board format")
        }
      } catch (error) {
        console.error("Error importing file:", error)
        alert("Failed to import JSON. Please check the file format.")
      }
    }
    reader.readAsText(file)
    if (event.target) {
      event.target.value = ""
    }
  }

  const handleBackgroundImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      setBackground(`url(${imageUrl})`)
    }
    reader.readAsDataURL(file)
  }

  const onDragEnd = (result: any) => {
    const { destination, source, type } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newBoards = [...boards]
    const currentBoard = newBoards.find((b) => b.id === activeBoardId)
    if (!currentBoard) return

    if (type === "COLUMN") {
      const newColumnOrder = Array.from(currentBoard.columns)
      const [reorderedColumn] = newColumnOrder.splice(source.index, 1)
      newColumnOrder.splice(destination.index, 0, reorderedColumn)
      const updatedBoard = { ...currentBoard, columns: newColumnOrder }
      setBoards(newBoards.map((b) => (b.id === activeBoardId ? updatedBoard : b)))
      return
    }

    const startCol = currentBoard.columns.find((c) => c.id === source.droppableId)
    const finishCol = currentBoard.columns.find((c) => c.id === destination.droppableId)
    if (!startCol || !finishCol) return

    if (startCol === finishCol) {
      const newCards = Array.from(startCol.cards)
      const [reorderedCard] = newCards.splice(source.index, 1)
      newCards.splice(destination.index, 0, reorderedCard)
      const newCol = { ...startCol, cards: sortCards(newCards) }
      const newColumns = currentBoard.columns.map((c) => (c.id === newCol.id ? newCol : c))
      const updatedBoard = { ...currentBoard, columns: newColumns }
      setBoards(newBoards.map((b) => (b.id === activeBoardId ? updatedBoard : b)))
    } else {
      const startCards = Array.from(startCol.cards)
      const [movedCard] = startCards.splice(source.index, 1)
      const newStartCol = { ...startCol, cards: sortCards(startCards) }

      const finishCards = Array.from(finishCol.cards)
      finishCards.splice(destination.index, 0, movedCard)
      const newFinishCol = { ...finishCol, cards: sortCards(finishCards) }

      const newColumns = currentBoard.columns.map((c) => {
        if (c.id === newStartCol.id) return newStartCol
        if (c.id === newFinishCol.id) return newFinishCol
        return c
      })
      const updatedBoard = { ...currentBoard, columns: newColumns }
      setBoards(newBoards.map((b) => (b.id === activeBoardId ? updatedBoard : b)))
    }
  }

  const updateBoardData = (updateFn: (boards: BoardData[]) => BoardData[]) => {
    setBoards(updateFn(boards))
  }

  const addColumn = (title: string, color: string, limit?: number) => {
    updateBoardData((prevBoards) =>
      prevBoards.map((board) => {
        if (board.id === activeBoardId) {
          const newColumn: ColumnData = { id: `col-${Date.now()}`, title, color, limit, cards: [] }
          return { ...board, columns: [...board.columns, newColumn] }
        }
        return board
      }),
    )
  }

  const updateColumn = (columnId: string, updatedData: { title: string; color: string; limit?: number }) => {
    updateBoardData((prevBoards) =>
      prevBoards.map((board) => {
        if (board.id === activeBoardId) {
          const newColumns = board.columns.map((col) => (col.id === columnId ? { ...col, ...updatedData } : col))
          return { ...board, columns: newColumns }
        }
        return board
      }),
    )
  }

  const addCard = (columnId: string, cardData: Omit<CardData, "id" | "isCompleted">) => {
    updateBoardData((prevBoards) =>
      prevBoards.map((board) => {
        if (board.id === activeBoardId) {
          const newColumns = board.columns.map((col) => {
            if (col.id === columnId) {
              const newCard: CardData = { ...cardData, id: `card-${Date.now()}`, isCompleted: false }
              return { ...col, cards: sortCards([newCard, ...col.cards]) }
            }
            return col
          })
          return { ...board, columns: newColumns }
        }
        return board
      }),
    )
  }

  const updateCard = (columnId: string, cardId: string, updatedData: Partial<Omit<CardData, "id">>) => {
    updateBoardData((prevBoards) =>
      prevBoards.map((board) => {
        if (board.id === activeBoardId) {
          const newColumns = board.columns.map((col) => {
            if (col.id === columnId) {
              const newCards = col.cards.map((card) => (card.id === cardId ? { ...card, ...updatedData } : card))
              return { ...col, cards: sortCards(newCards) }
            }
            return col
          })
          return { ...board, columns: newColumns }
        }
        return board
      }),
    )
  }

  const deleteCard = (columnId: string, cardId: string) => {
    updateBoardData((prevBoards) =>
      prevBoards.map((board) => {
        if (board.id === activeBoardId) {
          const newColumns = board.columns.map((col) => {
            if (col.id === columnId) {
              return { ...col, cards: col.cards.filter((card) => card.id !== cardId) }
            }
            return col
          })
          return { ...board, columns: newColumns }
        }
        return board
      }),
    )
  }

  const deleteColumn = (columnId: string) => {
    updateBoardData((prevBoards) =>
      prevBoards.map((board) => {
        if (board.id === activeBoardId) {
          return { ...board, columns: board.columns.filter((c) => c.id !== columnId) }
        }
        return board
      }),
    )
  }

  const addBoard = (name: string) => {
    const newBoard: BoardData = {
      id: `board-${Date.now()}`,
      name,
      columns: [
        { id: `col-${Date.now()}-1`, title: "To Do", color: columnColors[1].class, cards: [] },
        { id: `col-${Date.now()}-2`, title: "In Progress", color: columnColors[2].class, cards: [] },
        { id: `col-${Date.now()}-3`, title: "Done", color: columnColors[3].class, cards: [] },
      ],
    }
    setBoards([...boards, newBoard])
    setActiveBoardId(newBoard.id)
  }

  const deleteBoard = (boardId: string) => {
    const newBoards = boards.filter((b) => b.id !== boardId)
    setBoards(newBoards)
    if (activeBoardId === boardId) {
      setActiveBoardId(newBoards[0]?.id || null)
    }
  }

  if (!isClient) return <div className="bg-background min-h-screen" />

  const isImageUrl = background.startsWith("url(")

  return (
    <div
      className={cn(
        "text-foreground min-h-screen flex flex-col font-sans transition-colors duration-300",
        !isImageUrl && (background || "bg-background"),
      )}
      style={{
        backgroundImage: isImageUrl ? background : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <header
        className={cn(
          "p-4 border-b flex justify-between items-center flex-shrink-0 transition-colors",
          background ? "bg-black/20 backdrop-blur-sm border-white/10" : "bg-background border-border",
        )}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Kanban Board</h1>
          <BoardSwitcher {...{ boards, activeBoard, setActiveBoardId, addBoard, deleteBoard }} />
        </div>
        <div className="flex items-center gap-2">
          <ColumnFormDialog
            onSave={addColumn}
            trigger={
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Column
              </Button>
            }
          />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-semibold">Data Management</h3>
                  <input
                    type="file"
                    ref={importFileInputRef}
                    onChange={handleImport}
                    className="hidden"
                    accept=".json"
                  />
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => importFileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" /> Import from JSON
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export to JSON
                  </Button>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Background</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {predefinedBgColors.map((bg) => (
                      <button
                        key={bg.name}
                        onClick={() => setBackground(bg.class)}
                        className={cn(
                          "w-full h-16 rounded-md flex items-center justify-center text-sm",
                          bg.class || "bg-background",
                          (background === bg.class || (background === "" && bg.class === "")) && "ring-2 ring-primary",
                        )}
                      >
                        {bg.name}
                      </button>
                    ))}
                  </div>
                  <input
                    type="file"
                    ref={bgImageInputRef}
                    onChange={handleBackgroundImageUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => bgImageInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" /> Upload Image
                  </Button>
                  {isImageUrl && (
                    <Button variant="destructive" className="w-full justify-start" onClick={() => setBackground("")}>
                      <X className="mr-2 h-4 w-4" /> Remove Image
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="flex-grow p-4 overflow-x-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          {activeBoard ? (
            activeBoard.columns.length > 0 ? (
              <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="flex gap-6 h-full items-start">
                    {activeBoard.columns.map((col, index) => (
                      <Draggable key={col.id} draggableId={col.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(snapshot.isDragging && "shadow-2xl rounded-xl")}
                          >
                            <Column
                              column={col}
                              dragHandleProps={provided.dragHandleProps}
                              onAddCard={addCard}
                              onDeleteColumn={deleteColumn}
                              onUpdateColumn={updateColumn}
                              onDeleteCard={deleteCard}
                              onUpdateCard={updateCard}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <LayoutGrid className="h-16 w-16 mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-foreground">This board is empty.</h2>
                <p className="mb-4">Create a new column to get started.</p>
                <ColumnFormDialog
                  onSave={addColumn}
                  trigger={
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" /> Add Column
                    </Button>
                  }
                />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="text-lg">No board selected.</p>
              <p>Create or select a board to get started.</p>
            </div>
          )}
        </DragDropContext>
      </main>
    </div>
  )
}

function Column({
  column,
  dragHandleProps,
  onAddCard,
  onDeleteColumn,
  onUpdateColumn,
  onDeleteCard,
  onUpdateCard,
}: any) {
  const limitExceeded = column.limit && column.cards.length > column.limit
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl w-80 flex-shrink-0 flex flex-col max-h-full shadow-sm">
      <div
        {...dragHandleProps}
        className={cn(
          "p-4 border-b border-transparent flex justify-between items-center cursor-grab rounded-t-xl transition-colors",
          limitExceeded ? "bg-red-500/30" : column.color,
        )}
      >
        <h2 className="font-semibold text-foreground">
          {column.title}{" "}
          <span className="text-sm font-normal text-foreground/70">
            {column.cards.length}
            {column.limit ? ` / ${column.limit}` : ""}
          </span>
        </h2>
        <div className="flex items-center">
          <ColumnFormDialog
            column={column}
            onSave={(title, color, limit) => onUpdateColumn(column.id, { title, color, limit })}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            }
          />
          <ConfirmationDialog
            onConfirm={() => onDeleteColumn(column.id)}
            title="Delete Column?"
            description={`Are you sure you want to delete the "${column.title}" column and all its cards?`}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            }
          />
        </div>
      </div>
      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn("p-2 flex-grow min-h-[100px] overflow-y-auto transition-colors rounded-b-xl")}
          >
            {column.cards.map((card: CardData, index: number) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={cn("p-1 transition-transform", snapshot.isDragging && "is-dragging")}
                  >
                    <CardItem
                      card={card}
                      dragHandleProps={provided.dragHandleProps}
                      onDelete={() => onDeleteCard(column.id, card.id)}
                      onUpdate={(data: any) => onUpdateCard(column.id, card.id, data)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <div className="p-2 border-t border-border mt-auto">
        <CardFormDialog
          onSave={(data) => onAddCard(column.id, data)}
          trigger={
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
              <Plus className="mr-2 h-4 w-4" /> Add a card
            </Button>
          }
        />
      </div>
    </div>
  )
}

function CardItem({ card, dragHandleProps, onDelete, onUpdate }: any) {
  const toggleComplete = () => {
    onUpdate({ isCompleted: !card.isCompleted })
  }

  const priorityColors: Record<Priority, string> = {
    High: "bg-red-500",
    Medium: "bg-yellow-500",
    Low: "bg-blue-500",
  }

  return (
    <Card
      className={cn(
        "bg-background/80 backdrop-blur-sm rounded-lg border border-border group transition-all duration-200 hover:shadow-md hover:border-primary/50 overflow-hidden",
        card.isCompleted && "bg-card/60",
      )}
    >
      <CardContent className="p-0 flex">
        {card.priority && !card.isCompleted && (
          <div className={cn("w-2 flex-shrink-0", priorityColors[card.priority])} />
        )}
        <div className="p-3 flex items-start gap-2 flex-grow min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 mt-0.5" onClick={toggleComplete}>
            {card.isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
          <div className="flex-grow min-w-0 space-y-2">
            <p
              className={cn(
                "font-medium text-foreground break-words",
                card.isCompleted && "line-through text-muted-foreground",
              )}
            >
              {card.title}
            </p>
            {card.description && <p className="text-sm text-muted-foreground break-words">{card.description}</p>}
            <div className="flex flex-wrap items-center gap-2">
              {card.deadline && (
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  <Clock className="h-3 w-3" /> {format(new Date(card.deadline), "dd/MM/yyyy")}
                </Badge>
              )}
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
            <CardFormDialog
              card={card}
              onSave={(data) => onUpdate(data)}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
              }
            />
            <ConfirmationDialog
              onConfirm={onDelete}
              title="Delete Card?"
              description={`Are you sure you want to delete the card "${card.title}"?`}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              }
            />
          </div>
          <div {...dragHandleProps} className="py-2 cursor-grab touch-none self-start">
            <GripVertical className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ColumnFormDialog({
  column,
  onSave,
  trigger,
}: {
  column?: ColumnData
  onSave: (title: string, color: string, limit?: number) => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [color, setColor] = useState("")
  const [limit, setLimit] = useState<string>("")

  useEffect(() => {
    if (open) {
      setTitle(column?.title || "")
      setColor(column?.color || columnColors[0].class)
      setLimit(column?.limit?.toString() || "")
    }
  }, [column, open])

  const handleSave = () => {
    if (title) {
      onSave(title, color, limit ? Number.parseInt(limit, 10) : undefined)
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{column ? "Edit Column" : "Add New Column"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="col-title" className="text-sm font-medium">
              Title
            </label>
            <Input id="col-title" placeholder="Column title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="col-limit" className="text-sm font-medium">
              Card Limit (WIP)
            </label>
            <Input
              id="col-limit"
              type="number"
              placeholder="Optional"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Color</p>
            <div className="flex gap-2 items-center">
              {columnColors.map((c) => (
                <Button
                  key={c.name}
                  variant="outline"
                  size="icon"
                  className={cn("h-8 w-8 rounded-full", c.class, color === c.class && "ring-2 ring-primary")}
                  onClick={() => setColor(c.class)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} variant="primary">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CardFormDialog({
  card,
  onSave,
  trigger,
}: { card?: CardData; onSave: (data: Omit<CardData, "id" | "isCompleted">) => void; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState<Date | undefined>()
  const [priority, setPriority] = useState<Priority | null>(null)
  const [dateString, setDateString] = useState("")

  useEffect(() => {
    if (open) {
      setTitle(card?.title || "")
      setDescription(card?.description || "")
      const newDeadline = card?.deadline ? new Date(card.deadline) : undefined
      setDeadline(newDeadline)
      setDateString(newDeadline ? format(newDeadline, "dd/MM/yyyy") : "")
      setPriority(card?.priority || null)
    }
  }, [card, open])

  const handleSave = () => {
    if (title) {
      onSave({ title, description, deadline: deadline?.toISOString() || null, priority })
      setOpen(false)
    }
  }

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`
    if (value.length > 5) value = `${value.slice(0, 5)}/${value.slice(5, 9)}`
    setDateString(value)

    if (value.length === 10) {
      const parsedDate = parse(value, "dd/MM/yyyy", new Date())
      if (isValid(parsedDate)) {
        setDeadline(parsedDate)
      } else {
        setDeadline(undefined)
      }
    } else {
      setDeadline(undefined)
    }
  }

  const priorityOptions: { level: Priority; icon: React.ElementType; color: string }[] = [
    { level: "Low", icon: SignalLow, color: "text-blue-500" },
    { level: "Medium", icon: SignalMedium, color: "text-yellow-500" },
    { level: "High", icon: SignalHigh, color: "text-red-500" },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{card ? "Edit Card" : "Add New Card"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Card title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold"
          />
          <Textarea
            placeholder="Add a more detailed description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input placeholder="DD/MM/YYYY" value={dateString} onChange={handleDateInputChange} maxLength={10} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <div className="flex justify-between gap-2">
              {priorityOptions.map((opt) => (
                <Button
                  key={opt.level}
                  variant={priority === opt.level ? "secondary" : "outline"}
                  className="flex-1"
                  onClick={() => setPriority(opt.level)}
                >
                  <opt.icon className={cn("mr-2 h-4 w-4", opt.color)} />
                  {opt.level}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} variant="primary">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BoardSwitcher({ boards, activeBoard, setActiveBoardId, addBoard, deleteBoard }: any) {
  const [newBoardName, setNewBoardName] = useState("")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{activeBoard ? activeBoard.name : "Select a board"}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {boards.map((board: BoardData) => (
          <DropdownMenuItem
            key={board.id}
            onSelect={() => setActiveBoardId(board.id)}
            className="flex justify-between items-center"
          >
            <span>{board.name}</span>
            <ConfirmationDialog
              onConfirm={() => deleteBoard(board.id)}
              title="Delete Board?"
              description={`Are you sure you want to delete the board "${board.name}"?`}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-destructive/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              }
            />
          </DropdownMenuItem>
        ))}
        <div className="p-2">
          <Input
            placeholder="New board name..."
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newBoardName) {
                addBoard(newBoardName)
                setNewBoardName("")
              }
            }}
          />
          <Button
            variant="primary"
            className="w-full mt-2 h-8"
            onClick={() => {
              if (newBoardName) {
                addBoard(newBoardName)
                setNewBoardName("")
              }
            }}
          >
            Create Board
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ConfirmationDialog({ onConfirm, title, description, trigger }: any) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
