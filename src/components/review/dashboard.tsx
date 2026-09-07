"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useEffect } from "react";
import { Petition, PetitionStatus } from "@/types/petition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  AlertCircle,
  Clock,
  MessageSquare,
  Plus,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Loader2,
  Share2,
  Link as LinkIcon,
  Flag,
  Filter,
  ArrowLeft,
  ChevronLeft,
  Undo2,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  approvePetition,
  rejectPetition,
  returnPetition,
  unpublishPetition,
  addResponse,
  addUpdate,
} from "@/app/actions";
import {
  PETITION_THRESHOLD,
  PETITION_TIERS,
  PETITION_CATEGORIES,
} from "@/lib/constants";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [
      { list: "ordered" },
      { list: "bullet" },
      { indent: "-1" },
      { indent: "+1" },
    ],
    ["link", "clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "bullet",
  "indent",
  "link",
];

interface ReviewDashboardProps {
  petitions: Petition[];
  onRefresh: () => void;
}

export function ReviewDashboard({
  petitions,
  onRefresh,
}: ReviewDashboardProps) {
  const [selectedPetitionId, setSelectedPetitionId] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [attributeFilter, setAttributeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [responseContent, setResponseContent] = useState("");
  const [updateContent, setUpdateContent] = useState("");
  const [pendingTier, setPendingTier] = useState<number | null>(null);
  const [pendingCategory, setPendingCategory] = useState<string>("");

  const selectedPetition = useMemo(
    () => petitions.find((p) => p.id === selectedPetitionId),
    [petitions, selectedPetitionId],
  );

  useEffect(() => {
    if (selectedPetition) {
      setPendingTier(selectedPetition.tier || 1);
      setPendingCategory(selectedPetition.tags[0]?.name || "General");
    }
  }, [selectedPetition]);

  const filteredPetitions = useMemo(() => {
    return petitions.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.author.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" &&
          p.status === PetitionStatus.NeedsReview) ||
        (statusFilter === "published" &&
          p.status === PetitionStatus.Published) ||
        (statusFilter === "removed" && p.status === PetitionStatus.Removed) ||
        (statusFilter === "returned" && p.status === PetitionStatus.Returned);

      let matchesAttribute = true;
      const now = new Date();
      const expires = new Date(p.expires);

      switch (attributeFilter) {
        case "active":
          matchesAttribute = expires > now;
          break;
        case "expired":
          matchesAttribute = expires <= now;
          break;
        case "has_response":
          matchesAttribute = p.has_response || !!p.response;
          break;
        case "has_updates":
          matchesAttribute = p.updates.length > 0;
          break;
        case "threshold":
          matchesAttribute =
            p.signatures >= (p.targetSignatures || PETITION_THRESHOLD);
          break;
        default:
          matchesAttribute = true;
      }

      const matchesCategory =
        categoryFilter === "all" ||
        p.tags.some((t) => t.name === categoryFilter);

      return (
        matchesSearch && matchesStatus && matchesAttribute && matchesCategory
      );
    });
  }, [petitions, searchQuery, statusFilter, attributeFilter, categoryFilter]);

  const handleAction = async (
    action: () => Promise<any>,
    successMessage: string,
  ) => {
    setIsLoading(true);
    try {
      await action();
      toast.success(successMessage);
      onRefresh();
      setResponseDialogOpen(false);
      setUpdateDialogOpen(false);
      setRejectDialogOpen(false);
      setResponseContent("");
      setUpdateContent("");
    } catch (error) {
      console.error(error);
      toast.error("Action failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (!selectedPetition) return;
    const url = `${window.location.origin}/petitions/${selectedPetition.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="flex h-full w-full flex-row bg-background overflow-hidden relative">
      <div
        className={cn(
          "w-full md:w-[400px] flex flex-col border-r bg-muted/5 h-full shrink-0 absolute md:relative z-20 bg-background transition-transform",
          selectedPetitionId
            ? "-translate-x-full md:translate-x-0"
            : "translate-x-0",
        )}
      >
        <div className="p-4 space-y-3 border-b bg-background">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="published">Live</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="removed">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={attributeFilter} onValueChange={setAttributeFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">No Filter</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="threshold">Threshold Met</SelectItem>
                <SelectItem value="has_response">Has Response</SelectItem>
                <SelectItem value="has_updates">Has Updates</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {PETITION_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col pb-20">
            {filteredPetitions.map((petition) => {
              const isExpired = new Date(petition.expires) < new Date();
              const threshold = petition.targetSignatures || PETITION_THRESHOLD;
              const isThresholdMet = petition.signatures >= threshold;
              const isPending = petition.status === PetitionStatus.NeedsReview;

              return (
                <button
                  key={petition.id}
                  className={cn(
                    "flex flex-col items-start gap-1 p-4 text-left text-sm transition-colors border-b last:border-0 border-l-4",
                    selectedPetitionId === petition.id
                      ? "bg-accent/50 text-accent-foreground"
                      : "hover:bg-muted/50 bg-card",
                    isPending
                      ? "border-l-amber-500/70"
                      : isThresholdMet
                        ? "border-l-orange-500/70"
                        : selectedPetitionId === petition.id
                          ? "border-l-primary"
                          : "border-l-transparent",
                    selectedPetitionId !== petition.id &&
                      isPending &&
                      "bg-amber-50/10 dark:bg-amber-950/10",
                    selectedPetitionId !== petition.id &&
                      isThresholdMet &&
                      !isPending &&
                      "bg-orange-50/10 dark:bg-orange-950/10",
                    isExpired && "opacity-50 grayscale",
                  )}
                  onClick={() => setSelectedPetitionId(petition.id)}
                >
                  <div className="flex w-full flex-col gap-0.5 overflow-hidden">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {petition.author}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
                        {new Date(petition.created_at).toLocaleDateString(
                          "en-GB",
                        )}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-medium text-base leading-tight line-clamp-2",
                        selectedPetitionId === petition.id
                          ? "text-foreground"
                          : "text-foreground/90",
                      )}
                    >
                      {petition.title}
                    </span>
                  </div>

                  <div className="flex items-center justify-between w-full mt-2">
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge
                        variant={getStatusBadgeVariant(petition.status)}
                        className="text-[10px] px-1.5 py-0 h-5 font-normal rounded-full"
                      >
                        {getStatusLabel(petition.status)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 font-normal rounded-full"
                      >
                        {petition.tags[0]?.name}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {petition.signatures} sigs
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredPetitions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground">
                <Filter className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No petitions found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col h-full overflow-hidden bg-background w-full md:w-auto absolute md:relative z-10 md:z-auto transition-transform duration-300",
          selectedPetitionId
            ? "translate-x-0"
            : "translate-x-full md:translate-x-0",
        )}
      >
        {selectedPetition ? (
          <>
            <header className="flex items-center justify-between border-b px-4 py-3 md:px-6 md:py-4 bg-background z-10 shrink-0">
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden shrink-0 -ml-2"
                  onClick={() => setSelectedPetitionId(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-xl font-bold truncate">
                      {selectedPetition.title}
                    </h2>
                  </div>
                  <div className="flex flex-col gap-0.5 text-sm text-muted-foreground min-w-0">
                    <span className="truncate">
                      Issuer: {selectedPetition.author}
                    </span>
                    <span className="truncate">
                      Email: {selectedPetition.authorEmail || "Unavailable"}
                    </span>
                  </div>
                  <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(selectedPetition.expires) < new Date()
                        ? "Expired"
                        : `Expires ${new Date(selectedPetition.expires).toLocaleDateString("en-GB")}`}
                    </span>
                    <span>•</span>
                    <span>{selectedPetition.signatures} Signatures</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1 ml-1"
                    >
                      #{selectedPetition.id}
                    </Badge>
                  </div>
                  <div className="md:hidden text-xs text-muted-foreground">
                    {selectedPetition.signatures} Signatures • #
                    {selectedPetition.id}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={copyLink}>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Copy Link
                    </DropdownMenuItem>
                    {selectedPetition.status === PetitionStatus.Published && (
                      <DropdownMenuItem onClick={copyLink}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8 sticky">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {selectedPetition.signatures} signatures
                    </span>
                    <span className="text-muted-foreground">
                      {selectedPetition.targetSignatures || PETITION_THRESHOLD}{" "}
                      goal
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      (selectedPetition.signatures /
                        (selectedPetition.targetSignatures ||
                          PETITION_THRESHOLD)) *
                        100,
                      100,
                    )}
                    className={cn(
                      "h-3 bg-muted",
                      (selectedPetition.signatures /
                        (selectedPetition.targetSignatures ||
                          PETITION_THRESHOLD)) *
                        100 >=
                        100
                        ? "[&>div]:bg-green-500"
                        : (selectedPetition.signatures /
                              (selectedPetition.targetSignatures ||
                                PETITION_THRESHOLD)) *
                              100 >=
                            50
                          ? "[&>div]:bg-yellow-500"
                          : "[&>div]:bg-primary",
                    )}
                  />
                </div>

                {selectedPetition.status === PetitionStatus.NeedsReview && (
                  <div className="space-y-4 w-full">
                    <p className="flex items-center gap-2 text-xl text-amber-600">
                      This petition is pending review. Please approve, reject,
                      or return it for changes.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={pendingCategory}
                          onValueChange={setPendingCategory}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {PETITION_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tier Level</Label>
                        <Select
                          value={pendingTier?.toString()}
                          onValueChange={(val) => setPendingTier(parseInt(val))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Tier" />
                          </SelectTrigger>
                          <SelectContent>
                            {PETITION_TIERS.map((tier) => (
                              <SelectItem
                                key={tier.id}
                                value={tier.id.toString()}
                              >
                                {tier.name} ({tier.threshold} sigs)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 rounded-lg">
                  {selectedPetition.status === PetitionStatus.NeedsReview && (
                    <>
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                        disabled={isLoading}
                        onClick={() =>
                          handleAction(
                            () =>
                              approvePetition(
                                selectedPetition.id,
                                pendingTier || undefined,
                                pendingCategory,
                              ),
                            "Petition approved",
                          )
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        className="bg-orange-600 hover:bg-orange-700 text-white flex-1 md:flex-none"
                        disabled={isLoading}
                        onClick={() =>
                          handleAction(
                            () => returnPetition(selectedPetition.id),
                            "Petition returned for changes",
                          )
                        }
                      >
                        <Undo2 className="mr-2 h-4 w-4" />
                        Return
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 md:flex-none"
                        disabled={isLoading}
                        onClick={() => setRejectDialogOpen(true)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}

                  {selectedPetition.status === PetitionStatus.Published && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 md:flex-none"
                        onClick={() => {
                          setResponseContent("");
                          setResponseDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Response
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 md:flex-none"
                        onClick={() => {
                          setUpdateContent("");
                          setUpdateDialogOpen(true);
                        }}
                      >
                        <Megaphone className="mr-2 h-4 w-4" />
                        Update
                      </Button>

                      <div className="hidden md:block flex-1" />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full md:w-auto mt-2 md:mt-0"
                        disabled={isLoading}
                        onClick={() =>
                          handleAction(
                            () => unpublishPetition(selectedPetition.id),
                            "Petition taken down",
                          )
                        }
                      >
                        Take Down
                      </Button>
                    </>
                  )}
                </div>

                <Separator />

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-4">
                      Petition Content
                    </h3>
                    <div
                      className="text-foreground text-base leading-relaxed prose prose-base max-w-none dark:prose-invert [&_h1]:!text-foreground [&_h2]:!text-foreground [&_h3]:!text-foreground [&_p]:!text-foreground [&_strong]:!text-foreground [&_li]:!text-foreground"
                      dangerouslySetInnerHTML={{
                        __html: selectedPetition.description,
                      }}
                    />
                  </div>

                  {selectedPetition.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedPetition.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {(selectedPetition.response ||
                  selectedPetition.updates.length > 0) && (
                  <>
                    <div className="space-y-8">
                      {selectedPetition.response && (
                        <article>
                          <div className="md:flex justify-start md:gap-x-24 items-start py-2 md:py-6">
                            <header className="border-t py-2 md:w-24 md:shrink-0">
                              <h3 className="text-xs font-mono uppercase text-green-700 dark:text-green-400">
                                Response
                              </h3>
                              <time
                                className="text-xs text-muted-foreground font-mono"
                                dateTime={selectedPetition.response.created_at}
                              >
                                {new Date(
                                  selectedPetition.response.created_at,
                                ).toLocaleDateString("en-GB")}
                              </time>
                            </header>

                            <div
                              className="text-base prose prose-base max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{
                                __html: selectedPetition.response.description,
                              }}
                            />
                          </div>
                        </article>
                      )}

                      {selectedPetition.updates.length > 0 && (
                        <ol className="relative space-y-6 list-none m-0 p-0">
                          {selectedPetition.updates.map((update) => (
                            <li key={update.id} className="relative">
                              <article className="md:flex justify-start md:gap-x-24 items-start py-2 md:py-6">
                                <div className="border-t py-2 md:w-24 md:shrink-0">
                                  <h3 className="text-xs font-mono text-muted-foreground uppercase">
                                    Update
                                  </h3>
                                  <time
                                    className="text-xs text-muted-foreground font-mono"
                                    dateTime={update.created_at}
                                  >
                                    {new Date(
                                      update.created_at,
                                    ).toLocaleDateString("en-GB")}
                                  </time>
                                </div>

                                <div
                                  className="text-base prose prose prose-base max-w-none dark:prose-invert md:mt-0 mt-3"
                                  dangerouslySetInnerHTML={{
                                    __html: update.description,
                                  }}
                                />
                              </article>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
            <div className="text-center space-y-2 max-w-sm">
              <div className="h-12 w-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 opacity-40" />
              </div>
              <h3 className="text-lg font-medium text-foreground">
                Select a Petition
              </h3>
              <p className="text-sm">
                Choose a petition from the sidebar to review details and take
                action.
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Post Official Response</DialogTitle>
            <DialogDescription>
              Add an official response to address the petitioner's concerns. You
              can only add one response to a petition, which will notify
              petition signers and subscribers. The petition closes after a
              response is posted, so make it count.
              <br />
              <br />
              If you want to provide ongoing updates, consider adding an
              "Update" instead.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-2 py-2 min-h-0">
            <Label htmlFor="response">Response Content</Label>
            <div className="flex-1 bg-background text-foreground rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-[#F76902] focus-within:border-[#F76902] focus-within:ring-offset-2 focus-within:ring-offset-background flex flex-col">
              <ReactQuill
                theme="snow"
                value={responseContent}
                onChange={setResponseContent}
                modules={modules}
                formats={formats}
                className="petition-editor flex-1 flex flex-col text-foreground [&_.ql-container]:flex-1 [&_.ql-editor]:h-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setResponseDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedPetition &&
                handleAction(
                  () => addResponse(selectedPetition.id, responseContent),
                  "Response posted successfully",
                )
              }
              disabled={isLoading || !responseContent.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Post Status Update</DialogTitle>
            <DialogDescription>
              Add a progress update to keep signers informed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-2 py-2 min-h-0">
            <Label htmlFor="update">Update Content</Label>
            <div className="flex-1 bg-background text-foreground rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-[#F76902] focus-within:border-[#F76902] focus-within:ring-offset-2 focus-within:ring-offset-background flex flex-col">
              <ReactQuill
                theme="snow"
                value={updateContent}
                onChange={setUpdateContent}
                modules={modules}
                formats={formats}
                className="petition-editor flex-1 flex flex-col text-foreground [&_.ql-container]:flex-1 [&_.ql-editor]:h-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setUpdateDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedPetition &&
                handleAction(
                  () => addUpdate(selectedPetition.id, updateContent),
                  "Update posted successfully",
                )
              }
              disabled={isLoading || !updateContent.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Petition</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this petition? This action cannot
              be undone easily.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedPetition &&
                handleAction(
                  () => rejectPetition(selectedPetition.id),
                  "Petition rejected",
                )
              }
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Petition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusBadgeVariant(status: number) {
  switch (status) {
    case PetitionStatus.Published:
      return "default";
    case PetitionStatus.NeedsReview:
      return "secondary";
    case PetitionStatus.Returned:
      return "secondary";
    case PetitionStatus.Removed:
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: number) {
  switch (status) {
    case PetitionStatus.New:
      return "Draft";
    case PetitionStatus.Published:
      return "Published";
    case PetitionStatus.Removed:
      return "Rejected";
    case PetitionStatus.NeedsReview:
      return "Pending";
    case PetitionStatus.Returned:
      return "Returned";
    default:
      return "Unknown";
  }
}
