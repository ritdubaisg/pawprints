"use client";

import { PETITION_THRESHOLD, PETITION_TIERS } from "@/lib/constants";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Petition, PetitionStatus } from "../../types/petition";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import { Separator } from "../ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  PenToolIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2,
  LinkIcon,
  X,
  Share2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../../app/auth/AuthContext";
import { useVisitedPetitions } from "@/hooks/use-visited-petitions";
import {
  signPetition,
  unsignPetition,
  getPetitionSignatureStatus,
  publishPetition,
  updatePetition,
  addUpdate,
  addResponse,
  editUpdate,
  editResponse,
  approvePetition,
  rejectPetition,
  returnPetition,
  getStaffPermissions,
  unpublishPetition,
} from "../../app/actions";
import { hasPermission, PERMISSIONS } from "../../lib/permissions";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "../ui/textarea";
import PetitionForm, {
  PetitionFormData,
  formSchema,
  FormValues,
} from "../PetitionForm/PetitionForm";
import dynamic from "next/dynamic";
import { PlusIcon, MoreHorizontalIcon } from "lucide-react";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["link"],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "indent",
  "link",
];

interface PetitionPageClientProps {
  initialPetition: Petition;
  initialIsAuthor?: boolean;
  onPetitionUpdated?: (petition: Petition) => void;
  isReviewMode?: boolean;
  onApprove?: (petition: Petition) => void;
  onReject?: (petition: Petition) => void;
}

const getStatusInfo = (status: PetitionStatus) => {
  switch (status) {
    case PetitionStatus.New:
      return {
        text: "New",
        color: "text-orange-600",
        badge: "bg-orange-100 text-orange-800",
      };
    case PetitionStatus.Published:
      return {
        text: "Published",
        color: "text-green-600",
        badge: "bg-green-100 text-green-800",
      };
    case PetitionStatus.Removed:
      return {
        text: "Removed",
        color: "text-red-600",
        badge: "bg-red-100 text-red-800",
      };
    case PetitionStatus.Returned:
      return {
        text: "Returned for Changes",
        color: "text-red-600",
        badge: "bg-red-100 text-red-800",
      };
    case PetitionStatus.NeedsReview:
      return {
        text: "Needs Review",
        color: "text-yellow-600",
        badge: "bg-yellow-100 text-yellow-800",
      };
    default:
      return {
        text: "Unknown",
        color: "text-gray-600",
        badge: "bg-gray-100 text-gray-800",
      };
  }
};

