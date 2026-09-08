"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  ShieldCheck,
  TriangleAlert,
  Undo2,
  Save,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Petition, PetitionStatus } from "@/types/petition";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  approvePetition,
  rejectPetition,
  returnPetition,
  unpublishPetition,
  addResponse,
  addUpdate,
} from "@/app/actions";
import {
  PETITION_CATEGORIES,
  PETITION_THRESHOLD,
  PETITION_TIERS,
} from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getPetitionState } from "@/lib/petition-status";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { evaluateReview } from "@/lib/review-stages";
import {
  setPetitionClassification,
  submitReview,
  withdrawReview,
} from "@/app/review-actions";
import { ReviewProgressPanel } from "./ReviewProgressPanel";
import { cn } from "@/lib/utils";
import { TimelineItem } from "./PetitionTimeline";
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

interface ReviewActionBoxProps {
  petition: Petition;
  permissions: number;
  isSuperAdmin: boolean;
  currentUserId: string | null;
  /** Stage keys whose reviewer list includes the signed-in user. */
  myStageKeys: string[];
}

/** A labelled row inside the box, one decision input or sub-action each. */
function BoxRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

/**
 * The decision panel, borrowed in shape from a pull request's merge box: a
 * headline stating where the petition stands, the inputs that decision needs,
 * and the actions themselves in a footer. It sits at the end of the timeline
 * so reading the page top to bottom ends at the thing to do about it.
 */
