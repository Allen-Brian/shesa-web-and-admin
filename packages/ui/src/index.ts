/**
 * @shesa/ui — shared UI primitives, composites, and theme tokens.
 *
 * Design system consolidated in Phase 2 E2.0. Shadcn primitives + AG Grid
 * data-table + Shesa-specific composites (StatsCard, EntityTablePanel,
 * ConfirmDialog, TagDragDropPicker, etc.). Everything the Exco (and
 * eventually Finance) SPA needs to compose screens.
 */

export { cn } from './lib/cn';

// ─── Primitives (shadcn) ─────────────────────────────────────────────
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './components/alert-dialog';
export { Alert, AlertTitle, AlertDescription, type AlertProps } from './components/alert';
export { Avatar, AvatarImage, AvatarFallback } from './components/avatar';
export { Badge, badgeVariants, type BadgeProps } from './components/badge';
export { Button, buttonVariants, type ButtonProps } from './components/button';
export { Calendar } from './components/calendar';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/card';
export { Checkbox } from './components/checkbox';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/collapsible';
export { ColorField, type ColorFieldProps } from './components/color-field';
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from './components/command';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './components/dialog';
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './components/dropdown-menu';
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from './components/form';
export { Input, type InputProps } from './components/input';
export { Label } from './components/label';
export { Popover, PopoverContent, PopoverTrigger } from './components/popover';
export { Progress } from './components/progress';
export { RadioGroup, RadioGroupItem } from './components/radio-group';
export { ScrollArea, ScrollBar } from './components/scroll-area';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/select';
export { Separator } from './components/separator';
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './components/sheet';
export { Skeleton } from './components/skeleton';
export { Toaster, toast } from './components/sonner';
export { Switch } from './components/switch';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from './components/table';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs';
export { Textarea, type TextareaProps } from './components/textarea';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/tooltip';

// ─── Sidebar (full shadcn shell) ──────────────────────────────────────
export * from './components/sidebar';

// ─── Data table (AG Grid v33 wrapper) ─────────────────────────────────
export {
  DataTable,
  type DataTableProps,
  type DataTableVariant,
} from './components/data-table/data-table';
export type {
  CellClickedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  RowClickedEvent,
  SelectionChangedEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
export { ColumnPicker } from './components/data-table/column-picker';
export { MassActionsBar, type MassActions } from './components/data-table/mass-actions';
export { TablePagination } from './components/data-table/table-pagination';
export { TableSkeleton } from './components/table-skeleton';
export { HeadDrop } from './components/data-table/head-drop';
export { shesaTableTheme } from './components/data-table/theme';

// ─── Composites (Shesa-specific) ─────────────────────────────────────
export { EntityTablePanel } from './components/entity-table-panel';
export { Private, PrivacyProvider, PrivacyToggle, usePrivacy } from './components/privacy';
export { StatsCard } from './components/stats-card';
export { GradientPanel } from './components/gradient-panel';
export { ConfirmDialog } from './components/confirm-dialog';
export { BackLink } from './components/back-link';
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './components/breadcrumb';
export { DatePicker } from './components/date-picker';
export { TimePicker, type TimePickerProps } from './components/time-picker';
export { NativeDateInput, type NativeDateInputProps } from './components/native-date-input';
export { Info } from './components/info';
export { IconChecked } from './components/icons/icon-checked';
export { IconFailed } from './components/icons/icon-failed';
export { IconWarning } from './components/icons/icon-warning';
export { Logo } from './components/logo';
export { Tag, type TagColorTheme, type TagSize } from './components/tag';
export { TagList, type TagListItem } from './components/tag-list';
export { TagDragDropPicker } from './components/tag-drag-drop-picker';
export { TextIcon } from './components/text-icon';
export {
  ThemeProvider,
  useTheme,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from './components/theme-provider';
export { ThemeToggle } from './components/theme-toggle';

// ─── Hooks ────────────────────────────────────────────────────────────
export { useIsMobile } from './hooks/use-mobile';

// ─── Theme tokens (deprecated colors/typography objects kept for now) ─
export { colors } from './theme/colors';
export { typography } from './theme/typography';