const PetitionPageClient: React.FC<PetitionPageClientProps> = ({
  initialPetition: initialPetitionProp,
  initialIsAuthor = false,
  onPetitionUpdated,
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [petition, setPetition] = useState<Petition>(initialPetitionProp);
  const { markVisited } = useVisitedPetitions();

  React.useEffect(() => {
    markVisited(petition.id);
  }, [petition.id, markVisited]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: petition.title,
      description: petition.description,
      category: petition.tags[0]?.name || "",
      targetSignatures: petition.targetSignatures || PETITION_THRESHOLD,
      expiresDate: petition.expires,
    },
  });
  const [isSigned, setIsSigned] = React.useState(false);
  const [isAuthor, setIsAuthor] = React.useState(initialIsAuthor);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [userPermissions, setUserPermissions] = React.useState(0);
  const [isLoadingSign, setIsLoadingSign] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isAddingUpdate, setIsAddingUpdate] = React.useState(false);
  const [isAddingResponse, setIsAddingResponse] = React.useState(false);
  const [editingUpdateId, setEditingUpdateId] = React.useState<number | null>(
    null,
  );
  const [editingResponseId, setEditingResponseId] = React.useState<
    number | null
  >(null);

  const [updateContent, setUpdateContent] = React.useState("");
  const [responseContent, setResponseContent] = React.useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  React.useEffect(() => {
    if (isEditing) {
      form.reset({
        title: petition.title,
        description: petition.description,
        category: petition.tags[0]?.name || "",
        targetSignatures: petition.targetSignatures || PETITION_THRESHOLD,
        expiresDate: new Date(petition.expires).toISOString().split("T")[0],
      });
    }
  }, [isEditing, petition, form]);

  React.useEffect(() => {
    setPetition(initialPetitionProp);
  }, [initialPetitionProp]);

  React.useEffect(() => {
    setIsEditing(false);
    setIsAddingUpdate(false);
    setIsAddingResponse(false);
    setEditingUpdateId(null);
    setEditingResponseId(null);
    setUpdateContent("");
    setResponseContent("");

    if (petition && user) {
      setIsLoadingSign(true);

      getStaffPermissions()
        .then((data) => {
          setIsAdmin(data.isStaff || data.isSuperAdmin);
          setIsSuperAdmin(data.isSuperAdmin);
          setUserPermissions(data.permissions);
        })
        .catch(console.error);

      if (initialIsAuthor) {
        setIsAuthor(true);
      }

      getPetitionSignatureStatus(petition.id)
        .then((status) => {
          setIsSigned(status.signed);
          setIsAuthor(status.isAuthor);
        })
        .catch(console.error)
        .finally(() => setIsLoadingSign(false));
    } else {
      setIsSigned(false);
      setIsAuthor(initialIsAuthor);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setUserPermissions(0);
    }
  }, [petition?.id, user, initialIsAuthor]); // Removed petition from dependency to avoid loop if we update it locally, but we need to react to ID changes

  const checkPerm = (perm: number) => {
    if (isSuperAdmin) return true;
    return hasPermission(userPermissions, perm);
  };

  const handleUpdate = async (data: PetitionFormData) => {
    if (!petition) return;
    setIsLoadingSign(true);
    try {
      const updatedPetition = await updatePetition(petition.id, {
        title: data.title,
        description: data.description,
        tags: [data.category],
        expires: data.expiresDate,
      });
      toast.success("Petition updated successfully");
      setIsEditing(false);
      setPetition(updatedPetition);
      if (onPetitionUpdated) {
        onPetitionUpdated(updatedPetition);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update petition");
    } finally {
      setIsLoadingSign(false);
    }
  };

  const handleAdminAction = async (
    action: "addUpdate" | "addResponse" | "editUpdate" | "editResponse",
  ) => {
    if (!petition) return;
    setIsLoadingSign(true);
    try {
      if (action === "addUpdate") {
        const newUpdate = await addUpdate(petition.id, updateContent);
        toast.success("Update added successfully");
        setIsAddingUpdate(false);

        const updatedPetition = {
          ...petition,
          updates: [newUpdate, ...petition.updates],
        };
        setPetition(updatedPetition);
        if (onPetitionUpdated) onPetitionUpdated(updatedPetition);
      } else if (action === "addResponse") {
        const newResponse = await addResponse(petition.id, responseContent);
        toast.success("Response added successfully");
        setIsAddingResponse(false);

        const updatedPetition = {
          ...petition,
          hasResponse: true,
          response: newResponse,
        };
        setPetition(updatedPetition);
        if (onPetitionUpdated) onPetitionUpdated(updatedPetition);
      } else if (action === "editUpdate" && editingUpdateId) {
        const updatedUpdate = await editUpdate(editingUpdateId, updateContent);
        toast.success("Update edited successfully");
        setEditingUpdateId(null);

        const updatedPetition = {
          ...petition,
          updates: petition.updates.map((u) =>
            u.id === editingUpdateId ? updatedUpdate : u,
          ),
        };
        setPetition(updatedPetition);
        if (onPetitionUpdated) onPetitionUpdated(updatedPetition);
      } else if (action === "editResponse" && editingResponseId) {
        const updatedResponse = await editResponse(
          editingResponseId,
          responseContent,
        );
        toast.success("Response edited successfully");
        setEditingResponseId(null);

        const updatedPetition = {
          ...petition,
          response: updatedResponse,
        };
        setPetition(updatedPetition);
        if (onPetitionUpdated) onPetitionUpdated(updatedPetition);
      }

      setUpdateContent("");
      setResponseContent("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to perform action");
    } finally {
      setIsLoadingSign(false);
    }
  };

  const handleAddUpdate = () => handleAdminAction("addUpdate");
  const handleAddResponse = () => handleAdminAction("addResponse");
  // const canManage = isAdmin && petition?.status !== PetitionStatus.New;

  const handleSign = async () => {
    if (!petition || !user) return;
    setIsLoadingSign(true);
    try {
      if (isSigned) {
        await unsignPetition(petition.id);
        setIsSigned(false);
        toast.success("Petition unsigned successfully");
      } else {
        await signPetition(petition.id);
        setIsSigned(true);
        toast.success("Petition signed successfully");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update signature status",
      );
    } finally {
      setIsLoadingSign(false);
    }
  };

  const handlePublish = async () => {
    if (!petition || !user) return;
    setIsLoadingSign(true);
    try {
      await publishPetition(petition.id);
      toast.success("Petition submitted for review");
      setPetition({ ...petition, status: PetitionStatus.NeedsReview });
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to publish petition",
      );
    } finally {
      setIsLoadingSign(false);
    }
  };

  const handleApprove = async () => {
    if (!petition) return;
    setIsLoadingSign(true);
    try {
      await approvePetition(petition.id);
      toast.success("Petition approved and published");
      setPetition({ ...petition, status: PetitionStatus.Published });
    } catch (error) {
      console.error(error);
      toast.error("Failed to approve petition");
    } finally {
      setIsLoadingSign(false);
    }
  };

  const handleReturn = async () => {
    if (!petition) return;
    setIsLoadingSign(true);
    try {
      await returnPetition(petition.id);
      toast.success("Petition returned for changes");
      setPetition({ ...petition, status: PetitionStatus.Returned });
      setIsReturnDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to return petition");
    } finally {
      setIsLoadingSign(false);
    }
  };

  const handleReject = async () => {
    if (!petition) return;
    setIsLoadingSign(true);
    try {
      await rejectPetition(petition.id);
      toast.success("Petition rejected");
      setPetition({ ...petition, status: PetitionStatus.Removed });
      setIsRejectDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to reject petition");
    } finally {
      setIsLoadingSign(false);
    }
  };

  const handleUnpublish = async () => {
    if (!petition) return;
    setIsLoadingSign(true);
    try {
      await unpublishPetition(petition.id);
      toast.success("Petition unpublished (removed)");
      setPetition({ ...petition, status: PetitionStatus.Removed });
    } catch (error) {
      console.error(error);
      toast.error("Failed to unpublish petition");
    } finally {
      setIsLoadingSign(false);
    }
  };

  if (!petition) return null;

  const TARGET_SIGNATURES = petition.targetSignatures || PETITION_THRESHOLD;

  const progressPercentage = Math.min(
    (petition.signatures / TARGET_SIGNATURES) * 100,
    100,
  );
  const statusInfo = getStatusInfo(petition.status);

  const getProgressBarColor = () => {
    if (petition.signatures >= TARGET_SIGNATURES) {
      return "bg-green-500";
    }
    return "bg-orange-500";
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const renderDescription = () => (
    <section
      id="description"
      className="space-y-2 scroll-mt-4"
      aria-labelledby="description-heading"
    >
      <h2 id="description-heading" className="sr-only">
        Description
      </h2>
      <div
        className="text-foreground text-base leading-relaxed prose prose-base max-w-none dark:prose-invert [&_h1]:!text-foreground [&_h2]:!text-foreground [&_h3]:!text-foreground [&_p]:!text-foreground [&_strong]:!text-foreground [&_li]:!text-foreground py-8"
        dangerouslySetInnerHTML={{ __html: petition.description }}
      />
    </section>
  );

  const renderUpdates = () => {
    const hasUpdates = petition.updates && petition.updates.length > 0;
    const canAddUpdate = checkPerm(PERMISSIONS.ADD_UPDATE);
    if (!canAddUpdate && !hasUpdates) return null;

    return (
      <section className="space-y-4 mb-12" aria-labelledby="updates-heading">
        <div className="flex items-center justify-between">
          <h2 id="updates-heading" className="text-xl font-semibold">
            Updates
          </h2>
          {canAddUpdate && (
            <Button
              onClick={() => setIsAddingUpdate(true)}
              variant="outline"
              size="sm"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Update
            </Button>
          )}
        </div>

        {isAddingUpdate && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">New Update</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background dark:bg-popover rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-[#F76902] focus-within:ring-offset-2 focus-within:ring-offset-background">
                <ReactQuill
                  theme="snow"
                  value={updateContent}
                  onChange={setUpdateContent}
                  modules={modules}
                  formats={formats}
                  className="petition-editor min-h-[200px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsAddingUpdate(false);
                    setUpdateContent("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddUpdate}
                  disabled={isLoadingSign || !updateContent.trim()}
                >
                  {isLoadingSign && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Post Update
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {petition.updates && petition.updates.length > 0 ? (
          <ol className="relative space-y-6 list-none m-0 p-0">
            {petition.updates.map((update) => (
              <li key={update.id} className="relative">
                {update.author ? (
                  <p className="text-xs text-muted-foreground">
                    From {update.author}
                  </p>
                ) : null}
                <article className="md:flex justify-start md:gap-x-24 items-start py-2 md:py-6">
                  <div className="border-t py-2 md:w-24 md:shrink-0">
                    <h3 className="text-xs font-mono text-muted-foreground uppercase">
                      Update
                    </h3>
                    <time
                      className="text-xs text-muted-foreground font-mono"
                      dateTime={update.created_at}
                    >
                      {new Date(update.created_at).toLocaleDateString("en-GB")}
                    </time>
                  </div>

                  <div
                    className="text-base prose prose prose-base max-w-none dark:prose-invert md:mt-0 mt-3"
                    dangerouslySetInnerHTML={{ __html: update.description }}
                  />
                </article>
              </li>
            ))}
          </ol>
        ) : (
          !isAddingUpdate && (
            <p className="text-sm text-muted-foreground">
              There are no updates yet.
            </p>
          )
        )}
      </section>
    );
  };

  const renderResponse = () => {
    const hasResponse = !!petition.response;
    const canAdd = checkPerm(PERMISSIONS.RESPONSE);
    const canEdit = checkPerm(PERMISSIONS.EDIT_RESPONSE);

    if (!hasResponse && !canAdd) return null;

    const showButton =
      !isAddingResponse &&
      ((!hasResponse && canAdd) || (hasResponse && canEdit));

    return (
      <section
        id="response"
        className="space-y-2 scroll-mt-4 mb-12"
        aria-labelledby="response-heading"
      >
        <div className="flex items-center justify-between">
          <h2 id="response-heading" className="text-lg font-semibold mb-4">
            Official Response
          </h2>
          {showButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddingResponse(true);
                if (hasResponse) {
                  setEditingResponseId(petition.response!.id);
                  setResponseContent(petition.response!.description);
                } else {
                  setResponseContent("");
                }
              }}
            >
              <PenToolIcon className="h-4 w-4 mr-2" />
              {hasResponse ? "Edit Response" : "Add Response"}
            </Button>
          )}
        </div>

        {isAddingResponse ? (
          <Card className="border-dashed border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="text-base">
                {editingResponseId ? "Edit Response" : "New Response"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background dark:bg-popover rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-[#F76902] focus-within:ring-offset-2 focus-within:ring-offset-background">
                <ReactQuill
                  theme="snow"
                  value={responseContent}
                  onChange={setResponseContent}
                  modules={modules}
                  formats={formats}
                  className="petition-editor min-h-[200px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsAddingResponse(false);
                    setEditingResponseId(null);
                    setResponseContent("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    editingResponseId
                      ? handleAdminAction("editResponse")
                      : handleAddResponse()
                  }
                  disabled={isLoadingSign || !responseContent.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoadingSign && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Post Response
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : petition.response ? (
          <article>
            <p className="text-xs text-green-700 dark:text-green-400">
              From {petition.response.author}
            </p>
            <div className="md:flex justify-start md:gap-x-24 items-start py-2 md:py-6">
              <header className="border-t py-2 md:w-24 md:shrink-0">
                <h3 className="text-xs font-mono uppercase text-green-700 dark:text-green-400">
                  Response
                </h3>
                <time
                  className="text-xs text-muted-foreground font-mono"
                  dateTime={petition.response.created_at}
                >
                  {new Date(petition.response.created_at).toLocaleDateString(
                    "en-GB",
                  )}
                </time>
              </header>

              <div
                className="text-base prose prose-base max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: petition.response.description,
                }}
              />
            </div>
          </article>
        ) : null}
      </section>
    );
  };

  const renderPetitionBody = () => {
    if (isEditing) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Edit Petition</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
          <PetitionForm
            form={form}
            onSubmit={handleUpdate}
            isSubmitting={isLoadingSign}
            submitLabel="Save Changes"
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {renderDescription()}
        {renderUpdates()}
        {renderResponse()}
      </div>
    );
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/petitions/${petition.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/petitions/${petition.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: petition.title,
          text: `Vote for ${petition.title} on PawPrints`,
          url,
        });
      } catch (error) {
        console.error("Error sharing", error);
      }
    } else {
      handleCopyLink();
    }
  };

  const PetitionSidebar = ({ mobile = false }: { mobile?: boolean }) => {
    const content = (
      <div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Status
            </h4>
            <div className="flex items-center gap-1">
              {mobile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="h-3 w-3" />
                  Share
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs gap-2"
                onClick={handleCopyLink}
                title="Copy Link"
              >
                <LinkIcon className="h-3 w-3" />
                Copy link
              </Button>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${statusInfo.badge} text-base px-3 py-1`}
          >
            {statusInfo.text}
          </Badge>
        </div>

        {petition.tier > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 mt-4">
              Tier
            </h4>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {PETITION_TIERS.find((t) => t.id === petition.tier)?.name ||
                `Tier ${petition.tier}`}
            </Badge>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 mt-4">
            Signatures
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-bold">{petition.signatures}</span>
              <span className="text-muted-foreground">
                of {TARGET_SIGNATURES} needed
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {!mobile && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 mt-4">
              Timeline
            </h4>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-1 px-0 text-sm font-normal hover:bg-transparent hover:underline"
                onClick={() => scrollToSection("description")}
              >
                <div className="flex items-center gap-2">
                  <PenToolIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Original Petition</span>
                </div>
                <span className="text-xs uppercase text-muted-foreground font-mono">
                  {new Date(petition.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </Button>

              {petition.response && (
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto py-1 px-0 text-sm font-normal text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-transparent hover:underline"
                  onClick={() => scrollToSection("response")}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="h-4 w-4" />
                    <span>Official Response</span>
                  </div>
                  <span className="text-xs uppercase text-green-600/80 dark:text-green-400/80 font-mono">
                    {new Date(petition.response.created_at).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </span>
                </Button>
              )}

              {petition.updates &&
                petition.updates.map((update) => (
                  <Button
                    key={update.id}
                    variant="ghost"
                    className="w-full justify-between h-auto py-1 px-0 text-sm font-normal text-foreground hover:text-foreground hover:bg-transparent hover:underline"
                    onClick={() => scrollToSection("updates")}
                  >
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Update</span>
                    </div>
                    <span className="text-xs uppercase text-muted-foreground font-mono">
                      {new Date(update.created_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </span>
                  </Button>
                ))}
            </div>
          </div>
        )}

        <Separator className={`mt-4 ${mobile ? "hidden" : ""}`} />

        <dl
          className={`text-sm mt-4 ${mobile ? "grid grid-cols-2 gap-4" : "space-y-4"}`}
        >
          <div>
            <dt className="text-xs font-mono uppercase text-muted-foreground mb-1">
              Author
            </dt>
            <dd className="font-medium">{petition.author}</dd>
          </div>
          <div>
            <dt className="text-xs font-mono uppercase text-muted-foreground mb-1">
              Created
            </dt>
            <dd>
              {new Date(petition.created_at).toLocaleDateString(undefined, {
                weekday: mobile ? "short" : "long",
                year: "numeric",
                month: mobile ? "short" : "long",
                day: "numeric",
              })}
            </dd>
          </div>
          <div className={mobile ? "col-span-2" : ""}>
            <dt className="text-xs font-mono uppercase text-muted-foreground mb-1">
              Expires
            </dt>
            <dd>
              {new Date(petition.expires).toLocaleDateString(undefined, {
                weekday: mobile ? "short" : "long",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </dd>
          </div>
        </dl>

        <div className={`mt-auto ${mobile ? "pt-4" : "pt-6"}`}>
          {isAdmin && petition.status === PetitionStatus.NeedsReview ? (
            <div className="space-y-2">
              <ButtonGroup className="">
                {checkPerm(PERMISSIONS.APPROVE) && (
                  <Button
                    onClick={handleApprove}
                    className=""
                    disabled={isLoadingSign}
                    variant="outline"
                  >
                    {isLoadingSign ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2Icon className="mr-2 h-4 w-4" />
                    )}
                    Approve & Publish
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>
                      <>Petition Actions</>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {checkPerm(PERMISSIONS.RETURN) && (
                      <DropdownMenuItem
                        disabled={isLoadingSign}
                        onSelect={() => setIsReturnDialogOpen(true)}
                      >
                        <>
                          <PenToolIcon />
                          Return for Changes
                        </>
                      </DropdownMenuItem>
                    )}
                    {checkPerm(PERMISSIONS.REJECT) && (
                      <DropdownMenuItem
                        disabled={isLoadingSign}
                        onSelect={() => setIsRejectDialogOpen(true)}
                        variant="destructive"
                      >
                        <>
                          <X />
                          Reject
                        </>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </div>
          ) : petition.response || new Date(petition.expires) < new Date() ? (
            <Button disabled className="w-full">
              {petition.response
                ? "Signing Closed (Responded)"
                : "Signing Closed (Expired)"}
            </Button>
          ) : (
            <div>
              {!user ? (
                <Button disabled variant="secondary" className="w-full">
                  Login to Sign
                </Button>
              ) : (
                <div className="space-y-4">
                  {(isAuthor || isAdmin) && (
                    <div className="space-y-2">
                      {petition.status === PetitionStatus.New && (
                        <div>
                          <Button
                            onClick={handlePublish}
                            disabled={isLoadingSign || isEditing}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isLoadingSign && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Submit for Review
                          </Button>
                          {!isEditing && (
                            <Button
                              onClick={() => setIsEditing(true)}
                              disabled={isLoadingSign}
                              variant="outline"
                              className="w-full mt-2"
                            >
                              Edit Petition
                            </Button>
                          )}
                        </div>
                      )}

                      {petition.status === PetitionStatus.NeedsReview && (
                        <div>
                          <Button
                            disabled
                            variant="secondary"
                            className="w-full bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          >
                            Under Review
                          </Button>
                          {isAdmin && !isEditing && (
                            <Button
                              onClick={() => setIsEditing(true)}
                              disabled={isLoadingSign}
                              variant="outline"
                              className="w-full mt-2"
                            >
                              Edit Petition (Admin)
                            </Button>
                          )}
                        </div>
                      )}

                      {petition.status === PetitionStatus.Published && (
                        <div>
                          <Button
                            disabled
                            variant="secondary"
                            className="w-full bg-green-100 text-green-800 hover:bg-green-100"
                          >
                            Published
                          </Button>
                          {isAdmin && !isEditing && (
                            <Button
                              onClick={() => setIsEditing(true)}
                              disabled={isLoadingSign}
                              variant="outline"
                              className="w-full mt-2"
                            >
                              Edit Petition (Admin)
                            </Button>
                          )}
                          {checkPerm(PERMISSIONS.UNPUBLISH) && (
                            <Button
                              onClick={handleUnpublish}
                              disabled={isLoadingSign}
                              variant="destructive"
                              className="w-full mt-2"
                            >
                              Unpublish (Remove)
                            </Button>
                          )}
                        </div>
                      )}

                      {petition.status === PetitionStatus.Returned && (
                        <div>
                          <Button
                            disabled
                            variant="secondary"
                            className="w-full bg-red-100 text-red-800 hover:bg-red-100 mb-2"
                          >
                            Returned for Changes
                          </Button>
                          <Button
                            onClick={handlePublish}
                            disabled={isLoadingSign || isEditing}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isLoadingSign && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Resubmit for Review
                          </Button>
                          {!isEditing && (
                            <Button
                              onClick={() => setIsEditing(true)}
                              disabled={isLoadingSign}
                              variant="outline"
                              className="w-full mt-2"
                            >
                              Edit Petition
                            </Button>
                          )}
                        </div>
                      )}

                      {petition.status === PetitionStatus.Removed && (
                        <Button
                          disabled
                          variant="destructive"
                          className="w-full"
                        >
                          Removed
                        </Button>
                      )}
                    </div>
                  )}

                  {!isAuthor && (
                    <Button
                      onClick={handleSign}
                      disabled={isLoadingSign}
                      variant={isSigned ? "destructive" : "default"}
                      className="w-full"
                    >
                      {isLoadingSign && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isSigned ? "Unsign Petition" : "Sign Petition"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );

    if (mobile) {
      return <div className="flex flex-col gap-4 w-full">{content}</div>;
    }

    return (
      <div className="lg:w-80 lg:border-l lg:bg-muted/10 h-full">
        <div className="flex flex-col gap-4 p-4 lg:sticky lg:top-4">
          {content}
        </div>

        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Petition</DialogTitle>
              <DialogDescription>
                Are you sure you want to reject "{petition.title}"? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <label
                htmlFor="reason"
                className="text-sm font-medium mb-2 block"
              >
                Reason for rejection (optional)
              </label>
              <Textarea
                id="reason"
                placeholder="Please explain why this petition is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRejectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isLoadingSign}
              >
                {isLoadingSign && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Reject Petition
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return for Changes</DialogTitle>
              <DialogDescription>
                Return "{petition.title}" to the author for changes? They will
                be notified.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsReturnDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReturn}
                disabled={isLoadingSign}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isLoadingSign && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Return Petition
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  if (!petition) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto">
        <div className="flex flex-col lg:flex-row lg:justify-center lg:gap-4 min-h-screen">
          <div className="flex-1 p-6 lg:p-8 lg:pr-12 max-w-5xl">
            <Button
              variant="link"
              className="!px-0 mb-4 text-muted-foreground hover:text-foreground"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {new Date(petition.expires) < new Date() &&
            petition.status === PetitionStatus.Published ? (
              <Alert
                variant="destructive"
                className="w-full font-bold mb-6 px-0 rounded-none border-0 border-b"
              >
                <AlertDescription className="text-xs md:text-base">
                  This petition has expired and is no longer accepting
                  signatures.
                </AlertDescription>
              </Alert>
            ) : null}

            {!isEditing && (
              <div className="mb-8 border-b pb-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {petition.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-base"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                  {petition.title}
                </h1>
                <p className="text-muted-foreground text-lg">
                  By {petition.author}
                </p>
              </div>
            )}

            <div className="lg:hidden mb-8">
              <PetitionSidebar mobile />
            </div>

            {renderPetitionBody()}
          </div>

          <div className="hidden lg:block shrink-0">
            <PetitionSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetitionPageClient;