export function ReviewActionBox({
  petition,
  permissions,
  isSuperAdmin,
  currentUserId,
  myStageKeys,
}: ReviewActionBoxProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [category, setCategory] = useState(petition.tags[0]?.name ?? "");
  const [tier, setTier] = useState(String(petition.tier || 3));
  const [responseOpen, setResponseOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [responseContent, setResponseContent] = useState("");
  const [updateContent, setUpdateContent] = useState("");
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesComment, setChangesComment] = useState("");

  useEffect(() => {
    setCategory(petition.tags[0]?.name ?? "");
    setTier(String(petition.tier || 3));
  }, [petition]);

  const can = (bit: number) => isSuperAdmin || hasPermission(permissions, bit);

  const run = async (
    key: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      setResponseOpen(false);
      setUpdateOpen(false);
      setRejectOpen(false);
      setChangesOpen(false);
      setResponseContent("");
      setUpdateContent("");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Action failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const review = evaluateReview(
    petition.review_stage ?? 0,
    petition.reviews ?? [],
    petition.assignments ?? [],
  );
  const currentStage = review.current;
  const myReview = currentStage
    ? (petition.reviews ?? []).find(
        (entry) =>
          entry.stage === currentStage.index &&
          entry.reviewer.id === currentUserId,
      )
    : undefined;
  const isAssignedHere = !!currentStage?.assignments.some(
    (entry) => entry.assignee.id === currentUserId,
  );
  const isAuthor = petition.authorId === currentUserId;
  const onStageList =
    !!currentStage && myStageKeys.includes(currentStage.stage.key);
  // Being on the stage's reviewer list is what makes someone a reviewer. For
  // a stage that also requires assignment, the list is necessary but not
  // sufficient — this petition has to have named you. Authors never qualify.
  const canReview =
    !isAuthor &&
    !!currentStage &&
    (isSuperAdmin ||
      (onStageList &&
        (!currentStage.stage.requiresAssignment || isAssignedHere)));

  // Nothing to hide behind a menu for a plain reviewer with none of these
  // permissions, so the trigger does not appear at all.
  const hasOverflow =
    can(PERMISSIONS.RETURN) || can(PERMISSIONS.REJECT) || isSuperAdmin;

  const state = getPetitionState(petition.status);
  const StateIcon = state.icon;
  const threshold = petition.targetSignatures || PETITION_THRESHOLD;
  const expired = new Date(petition.expires) < new Date();

  const headline: Record<number, { title: string; subtitle: string }> = {
    [PetitionStatus.NeedsReview]: {
      title: currentStage
        ? `Waiting on ${currentStage.stage.name}`
        : "Review complete",
      subtitle: currentStage
        ? currentStage.blocked
          ? "A reviewer has requested changes. The stage cannot pass until they approve or withdraw."
          : `${currentStage.approvalCount} of ${currentStage.stage.minApprovals} approvals${
              currentStage.awaitingAssignees.length > 0
                ? `, still waiting on ${currentStage.awaitingAssignees
                    .map((entry) => entry.assignee.name)
                    .join(", ")}`
                : ""
            }.`
        : "Every stage has been satisfied.",
    },
    [PetitionStatus.Published]: {
      title: expired ? "Published — collection closed" : "Published and live",
      subtitle: `${petition.signatures} of ${threshold} signatures · ${
        expired
          ? `expired ${formatRelative(petition.expires)}`
          : `expires ${formatRelative(petition.expires)}`
      }`,
    },
    [PetitionStatus.Returned]: {
      title: "Returned to the author",
      subtitle:
        "The author has to revise and resubmit before it can be reviewed again.",
    },
    [PetitionStatus.Removed]: {
      title: "Rejected",
      subtitle: "This petition is not visible on the site.",
    },
    [PetitionStatus.New]: {
      title: "Draft",
      subtitle: "The author has not submitted this for review yet.",
    },
  };

  const head = headline[petition.status] ?? {
    title: state.label,
    subtitle: "",
  };

  const pending = petition.status === PetitionStatus.NeedsReview;
  const published = petition.status === PetitionStatus.Published;

  return (
    <>
      <TimelineItem
        icon={StateIcon}
        iconClassName={state.iconClassName}
      >
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-start gap-3 px-4 py-4">
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                state.chipClassName,
              )}
            >
              <StateIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold">{head.title}</h2>
              {head.subtitle && (
                <p className="text-sm text-muted-foreground">{head.subtitle}</p>
              )}
            </div>
          </div>

          {pending && <ReviewProgressPanel stages={review.stages} />}

          {pending && (
            <div className="divide-y border-t">
              <BoxRow
                title="Category"
                description="Shown on the petition and used for filtering."
              >
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PETITION_CATEGORIES.map((entry) => (
                      <SelectItem key={entry} value={entry}>
                        {entry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </BoxRow>

              <BoxRow
                title="Tier"
                description="Sets the signature target it has to reach."
              >
                <div className="flex items-center gap-2">
                  <Select value={tier} onValueChange={setTier}>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Choose a tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {PETITION_TIERS.map((entry) => (
                        <SelectItem key={entry.id} value={String(entry.id)}>
                          {entry.name} — {entry.threshold} signatures
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      !can(PERMISSIONS.APPROVE) || !category || busy !== null
                    }
                    onClick={() =>
                      run(
                        "classify",
                        () =>
                          setPetitionClassification(
                            petition.id,
                            Number(tier),
                            category,
                          ),
                        "Classification saved",
                      )
                    }
                  >
                    {busy === "classify" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="sr-only sm:not-sr-only sm:ml-1.5">
                      Save
                    </span>
                  </Button>
                </div>
              </BoxRow>
            </div>
          )}

          {published && (
            <div className="divide-y border-t">
              <BoxRow
                icon={MessageSquare}
                title="Official response"
                description={
                  petition.response
                    ? `Posted ${formatDateTime(petition.response.created_at)} — a petition takes only one.`
                    : "Posting one closes the petition to further signatures."
                }
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    !!petition.response ||
                    !can(PERMISSIONS.RESPONSE) ||
                    busy !== null
                  }
                  onClick={() => {
                    setResponseContent("");
                    setResponseOpen(true);
                  }}
                >
                  {petition.response ? "Response posted" : "Post response"}
                </Button>
              </BoxRow>

              <BoxRow
                icon={Megaphone}
                title="Updates"
                description={
                  petition.updates.length === 0
                    ? "Keep signers informed without closing the petition."
                    : `${petition.updates.length} posted`
                }
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!can(PERMISSIONS.ADD_UPDATE) || busy !== null}
                  onClick={() => {
                    setUpdateContent("");
                    setUpdateOpen(true);
                  }}
                >
                  Post update
                </Button>
              </BoxRow>
            </div>
          )}

          {(pending || published) && (
            <div className="border-t bg-muted/40 px-4 py-3">
              {/* Two tiers, not one row of five. What a reviewer is here to
                  do sits on the left; returning, rejecting and the superadmin
                  override are one-off decisions and live behind the menu, out
                  of misclick range of Approve. */}
              <div className="flex flex-wrap items-center gap-2">
                {pending && canReview && currentStage && (
                  <>
                    <Button
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={myReview?.decision === "APPROVE" || busy !== null}
                      onClick={() =>
                        run(
                          "approve",
                          () => submitReview(petition.id, "APPROVE"),
                          "Approval recorded",
                        )
                      }
                    >
                      {busy === "approve" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      {myReview?.decision === "APPROVE"
                        ? "You approved"
                        : "Approve"}
                    </Button>

                    {myReview ? (
                      <Button
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() =>
                          run(
                            "withdraw",
                            () => withdrawReview(petition.id, currentStage.index),
                            "Review withdrawn",
                          )
                        }
                      >
                        {busy === "withdraw" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Undo2 className="mr-2 h-4 w-4" />
                        )}
                        Withdraw my review
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => {
                          setChangesComment("");
                          setChangesOpen(true);
                        }}
                      >
                        <TriangleAlert className="mr-2 h-4 w-4" />
                        Request changes
                      </Button>
                    )}
                  </>
                )}

                {published && (
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={!can(PERMISSIONS.UNPUBLISH) || busy !== null}
                    onClick={() =>
                      run(
                        "unpublish",
                        () => unpublishPetition(petition.id),
                        "Petition taken down",
                      )
                    }
                  >
                    {busy === "unpublish" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    Take down
                  </Button>
                )}

                {pending && hasOverflow && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto"
                        aria-label="More review actions"
                        disabled={busy !== null}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Other decisions</DropdownMenuLabel>
                      {can(PERMISSIONS.RETURN) && (
                        <DropdownMenuItem
                          onSelect={() =>
                            run(
                              "return",
                              () => returnPetition(petition.id),
                              "Returned for changes",
                            )
                          }
                        >
                          <Undo2 className="mr-2 h-4 w-4" />
                          Return to author
                        </DropdownMenuItem>
                      )}
                      {can(PERMISSIONS.REJECT) && (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setRejectOpen(true)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject petition
                        </DropdownMenuItem>
                      )}
                      {isSuperAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                            Superadmin
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            disabled={!category}
                            onSelect={() =>
                              run(
                                "override",
                                () =>
                                  approvePetition(
                                    petition.id,
                                    Number(tier),
                                    category,
                                  ),
                                "Published, skipping review",
                              )
                            }
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Publish now, skip review
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {published
                  ? "Taking it down removes it from the site but keeps its signatures."
                  : isAuthor
                    ? "You cannot review your own petition."
                    : canReview
                      ? "It publishes on its own once every stage passes."
                      : currentStage?.needsAssignment
                        ? "Nobody is assigned to this stage yet."
                        : onStageList
                          ? "You have not been assigned to this petition."
                          : `You are not on the ${currentStage?.stage.name ?? "reviewer"} list.`}
              </p>
            </div>
          )}

        </div>
      </TimelineItem>

      <Dialog open={responseOpen} onOpenChange={setResponseOpen}>
        <DialogContent className="flex h-[80vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Post official response</DialogTitle>
            <DialogDescription>
              A petition takes one response, and posting it closes the petition
              to further signatures. Signers and subscribers are notified. For
              ongoing progress, post an update instead.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-2 py-2">
            <Label htmlFor="response">Response content</Label>
            <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-input bg-background text-foreground focus-within:border-[#F76902] focus-within:ring-2 focus-within:ring-[#F76902] focus-within:ring-offset-2 focus-within:ring-offset-background">
              <ReactQuill
                theme="snow"
                value={responseContent}
                onChange={setResponseContent}
                modules={modules}
                formats={formats}
                className="petition-editor flex flex-1 flex-col text-foreground [&_.ql-container]:flex-1 [&_.ql-editor]:h-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setResponseOpen(false)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                run(
                  "response",
                  () => addResponse(petition.id, responseContent),
                  "Response posted",
                )
              }
              disabled={busy !== null || !responseContent.trim()}
            >
              {busy === "response" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Post response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="flex h-[80vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Post status update</DialogTitle>
            <DialogDescription>
              Keeps signers informed without closing the petition.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-2 py-2">
            <Label htmlFor="update">Update content</Label>
            <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-input bg-background text-foreground focus-within:border-[#F76902] focus-within:ring-2 focus-within:ring-[#F76902] focus-within:ring-offset-2 focus-within:ring-offset-background">
              <ReactQuill
                theme="snow"
                value={updateContent}
                onChange={setUpdateContent}
                modules={modules}
                formats={formats}
                className="petition-editor flex flex-1 flex-col text-foreground [&_.ql-container]:flex-1 [&_.ql-editor]:h-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setUpdateOpen(false)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                run(
                  "update",
                  () => addUpdate(petition.id, updateContent),
                  "Update posted",
                )
              }
              disabled={busy !== null || !updateContent.trim()}
            >
              {busy === "update" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Post update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changesOpen} onOpenChange={setChangesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              This blocks the stage until you approve or withdraw. The petition
              stays where it is — use &ldquo;Return to author&rdquo; if it needs
              rewriting before review can continue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="changes-comment">What needs to change?</Label>
            <Textarea
              id="changes-comment"
              value={changesComment}
              onChange={(event) => setChangesComment(event.target.value)}
              placeholder="Optional, but it saves the author guessing."
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setChangesOpen(false)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                run(
                  "changes",
                  () =>
                    submitReview(
                      petition.id,
                      "CHANGES_REQUESTED",
                      changesComment,
                    ),
                  "Changes requested",
                )
              }
              disabled={busy !== null}
            >
              {busy === "changes" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Request changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this petition?</DialogTitle>
            <DialogDescription>
              The author is notified and the petition stops being visible. If
              it only needs changes, return it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setRejectOpen(false)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                run(
                  "reject",
                  () => rejectPetition(petition.id),
                  "Petition rejected",
                )
              }
              disabled={busy !== null}
            >
              {busy === "reject" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reject petition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReviewActionBox;
